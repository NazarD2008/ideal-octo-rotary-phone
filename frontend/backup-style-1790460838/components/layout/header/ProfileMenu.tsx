import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { LogOut, ShieldCheck, Shield } from 'lucide-react';
import { t } from '@/locales/i18n';

export default function ProfileMenu() {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const initial = user?.username?.[0]?.toUpperCase() || 'U';
  const role = user?.role || 'user';
  const RoleIcon = role === 'admin' ? ShieldCheck : Shield;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)} className="inline-flex items-center gap-2 h-10 rounded-lg px-2.5 border border-border bg-surface text-foreground hover:bg-surface-light transition-all">
        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-xs font-bold">{initial}</div>
        <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">{user?.username || t('common.userFallback') || 'Пользователь'}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 min-w-[220px] rounded-lg border border-border bg-card shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-surface/50">
            <p className="text-sm font-medium">{user?.username || t('common.userFallback')}</p>
            <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
            <div className="flex items-center gap-1 mt-2">
              <RoleIcon className={`h-3.5 w-3.5 ${role === 'admin' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-xs ${role === 'admin' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{role === 'admin' ? t('roles.admin') : t('roles.user')}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-error hover:bg-error/10 transition-all">
            <LogOut className="h-4 w-4" /> {t('auth.logout') || 'Выйти'}
          </button>
        </div>
      )}
    </div>
  );
}
