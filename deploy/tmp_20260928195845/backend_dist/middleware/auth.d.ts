import type { FastifyRequest, FastifyReply } from 'fastify';
import type { JwtPayload, Permission } from '../types/index.js';
export declare function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void>;
export declare function requirePermission(permission: Permission): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
export declare function hasPermission(user: JwtPayload | undefined, permission: Permission): boolean;
/** Extract authenticated user from request (set by authMiddleware). */
export declare function getRequestUser(request: FastifyRequest): JwtPayload;
export declare function verifyJwtToken(token: string, jwtVerify: (token: string) => JwtPayload): JwtPayload | null;
export declare function startSessionCleanup(): void;
export declare function stopSessionCleanup(): void;
//# sourceMappingURL=auth.d.ts.map