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

function escapeRegExp(s: string): string {
  // escape characters that have special meaning in RegExp
  return s.replace(/[.*+?^${}()|[\]\]/g, '\$&');
}

export function t(key: string, params?: Record<string, string | number>): string {
  let translation = flatTranslations[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      const safeKey = escapeRegExp(String(k));
      const re = new RegExp('\{' + safeKey + '\}', 'g');
      translation = translation.replace(re, String(v));
    }
  }
  return translation;
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

export type LocaleKey = keyof typeof ru;
export type TranslationValue = string | { [key: string]: TranslationValue };
