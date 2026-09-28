declare const DEFAULT_MODE = "disabled";
export type AdbAssistBypassMode = 'disabled' | 'enabled';
export declare function normalizeAdbAssistBypassMode(value: unknown): boolean;
export declare function getAdbAssistBypassMode(value: unknown): AdbAssistBypassMode;
export declare function patchAdbAssistBypassSmali(content: string, enabled: boolean): string;
export declare function getAdbAssistBypassBuildArg(mode: AdbAssistBypassMode): string[];
export declare function getAdbAssistBypassLabel(mode: AdbAssistBypassMode): string;
export { DEFAULT_MODE };
//# sourceMappingURL=adbBypass.d.ts.map