import type { FastifyRequest, FastifyReply } from 'fastify';
import { getDb, dbHelpers } from '../db/index.js';
import { sessions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { getConfig } from '../config/index.js';
import { resolvePermissions } from '../types/index.js';
import type { JwtPayload, UserRole, Permission } from '../types/index.js';

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  let token: string | undefined;

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
    const error = new Error('Authentication required') as any;
    error.statusCode = 401;
    throw error;
  }

  try {
    const decoded = request.server.jwt.verify(token) as JwtPayload;

    const user = dbHelpers.getUserById(decoded.userId);
    if (!user) {
      reply.clearCookie('token', { path: '/' });
      const error = new Error('User not found') as any;
      error.statusCode = 401;
      throw error;
    }

    if (!decoded.sessionId) {
      reply.clearCookie('token', { path: '/' });
      const error = new Error('Session expired. Please log in again.') as any;
      error.statusCode = 401;
      throw error;
    }

    const d = getDb();
    const activeSession = d.select({ token: sessions.token }).from(sessions)
      .where(eq(sessions.token, decoded.sessionId))
      .get();
    if (!activeSession) {
      reply.clearCookie('token', { path: '/' });
      const error = new Error('Session expired. Please log in again.') as any;
      error.statusCode = 401;
      throw error;
    }

    const permissions = resolvePermissions(user.role as UserRole, user.permissions);

    request.user = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role as UserRole,
      permissions,
    };
  } catch (err: any) {
    reply.clearCookie('token', { path: '/' });
    if (err.statusCode) {
      throw err;
    }
    const error = new Error('Invalid token') as any;
    error.statusCode = 401;
    throw error;
  }
}

export function requirePermission(permission: Permission) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user as JwtPayload | undefined;
    if (!user) {
      const error = new Error('Authentication required') as any;
      error.statusCode = 401;
      throw error;
    }
    if (!user.permissions || !user.permissions.includes(permission)) {
      const error = new Error('Insufficient permissions') as any;
      error.statusCode = 403;
      throw error;
    }
  };
}

export function hasPermission(user: JwtPayload | undefined, permission: Permission): boolean {
  if (!user?.permissions) return false;
  return user.permissions.includes(permission);
}

/** Extract authenticated user from request (set by authMiddleware). */
export function getRequestUser(request: FastifyRequest): JwtPayload {
  return request.user as JwtPayload;
}

export function verifyJwtToken(token: string, jwtVerify: (token: string) => JwtPayload): JwtPayload | null {
  try {
    const decoded = jwtVerify(token);
    const dbUser = dbHelpers.getUserById(decoded.userId);
    if (!dbUser) return null;

    // Verify session still exists in DB after logout
    if (decoded.sessionId) {
      const d = getDb();
      const activeSession = d.select({ token: sessions.token }).from(sessions)
        .where(eq(sessions.token, decoded.sessionId))
        .get();
      if (!activeSession) return null;
    }

    const permissions = resolvePermissions(dbUser.role as UserRole, dbUser.permissions);
    return {
      userId: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.role as UserRole,
      permissions,
    };
  } catch {
    return null;
  }
}

let sessionCleanupTimer: NodeJS.Timeout | null = null;

export function startSessionCleanup(): void {
  if (sessionCleanupTimer) return;
  const config = getConfig();
  sessionCleanupTimer = setInterval(() => {
    try {
      dbHelpers.cleanExpiredSessions();
      dbHelpers.cleanLoginAttempts(config.security.loginLockout);
    } catch { /* ignore */ }
  }, 60000);
}

export function stopSessionCleanup(): void {
  if (sessionCleanupTimer) {
    clearInterval(sessionCleanupTimer);
    sessionCleanupTimer = null;
  }
}
