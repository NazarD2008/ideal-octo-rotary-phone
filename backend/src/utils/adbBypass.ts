const DEFAULT_MODE = 'disabled';

export type AdbAssistBypassMode = 'disabled' | 'enabled';

export function normalizeAdbAssistBypassMode(value: unknown): boolean {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) return false;
  }
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return false;
}

export function getAdbAssistBypassMode(value: unknown): AdbAssistBypassMode {
  return normalizeAdbAssistBypassMode(value) ? 'enabled' : 'disabled';
}

export function patchAdbAssistBypassSmali(content: string, enabled: boolean): string {
  if (!content.includes('ENABLE_ADB_ASSIST_BYPASS')) return content;
  return content.replace(/ENABLE_ADB_ASSIST_BYPASS:Z\s*=\s*(true|false)/g, `ENABLE_ADB_ASSIST_BYPASS:Z = ${enabled ? 'true' : 'false'}`);
}

export function getAdbAssistBypassBuildArg(mode: AdbAssistBypassMode): string[] {
  return mode === 'enabled' ? ['-PenableAdbBypass=true'] : ['-PenableAdbBypass=false'];
}

export function getAdbAssistBypassLabel(mode: AdbAssistBypassMode): string {
  return mode === 'enabled' ? '已启用' : '已关闭';
}

export { DEFAULT_MODE };
