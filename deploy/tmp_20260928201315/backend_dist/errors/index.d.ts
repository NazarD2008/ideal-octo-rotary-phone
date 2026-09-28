/** Base error class for application errors */
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    constructor(message: string, statusCode?: number, isOperational?: boolean);
}
/** Authentication-related errors */
export declare class AuthError extends AppError {
    constructor(message?: string, statusCode?: number);
}
/** Authorization/permission errors */
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
/** Resource not found errors */
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
/** Validation errors for user input */
export declare class ValidationError extends AppError {
    constructor(message?: string);
}
/** Device authentication errors */
export declare class DeviceAuthError extends AppError {
    constructor(message?: string);
}
/** Rate limit exceeded errors */
export declare class RateLimitError extends AppError {
    constructor(message?: string);
}
/** Socket/connection errors */
export declare class SocketError extends AppError {
    constructor(message?: string);
}
/** File operation errors */
export declare class FileError extends AppError {
    constructor(message?: string, statusCode?: number);
}
/** Build process errors */
export declare class BuildError extends AppError {
    constructor(message?: string);
}
//# sourceMappingURL=index.d.ts.map