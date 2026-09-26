import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { getNavItems } from '@/config/navigation';
import { LogOut, X, ShieldCheck, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

import type { UserRole } from '@/types';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileNav({ open, onClose }: MobileNavProps) {
  const { user, logout, hasPermission } = useAuthStore();
  const navigate = useNavigate();
  const role = user?.role || 'user' as UserRole;
  const navItems = getNavItems(hasPermission);

  useEffect(() => {
    if (open) { document.body.style.overflow = 'hidden'; } else { document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const handleLogout = async () => { await logout(); onClose(); navigate('/login'); };
  const handleNavClick = () => { onClose(); };
  const initial = user?.username?.[0]?.toUpperCase() || 'U';
  const RoleIcon = role === 'admin' ? ShieldCheck : Shield;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-card border-r border-border shadow-xl flex flex-col animate-slideInLeft">
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-sm font-bold">
              P
            </div>
            <span className="text-sm font-semibold text-foreground">Панель управления</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-all p-1.5 rounded-lg hover:bg-surface"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4">
          <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Главное меню</p>
          <div className="space-y-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    isActive ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-surface'
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User Section */}
        <div className="border-t border-border p-4 shrink-0 bg-surface/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-sm font-bold shrink-0">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user?.username || 'Пользователь'}</p>
              <div className="flex items-center gap-1">
                <RoleIcon className={`h-3 w-3 ${role === 'admin' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-xs ${role === 'admin' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  {role === 'admin' ? 'Админ' : 'Пользователь'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground transition-all p-1.5 rounded-lg hover:bg-surface"
              title="Выйти"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}