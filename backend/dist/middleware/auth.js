import { getDb, dbHelpers } from '../db/index.js';
import { sessions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { getConfig } from '../config/index.js';
import { resolvePermissions } from '../types/index.js';
export async function authMiddleware(request, reply) {
    let token;
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }
    if (!token) {
        token = request.cookies.token;
    }
    // JWT from URL query is deliberately NOT accepted — it leaks tokens into logs & referrers.
    if (!token) {
        reply.clearCookie('token', { path: '/' });
        const error = new Error('Authentication required');
        error.statusCode = 401;
        throw error;
    }
    try {
        const decoded = request.server.jwt.verify(token);
        const user = dbHelpers.getUserById(decoded.userId);
        if (!user) {
            reply.clearCookie('token', { path: '/' });
            const error = new Error('User not found');
            error.statusCode = 401;
            throw error;
        }
        if (!decoded.sessionId) {
            reply.clearCookie('token', { path: '/' });
            const error = new Error('Session expired. Please log in again.');
            error.statusCode = 401;
            throw error;
        }
        const d = getDb();
        const activeSession = d.select({ token: sessions.token }).from(sessions)
            .where(eq(sessions.token, decoded.sessionId))
            .get();
        if (!activeSession) {
            reply.clearCookie('token', { path: '/' });
            const error = new Error('Session expired. Please log in again.');
            error.statusCode = 401;
            throw error;
        }
        const permissions = resolvePermissions(user.role, user.permissions);
        request.user = {
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            permissions,
        };
    }
    catch (err) {
        reply.clearCookie('token', { path: '/' });
        if (err.statusCode) {
            throw err;
        }
        const error = new Error('Invalid token');
        error.statusCode = 401;
        throw error;
    }
}
export function requirePermission(permission) {
    return async (request, reply) => {
        const user = request.user;
        if (!user) {
            const error = new Error('Authentication required');
            error.statusCode = 401;
            throw error;
        }
        if (!user.permissions || !user.permissions.includes(permission)) {
            const error = new Error('Insufficient permissions');
            error.statusCode = 403;
            throw error;
        }
    };
}
export function hasPermission(user, permission) {
    if (!user?.permissions)
        return false;
    return user.permissions.includes(permission);
}
/** Extract authenticated user from request (set by authMiddleware). */
export function getRequestUser(request) {
    return request.user;
}
export function verifyJwtToken(token, jwtVerify) {
    try {
        const decoded = jwtVerify(token);
        const dbUser = dbHelpers.getUserById(decoded.userId);
        if (!dbUser)
            return null;
        // Verify session still exists in DB after logout
        if (decoded.sessionId) {
            const d = getDb();
            const activeSession = d.select({ token: sessions.token }).from(sessions)
                .where(eq(sessions.token, decoded.sessionId))
                .get();
            if (!activeSession)
                return null;
        }
        const permissions = resolvePermissions(dbUser.role, dbUser.permissions);
        return {
            userId: dbUser.id,
            username: dbUser.username,
            email: dbUser.email,
            role: dbUser.role,
            permissions,
        };
    }
    catch {
        return null;
    }
}
let sessionCleanupTimer = null;
export function startSessionCleanup() {
    if (sessionCleanupTimer)
        return;
    const config = getConfig();
    sessionCleanupTimer = setInterval(() => {
        try {
            dbHelpers.cleanExpiredSessions();
            dbHelpers.cleanLoginAttempts(config.security.loginLockout);
        }
        catch { /* ignore */ }
    }, 60000);
}
export function stopSessionCleanup() {
    if (sessionCleanupTimer) {
        clearInterval(sessionCleanupTimer);
        sessionCleanupTimer = null;
    }
}
//# sourceMappingURL=auth.js.map