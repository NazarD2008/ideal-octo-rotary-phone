import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Brand from './Brand';
import HeaderNav from './HeaderNav';
import HeaderActions from './HeaderActions';
import { getNavItems } from '@/config/navigation';
import { useAuthStore } from '@/store/auth';
import { t } from '@/locales/i18n';

export default function HeaderTop({ onMobileMenuOpen }: { onMobileMenuOpen?: () => void }) {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  const items = getNavItems(hasPermission);

  return (
    <header className="header-inner w-full mx-auto flex items-center justify-between h-16 px-4 max-w-6xl" role="banner">
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 cursor-pointer lg:hidden">
          <button aria-label={t('header.openMenu') || 'Open menu'} onClick={() => onMobileMenuOpen?.()} className="p-2 rounded hover:bg-surface/40">
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/') }>
          <Brand />
        </div>
      </div>

      <div className="header-center flex-1 hidden lg:flex items-center justify-center">
        <div className="w-full max-w-3xl">
          <nav className="flex items-center justify-center gap-2" aria-label={t('header.nav.ariaLabel') || 'Primary'}>
            <HeaderNav />
          </nav>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="hidden md:flex items-center gap-2">
          {/* Desktop actions: builder and profile */}
          <HeaderActions />
        </div>
      </div>
    </header>
  );
}
