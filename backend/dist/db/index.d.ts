import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import type { Permission } from '../types/index.js';
export type DB = ReturnType<typeof drizzle<typeof schema>>;
export declare function getDb(): DB;
export declare function getSqliteDb(): Database.Database;
export declare function initDb(): DB;
export declare function closeDb(): void;
export declare const dbHelpers: {
    getOrCreateClientData(clientId: string, dataType: string): string;
    ensureClientDataBatch(clientId: string, dataTypes: string[]): void;
    setClientData(clientId: string, dataType: string, data: string): void;
    addClientFile(clientId: string, fileType: string, originalName: string, mimeType: string, data: Buffer, fileSize: number): void;
    getClientFiles(clientId: string, fileType: string): Array<{
        id: number;
        originalName: string;
        mimeType: string | null;
        fileSize: number | null;
        createdAt: string | null;
    }>;
    addLog(type: string, category: string, message: string, details?: string): void;
    cleanExpiredSessions(): number;
    checkLoginAttempts(ip: string, maxAttempts: number, windowMs: number): boolean;
    recordLoginAttempt(ip: string): void;
    cleanLoginAttempts(olderThanMs: number): number;
    getOrCreateJwtSecret(): string;
    getUserByUsernameOrEmail(identifier: string): typeof schema.users.$inferSelect | undefined;
    getUserById(id: number): typeof schema.users.$inferSelect | undefined;
    getAllUsers(): Array<Omit<typeof schema.users.$inferSelect, "password">>;
    createUser(username: string, email: string, passwordHash: string, role?: "admin" | "user", permissions?: Permission[]): number;
    updateUser(id: number, data: {
        username?: string;
        email?: string;
        role?: "admin" | "user";
        permissions?: string;
    }): boolean;
    updateUserPassword(id: number, passwordHash: string): boolean;
    deleteUser(id: number): boolean;
    getAdminCount(): number;
    getUserPermissions(id: number): Permission[];
};
//# sourceMappingURL=index.d.ts.map