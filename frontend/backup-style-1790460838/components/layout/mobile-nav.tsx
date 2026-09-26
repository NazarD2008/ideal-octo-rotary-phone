import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { getNavItems } from '@/config/navigation';
import { LogOut, X, ShieldCheck, Shield, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/locales/i18n';

import type { UserRole } from '@/types';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileNav({ open, onClose }: MobileNavProps) {
  const { user, logout, hasPermission } = useAuthStore();
  const navigate = useNavigate();
  const role = user?.role || ('user' as UserRole);
  const navItems = getNavItems(hasPermission);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const handleLogout = async () => {
    await logout();
    onClose();
    navigate('/login');
  };

  const handleNavClick = () => {
    onClose();
  };

  const initial = user?.username?.[0]?.toUpperCase() || 'U';
  const RoleIcon = role === 'admin' ? ShieldCheck : Shield;

  const roleLabel = role === 'admin'
    ? (t('roles.admin') || 'Администратор')
    : (t('roles.user') || 'Пользователь');

  return (
    <div className="fixed inset-0 z-50">
      {/* Полупрозрачный фон */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        role="button"
        aria-label="Close menu"
      />

      {/* Боковая навигация */}
      <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-card border-r border-border shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-border shrink-0 bg-gradient-to-r from-card to-background/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-bold shadow-md">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">
                {t('app.title') || 'Панель управления'}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.username || t('common.user') || 'Пользователь'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-all p-2 rounded-lg hover:bg-surface/80 active:scale-95"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Навигационное меню */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          <p className="px-3 mb-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('navigation.menu') || 'Главное меню'}
          </p>

          <div className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 group',
                    isActive
                      ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface/80 active:scale-95'
                  )
                }
              >
                <div className="flex items-center gap-3 flex-1">
                  <item.icon className={cn('h-5 w-5 shrink-0 transition-transform group-hover:scale-110')} />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Разделитель */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Информация о пользователе и выход */}
        <div className="p-4 shrink-0 space-y-3">
          {/* Роль пользователя */}
          <div className="rounded-lg bg-surface/50 border border-border/50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <RoleIcon
                className={cn(
                  'h-4 w-4',
                  role === 'admin' ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <span className={cn('text-xs font-medium', role === 'admin' ? 'text-primary' : 'text-muted-foreground')}>
                {roleLabel}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {role === 'admin'
                ? t('roles.adminDescription') || 'Полный доступ'
                : t('roles.userDescription') || 'Ограниченный доступ'}
            </p>
          </div>

          {/* Кнопка выхода */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive font-medium text-sm transition-all duration-200 active:scale-95"
          >
            <LogOut className="h-4 w-4" />
            {t('auth.logout') || 'Выйти'}
          </button>

          {/* Версия приложения */}
          <p className="text-center text-xs text-muted-foreground pt-2 border-t border-border/50">
            v1.0.0 • {new Date().getFullYear()} © {t('app.title') || 'My App'}
          </p>
        </div>
      </div>
    </div>
  );
}