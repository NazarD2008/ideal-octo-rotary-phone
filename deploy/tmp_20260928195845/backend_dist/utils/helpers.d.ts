export declare function getMimeType(fileName: string): string;
export declare function validatePasswordStrength(password: string): {
    valid: boolean;
    message?: string;
};
export declare function validateUsername(username: string): {
    valid: boolean;
    message?: string;
};
export declare function validateEmail(email: string): {
    valid: boolean;
    message?: string;
};
export declare function parseSizeString(str: string | undefined | null): number;
export declare function normalizePermissions(data: unknown): Array<{
    permission: string;
    allowed: boolean;
}>;
export declare function normalizeCalls(data: unknown): unknown[];
export declare function normalizeContacts(data: unknown): unknown[];
export declare function normalizeFileList(data: unknown): unknown[];
export declare function normalizeDeviceInfo(data: unknown): unknown;
//# sourceMappingURL=helpers.d.ts.map