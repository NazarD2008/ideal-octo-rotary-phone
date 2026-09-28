/** Base error class for application errors */
export class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
/** Authentication-related errors */
export class AuthError extends AppError {
    constructor(message = 'Authentication failed', statusCode = 401) {
        super(message, statusCode);
    }
}
/** Authorization/permission errors */
export class ForbiddenError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403);
    }
}
/** Resource not found errors */
export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}
/** Validation errors for user input */
export class ValidationError extends AppError {
    constructor(message = 'Validation failed') {
        super(message, 400);
    }
}
/** Device authentication errors */
export class DeviceAuthError extends AppError {
    constructor(message = 'Device authentication failed') {
        super(message, 401);
    }
}
/** Rate limit exceeded errors */
export class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429);
    }
}
/** Socket/connection errors */
export class SocketError extends AppError {
    constructor(message = 'Socket operation failed') {
        super(message, 500);
    }
}
/** File operation errors */
export class FileError extends AppError {
    constructor(message = 'File operation failed', statusCode = 500) {
        super(message, statusCode);
    }
}
/** Build process errors */
export class BuildError extends AppError {
    constructor(message = 'Build process failed') {
        super(message, 500);
    }
}
//# sourceMappingURL=index.js.map