import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { getNavItems } from '@/config/navigation';
import { LogOut, ShieldCheck, Shield, ChevronRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

import type { UserRole } from '@/types';

const RoleBadge = ({ role }: { role: UserRole }) => {
  if (role === 'admin') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-primary">Админ</span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border">
      <Shield className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground">Пользователь</span>
    </div>
  );
};

export default function Sidebar() {
  const location = useLocation();
  const { user, logout, hasPermission } = useAuthStore();
  const navigate = useNavigate();
  const role = user?.role || 'user';
  const navItems = getNavItems(hasPermission);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initial = user?.username?.[0]?.toUpperCase() || 'U';

  return (
    <div className="flex flex-col w-72 h-full bg-gradient-to-b from-card to-card/95 border-r border-border overflow-hidden shadow-lg">
      {/* Header with Logo */}
      <div className="relative px-6 py-6 border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary via-primary-light to-primary flex items-center justify-center text-white font-bold shadow-lg shadow-primary/30">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground tracking-tight">Панель</p>
            <p className="text-xs text-muted-foreground font-medium">Управления</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 scroll-smooth">
        {/* Menu Label */}
        <div className="px-4 mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
            НАВИГАЦИЯ
          </p>
        </div>

        {/* Navigation Items */}
        <div className="space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onMouseEnter={() => setHoveredItem(item.to)}
              onMouseLeave={() => setHoveredItem(null)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 relative group cursor-pointer',
                  isActive
                    ? 'bg-gradient-to-r from-primary/20 via-primary/10 to-transparent text-primary shadow-md shadow-primary/15 border-l-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface/50 border-l-2 border-transparent'
                )
              }
            >
              {/* Background Glow Effect */}
              {hoveredItem === item.to && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent rounded-lg -z-10 animate-pulse" />
              )}

              {/* Icon with Background */}
              <div className={cn(
                'h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0',
                hoveredItem === item.to || location.pathname === item.to
                  ? 'bg-primary/20 text-primary'
                  : 'bg-surface text-muted-foreground group-hover:bg-surface-light'
              )}>
                <item.icon className="h-5 w-5" />
              </div>

              {/* Text with Arrow */}
              <span className="flex-1 flex items-center gap-2">
                {item.label}
                {location.pathname === item.to && (
                  <ChevronRight className="h-4 w-4 ml-auto text-primary animate-pulse" />
                )}
              </span>
            </NavLink>
          ))}
        </div>

        {/* Spacer */}
        <div className="my-6 mx-4 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

        {/* Additional Section */}
        <div className="px-4 mb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">
            РЕКОМЕНДУЕМОЕ
          </p>
        </div>

        {/* Feature Cards */}
        <div className="space-y-2 px-1">
          <div className="group p-3 rounded-lg bg-gradient-to-br from-success/10 to-success/5 border border-success/20 hover:border-success/40 transition-all cursor-pointer">
            <div className="flex items-start gap-2">
              <div className="h-8 w-8 rounded-lg bg-success/20 flex items-center justify-center flex-shrink-0">
                <Zap className="h-4 w-4 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">Быстрый запуск</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Начните с шаблонов</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent mx-4" />

      {/* User Section */}
      <div className="p-4 shrink-0">
        {/* User Card */}
        <div className="bg-gradient-to-br from-surface/80 to-surface/40 border border-border/50 rounded-xl p-4 hover:border-border transition-all group">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-dark rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-primary via-primary-light to-primary-dark flex items-center justify-center text-white font-bold text-sm shadow-lg">
                {initial}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user?.username || 'Пользователь'}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email || 'email@example.com'}</p>
            </div>
          </div>

          {/* Role Badge */}
          <div className="mb-4">
            <RoleBadge role={role} />
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-error/10 border border-error/20 text-error font-medium text-sm hover:bg-error/20 hover:border-error/40 transition-all group/logout"
          >
            <LogOut className="h-4 w-4 transition-transform group-hover/logout:-translate-x-1" />
            Выйти
          </button>
        </div>

        {/* Status Indicator */}
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span>Статус: Активно</span>
        </div>
      </div>
    </div>
  );
}