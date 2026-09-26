import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Zap, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from './ThemeToggle';
import ProfileMenu from './ProfileMenu';
import HeaderNav from './HeaderNav';
import { t } from '@/locales/i18n';

export default function HeaderTop({ onMobileMenuOpen }: { onMobileMenuOpen: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="header-inner w-full mx-auto flex items-center justify-between h-16 px-4" role="banner">
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/') }>
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold shadow">
            <Zap className="h-5 w-5" />
          </div>
          <div className="hidden sm:flex flex-col" style={{minWidth: 180}}>
            <span className="text-base font-semibold text-foreground">{t('app.title') || 'Консоль Лиума'}</span>
            <span className="text-xs text-muted-foreground">{t('app.subtitle') || 'Панель управления'}</span>
          </div>
        </div>
      </div>

      <div className="header-center flex-1 flex items-center justify-center">
        {/* Center: nav items */}
        <div className="w-full max-w-3xl">
          <nav className="flex items-center justify-center gap-2">
            {/* Nav items are rendered by HeaderNav; include directly to ensure center alignment */}
            <HeaderNav />
          </nav>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="hidden md:flex items-center gap-2">
          <Button onClick={() => navigate('/users')} size="sm" className="gap-2 btn-pill">
            <Plus className="h-4 w-4" /> {t('pages.users.addUser')}
          </Button>
          <Button onClick={() => navigate('/builder')} size="sm" variant="outline" className="gap-2 btn-pill">
            <Zap className="h-4 w-4" /> {t('nav.builder') || 'Сборка APK'}
          </Button>
        </div>

        <ThemeToggle />
        <ProfileMenu />
      </div>
    </div>
  );
}
