import { z } from 'zod';
/** Schema for user authentication */
export declare const loginSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
}, {
    username: string;
    password: string;
}>;
/** Schema for user creation/update */
export declare const userSchema: z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
    password: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<["admin", "user"]>>;
    permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    username: string;
    email: string;
    password?: string | undefined;
    role?: "admin" | "user" | undefined;
    permissions?: string[] | undefined;
}, {
    username: string;
    email: string;
    password?: string | undefined;
    role?: "admin" | "user" | undefined;
    permissions?: string[] | undefined;
}>;
/** Schema for device ID validation */
export declare const deviceIdSchema: z.ZodString;
/** Schema for session ID validation */
export declare const sessionIdSchema: z.ZodString;
/** Schema for command payloads */
export declare const commandSchema: z.ZodObject<{
    type: z.ZodString;
    action: z.ZodOptional<z.ZodString>;
    sessionId: z.ZodOptional<z.ZodString>;
    data: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: string;
    action?: string | undefined;
    data?: unknown;
    sessionId?: string | undefined;
}, {
    type: string;
    action?: string | undefined;
    data?: unknown;
    sessionId?: string | undefined;
}>;
/** Schema for file transfer validation */
export declare const fileTransferSchema: z.ZodObject<{
    transferId: z.ZodString;
    name: z.ZodString;
    channel: z.ZodString;
    totalChunks: z.ZodNumber;
    totalSize: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    name: string;
    transferId: string;
    totalChunks: number;
    channel: string;
    totalSize: number;
}, {
    name: string;
    transferId: string;
    totalChunks: number;
    channel: string;
    totalSize: number;
}>;
/** Schema for WebRTC offer validation */
export declare const webrtcOfferSchema: z.ZodObject<{
    sdp: z.ZodString;
    iceServers: z.ZodArray<z.ZodObject<{
        urls: z.ZodString;
        username: z.ZodOptional<z.ZodString>;
        credential: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        urls: string;
        username?: string | undefined;
        credential?: string | undefined;
    }, {
        urls: string;
        username?: string | undefined;
        credential?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    sdp: string;
    iceServers: {
        urls: string;
        username?: string | undefined;
        credential?: string | undefined;
    }[];
}, {
    sdp: string;
    iceServers: {
        urls: string;
        username?: string | undefined;
        credential?: string | undefined;
    }[];
}>;
/** Schema for ICE candidate validation */
export declare const iceCandidateSchema: z.ZodObject<{
    candidate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    candidate: string;
}, {
    candidate: string;
}>;
/** Schema for build request validation */
export declare const buildRequestSchema: z.ZodObject<{
    serverUrl: z.ZodString;
    homePageUrl: z.ZodString;
    appName: z.ZodString;
    icon: z.ZodOptional<z.ZodType<Buffer<ArrayBufferLike>, z.ZodTypeDef, Buffer<ArrayBufferLike>>>;
}, "strip", z.ZodTypeAny, {
    appName: string;
    serverUrl: string;
    homePageUrl: string;
    icon?: Buffer<ArrayBufferLike> | undefined;
}, {
    appName: string;
    serverUrl: string;
    homePageUrl: string;
    icon?: Buffer<ArrayBufferLike> | undefined;
}>;
/** Schema for pagination parameters */
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    sortOrder: "asc" | "desc";
    search?: string | undefined;
    sortBy?: string | undefined;
}, {
    search?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
/** Type exports */
export type LoginInput = z.infer<typeof loginSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type DeviceIdInput = z.infer<typeof deviceIdSchema>;
export type SessionIdInput = z.infer<typeof sessionIdSchema>;
export type CommandInput = z.infer<typeof commandSchema>;
export type FileTransferInput = z.infer<typeof fileTransferSchema>;
export type WebRTCOfferInput = z.infer<typeof webrtcOfferSchema>;
export type IceCandidateInput = z.infer<typeof iceCandidateSchema>;
export type BuildRequestInput = z.infer<typeof buildRequestSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
/** Validation helper */
export declare function validate<T extends z.ZodType>(schema: T, data: unknown): z.infer<T>;
/** Safe validation that returns errors instead of throwing */
export declare function safeValidate<T extends z.ZodType>(schema: T, data: unknown): {
    success: boolean;
    data?: z.infer<T>;
    error?: z.ZodError;
};
//# sourceMappingURL=index.d.ts.map