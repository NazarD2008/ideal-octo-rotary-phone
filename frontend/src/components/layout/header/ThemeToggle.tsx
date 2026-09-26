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
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const cycleTheme = () => {
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
    setTheme(next);
  };

  const Icon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div ref={ref} className="relative">
      <button
        aria-label={t('common.toggleTheme') || 'Toggle theme'}
        title={t('common.toggleTheme') || 'Toggle theme'}
        onClick={() => setOpen(v => !v)}
        className="icon-btn"
      >
        <Icon className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[180px] rounded-lg border border-border bg-card shadow-lg overflow-hidden z-50">
          <button
            onClick={() => { setTheme('light'); setOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm ${theme === 'light' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-surface'}`}
          >
            <Sun className="h-4 w-4" />
            <span className="flex-1 text-left">{t('theme.light') || 'Светлая'}</span>
            {theme === 'light' && <Check className="h-4 w-4" />}
          </button>
          <button
            onClick={() => { setTheme('dark'); setOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm ${theme === 'dark' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-surface'}`}
          >
            <Moon className="h-4 w-4" />
            <span className="flex-1 text-left">{t('theme.dark') || 'Тёмная'}</span>
            {theme === 'dark' && <Check className="h-4 w-4" />}
          </button>
          <button
            onClick={() => { setTheme('system'); setOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm ${theme === 'system' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-surface'}`}
          >
            <Monitor className="h-4 w-4" />
            <span className="flex-1 text-left">{t('theme.system') || 'Система'}</span>
            {theme === 'system' && <Check className="h-4 w-4" />}
          </button>
        </div>
      )}
    </div>
  );
}
