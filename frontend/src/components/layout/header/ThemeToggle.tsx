import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useThemeStore } from '@/store/theme';
import { t } from '@/locales/i18n';

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useThemeStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const cycleTheme = () => {
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(next);
  };

  const Icon = resolvedTheme === 'dark' ? Moon : Sun;

  const themes = [
    {
      value: 'light',
      label: t('theme.light') || 'Светлая',
      icon: Sun,
      description: 'Светлая тема'
    },
    {
      value: 'dark',
      label: t('theme.dark') || 'Тёмная',
      icon: Moon,
      description: 'Тёмная тема'
    },
    {
      value: 'system',
      label: t('theme.system') || 'Система',
      icon: Monitor,
      description: 'По умолчанию системы'
    },
  ];

  return (
    <div ref={ref} className="relative">
      {/* Основная кнопка */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={t('common.toggleTheme') || 'Toggle theme'}
        title={
          theme === 'system'
            ? (t('theme.system') || 'Система')
            : theme === 'light'
            ? (t('theme.light') || 'Светлая')
            : (t('theme.dark') || 'Тёмная')
        }
        className="relative inline-flex items-center justify-center h-10 w-10 rounded-lg border border-border bg-card/50 hover:bg-card transition-all duration-300 hover:border-primary/50 hover:shadow-md active:scale-95"
      >
        <Icon className="h-5 w-5 text-foreground transition-transform duration-300" />
      </button>

      {/* Выпадающее меню */}
      {open && (
        <div className="absolute right-0 mt-3 w-56 rounded-xl border border-border bg-card shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Заголовок */}
          <div className="px-4 py-3 border-b border-border/50 bg-background/50">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('common.theme') || 'Тема оформления'}
            </p>
          </div>

          {/* Варианты тем */}
          <div className="space-y-1 p-2">
            {themes.map((themeOption) => {
              const ThemeIcon = themeOption.icon;
              const isActive = theme === themeOption.value;

              return (
                <button
                  key={themeOption.value}
                  onClick={() => {
                    setTheme(themeOption.value as any);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-foreground hover:bg-surface hover:text-foreground'
                  }`}
                >
                  <ThemeIcon className={`h-4 w-4 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{themeOption.label}</p>
                    <p className={`text-xs ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {themeOption.description}
                    </p>
                  </div>
                  {isActive && (
                    <Check className="h-4 w-4 flex-shrink-0 animate-in scale-in duration-300" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Подсказка */}
          <div className="px-4 py-2 border-t border-border/50 bg-background/30">
            <p className="text-xs text-muted-foreground text-center">
              💡 Совет: используйте <kbd className="bg-background px-2 py-1 rounded text-xs border border-border">⌘ + K</kbd> для быстрого переключения
            </p>
          </div>
        </div>
      )}
    </div>
  );
}