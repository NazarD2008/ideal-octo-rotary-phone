export declare class DeviceAuthError extends Error {
    readonly statusCode: number;
    constructor(message: string, statusCode: number);
}
export declare function createPendingEnrollment(appName: string): {
    id: string;
    token: string;
    expiresAt: string;
};
export declare function revokeEnrollment(enrollmentId: string): void;
export declare function provisionDevice(bootstrapToken: string, deviceId: string): string;
export declare function authenticateDevice(deviceId: string, deviceSecret: string): boolean;
export declare function rotateDeviceCredential(deviceId: string): string;
export declare function acknowledgeCredentialRotation(deviceId: string): boolean;
export declare function cancelPendingCredentialRotation(deviceId: string): void;
export declare function revokeDeviceCredential(deviceId: string): boolean;
export declare function deleteDeviceCredential(deviceId: string): void;
//# sourceMappingURL=deviceAuth.d.ts.map