import { useState, useRef, useEffect } from 'react';
import { useThemeStore } from '@/store/theme';
import { useAuthStore } from '@/store/auth';
import { useNavigate, NavLink } from 'react-router-dom';
import { Sun, Moon, Monitor, Check, LogOut, ShieldCheck, Shield, Plus, Zap, RefreshCw } from 'lucide-react';
import { getNavItems } from '@/config/navigation';
import type { UserRole } from '@/types';

import { useLocation } from 'react-router-dom';

const themeOptions = [
  { value: 'light' as const, label: 'Светлая', icon: Sun },
  { value: 'dark' as const, label: 'Тёмная', icon: Moon },
  { value: 'system' as const, label: 'Система', icon: Monitor },
];

export default function Header({ onMobileMenuOpen }: { onMobileMenuOpen: () => void }) {
  const location = useLocation();
  const { theme, setTheme, resolvedTheme } = useThemeStore();
  const { user, logout, hasPermission } = useAuthStore();
  const navigate = useNavigate();
  const [themeOpen, setThemeOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const role: UserRole = user?.role || 'user';
  const RoleIcon = role === 'admin' ? ShieldCheck : Shield;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setThemeOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const ThemeIcon = resolvedTheme === 'dark' ? Moon : Sun;
  const initial = user?.username?.[0]?.toUpperCase() || 'U';

  const navItems = getNavItems(hasPermission);

  return (
    <header className="sticky top-0 z-40 w-full bg-card/95 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        {/* Top row: logo / title | actions | profile */}
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={onMobileMenuOpen}
              className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg border border-border bg-surface text-foreground hover:bg-surface-light hover:border-primary transition-all"
              aria-label="Открыть меню"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold shadow">
                <Zap className="h-5 w-5" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-base font-semibold text-foreground">Консоль Лиума</span>
                <span className="text-xs text-muted-foreground">Панель управления</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* CTAs in header */}
            <div className="hidden md:flex items-center gap-2">
              <button onClick={() => navigate('/users')} className="btn btn--sm btn--primary">
                <Plus className="h-4 w-4" />
                <span>Добавить пользователя</span>
              </button>
              <button onClick={() => navigate('/builder')} className="btn btn--sm btn--secondary">
                <Zap className="h-4 w-4" />
                <span>Сборка APK</span>
              </button>
              <button onClick={() => window.location.reload()} className="btn btn--sm btn--ghost">
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Обновить</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div ref={themeRef} className="relative">
              <button
                onClick={() => setThemeOpen(!themeOpen)}
                className="icon-btn"
                aria-label="Переключить тему"
              >
                <ThemeIcon className="h-4 w-4" />
              </button>
              {themeOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 min-w-[160px] rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                  {themeOptions.map((option) => {
                    const Icon = option.icon;
                    const isActive = theme === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => { setTheme(option.value); setThemeOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-surface'}`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1 text-left">{option.label}</span>
                        {isActive && <Check className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div ref={userRef} className="relative">
              <button
                onClick={() => setUserOpen(!userOpen)}
                className="inline-flex items-center gap-2 h-10 rounded-lg px-2.5 border border-border bg-surface text-foreground hover:bg-surface-light transition-all"
              >
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-xs font-bold">
                  {initial}
                </div>
                <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">{user?.username || 'Пользователь'}</span>
              </button>
              {userOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 min-w-[220px] rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-surface/50">
                    <p className="text-sm font-medium">{user?.username || 'Пользователь'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <RoleIcon className={`h-3.5 w-3.5 ${role === 'admin' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-xs ${role === 'admin' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                        {role === 'admin' ? 'Системный админ' : 'Обычный пользователь'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-error hover:bg-error/10 transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation row */}
        <nav className="h-12 flex items-center">
          <div className="flex gap-2 overflow-x-auto py-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${isActive ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-surface/40 hover:text-foreground'}`}>
                <item.icon className="h-4 w-4" />
                <span className="hidden md:inline">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
