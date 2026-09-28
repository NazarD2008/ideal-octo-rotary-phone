import crypto from 'crypto';
import { hashPassword, verifyPassword } from '../db/seed.js';
import { startSessionCleanup, getRequestUser } from '../middleware/auth.js';
import { getDb, dbHelpers } from '../db/index.js';
import { users, sessions } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { getConfig } from '../config/index.js';
import { validateUsername, validatePasswordStrength, validateEmail } from '../utils/helpers.js';
import { resolvePermissions } from '../types/index.js';
export async function authRoutes(app) {
    startSessionCleanup();
    app.post('/api/auth/login', async (request, reply) => {
        const { username, password } = (request.body || {});
        const config = getConfig();
        const ip = request.ip;
        if (!username || !password) {
            return reply.code(400).send({ success: false, error: 'Username/email and password are required' });
        }
        if (dbHelpers.checkLoginAttempts(ip, config.security.loginAttempts, config.security.loginLockout)) {
            dbHelpers.addLog('AUTH', 'SECURITY', `Login locked out for IP: ${ip}`);
            return reply.code(429).send({ success: false, error: 'Too many login attempts. Try again later.' });
        }
        const user = dbHelpers.getUserByUsernameOrEmail(username);
        if (!user || !(await verifyPassword(password, user.password))) {
            dbHelpers.recordLoginAttempt(ip);
            dbHelpers.addLog('AUTH', 'LOGIN', `Failed login attempt for: ${username}`, JSON.stringify({ ip }));
            return reply.code(401).send({ success: false, error: 'Invalid credentials' });
        }
        // Binding key / machine binding logic
        const bindingKeyInput = (request.body || {}).bindingKey;
        const userBindingHash = user.bindingKeyHash;
        const userBindingActive = !!(user.bindingActive) || false;
        const ua = String(request.headers['user-agent'] || '');
        const machineHash = crypto.createHash('sha256').update(`${ua}|${ip}`).digest('hex');
        if (userBindingHash) {
            // If already bound to a machine, require same machine
            if (userBindingActive) {
                if (!user.bindingMachine || user.bindingMachine !== machineHash) {
                    dbHelpers.addLog('AUTH', 'LOGIN', `Failed binding check for user ${user.username}`, JSON.stringify({ ip, ua }));
                    return reply.code(401).send({ success: false, error: 'This account is bound to a different machine' });
                }
            }
            else {
                // Not bound yet: require binding key to activate binding
                if (!bindingKeyInput) {
                    return reply.code(401).send({ success: false, error: 'Binding key required for this account' });
                }
                const bindingKeyHash = crypto.createHash('sha256').update(bindingKeyInput).digest('hex');
                if (bindingKeyHash !== userBindingHash) {
                    dbHelpers.recordLoginAttempt(ip);
                    dbHelpers.addLog('AUTH', 'LOGIN', `Invalid binding key for user ${user.username}`, JSON.stringify({ ip }));
                    return reply.code(401).send({ success: false, error: 'Invalid binding key' });
                }
                // Activate binding to this machine
                dbHelpers.bindUserMachine(user.id, machineHash);
            }
        }
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + config.security.sessionTimeout).toISOString();
        const d = getDb();
        d.insert(sessions).values({
            token: sessionToken,
            userId: user.id,
            ip,
            machineHash,
            expiresAt,
        }).run();
        d.update(users).set({ lastLogin: new Date().toISOString() }).where(eq(users.id, user.id)).run();
        const permissions = resolvePermissions(user.role, user.permissions);
        const jwtPayload = {
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            permissions,
            sessionId: sessionToken,
        };
        const jwtExpiry = Math.floor(config.security.sessionTimeout / 1000) + 's';
        const jwtToken = app.jwt.sign(jwtPayload, { expiresIn: jwtExpiry });
        const isSecure = request.protocol === 'https'
            || request.headers['x-forwarded-proto'] === 'https';
        reply.setCookie('token', jwtToken, {
            path: '/',
            httpOnly: true,
            secure: isSecure,
            maxAge: config.security.sessionTimeout / 1000,
            sameSite: isSecure ? 'strict' : 'lax',
        });
        dbHelpers.addLog('AUTH', 'LOGIN', `User ${user.username} logged in`, JSON.stringify({ ip, role: user.role }));
        return {
            success: true,
            data: {
                id: user.id,
                token: jwtToken,
                username: user.username,
                email: user.email,
                role: user.role,
                permissions,
            },
        };
    });
    app.post('/api/auth/logout', async (request, reply) => {
        let username;
        try {
            const token = request.cookies.token || (request.headers.authorization?.startsWith('Bearer ') ? request.headers.authorization.substring(7) : undefined);
            if (token) {
                const decoded = request.server.jwt.verify(token);
                username = decoded.username;
                const d = getDb();
                if (decoded.sessionId) {
                    d.delete(sessions).where(eq(sessions.token, decoded.sessionId)).run();
                }
                else {
                    d.delete(sessions).where(eq(sessions.userId, decoded.userId)).run();
                }
            }
        }
        catch {
            // Token may be expired/invalid — that's fine for logout
        }
        reply.clearCookie('token', { path: '/' });
        if (username) {
            dbHelpers.addLog('AUTH', 'LOGOUT', `User ${username} logged out`);
        }
        return { success: true };
    });
    app.get('/api/auth/me', {
        preHandler: [app.auth],
    }, async (request, reply) => {
        const user = getRequestUser(request);
        const dbUser = dbHelpers.getUserById(user.userId);
        if (!dbUser) {
            return reply.code(404).send({ success: false, error: 'User not found' });
        }
        const permissions = resolvePermissions(dbUser.role, dbUser.permissions);
        return {
            success: true,
            data: {
                id: dbUser.id,
                username: dbUser.username,
                email: dbUser.email,
                role: dbUser.role,
                permissions,
            },
        };
    });
    app.post('/api/auth/change-password', {
        preHandler: [app.auth],
    }, async (request, reply) => {
        const { currentPassword, newPassword } = (request.body || {});
        const user = getRequestUser(request);
        if (!currentPassword || !newPassword) {
            return reply.code(400).send({ success: false, error: 'Current password and new password are required' });
        }
        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.valid) {
            return reply.code(400).send({ success: false, error: passwordValidation.message });
        }
        const dbUser = dbHelpers.getUserById(user.userId);
        if (!dbUser) {
            return reply.code(404).send({ success: false, error: 'User not found' });
        }
        const isValid = await verifyPassword(currentPassword, dbUser.password);
        if (!isValid) {
            return reply.code(401).send({ success: false, error: 'Current password is incorrect' });
        }
        const hash = await hashPassword(newPassword);
        dbHelpers.updateUserPassword(user.userId, hash);
        dbHelpers.addLog('AUTH', 'PASSWORD', `User ${user.username} changed their password`);
        return { success: true, message: 'Password changed successfully' };
    });
    app.post('/api/auth/update-profile', {
        preHandler: [app.auth],
    }, async (request, reply) => {
        const { username, email } = (request.body || {});
        const user = getRequestUser(request);
        const updates = {};
        if (username !== undefined) {
            const validation = validateUsername(username);
            if (!validation.valid) {
                return reply.code(400).send({ success: false, error: validation.message });
            }
            const d = getDb();
            const existing = d.select({ id: users.id }).from(users).where(sql `LOWER(${users.username}) = ${username.toLowerCase()} AND ${users.id} != ${user.userId}`).get();
            if (existing) {
                return reply.code(409).send({ success: false, error: 'Username already taken' });
            }
            updates.username = username.toLowerCase();
        }
        if (email !== undefined) {
            const validation = validateEmail(email);
            if (!validation.valid) {
                return reply.code(400).send({ success: false, error: validation.message });
            }
            const d = getDb();
            const existing = d.select({ id: users.id }).from(users).where(sql `LOWER(${users.email}) = ${email.toLowerCase()} AND ${users.id} != ${user.userId}`).get();
            if (existing) {
                return reply.code(409).send({ success: false, error: 'Email already taken' });
            }
            updates.email = email.toLowerCase();
        }
        if (Object.keys(updates).length === 0) {
            return reply.code(400).send({ success: false, error: 'No fields to update' });
        }
        dbHelpers.updateUser(user.userId, updates);
        dbHelpers.addLog('AUTH', 'PROFILE', `User ${user.username} updated their profile`, JSON.stringify(updates));
        return { success: true, message: 'Profile updated successfully' };
    });
}
//# sourceMappingURL=auth.js.map