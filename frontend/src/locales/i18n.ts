import ru from './ru';

// Flatten helper
function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key in obj) {
    const val = obj[key];
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'string') result[full] = val;
    else if (typeof val === 'object' && val !== null) Object.assign(result, flattenObject(val as Record<string, any>, full));
  }
  return result;
}

const flatTranslations = flattenObject(ru as Record<string, any>);

export function t(key: string, params?: Record<string, string | number>): string {
  let translation = flatTranslations[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      const token = `{${k}}`;
      // simple, safe replacement avoiding regex parsing
      translation = translation.split(token).join(String(v));
    }
  }
  return translation;
}

export function useTranslation() {
  return { t };
}

export function setLocale(_locale: string) {
  // Only Russian supported in this build; no-op
}

export function getLocale(_locale: string = 'ru') {
  return ru;
}

export function isSupported(locale: string) {
  return locale === 'ru';
}

export function getSupportedLocales(): string[] {
  return ['ru'];
}

// Named exports for convenience (used by src/locales/index.ts)
export const common = (ru as any).common;
export const nav = (ru as any).nav;
export const pages = (ru as any).pages;
export const dashboard = (ru as any).dashboard;
export const settings = (ru as any).settings;
export const users = (ru as any).users;
export const devices = (ru as any).devices;
export const builder = (ru as any).builder;

export default ru;

export type LocaleKey = keyof typeof ru;
export type TranslationValue = string | { [key: string]: TranslationValue };
