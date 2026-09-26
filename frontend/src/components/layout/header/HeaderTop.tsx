import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Zap, Plus, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from './ThemeToggle';
import ProfileMenu from './ProfileMenu';
import HeaderNav from './HeaderNav';
import Brand from './Brand';
import HeaderActions from './HeaderActions';
import { t } from '@/locales/i18n';

export default function HeaderTop({ onMobileMenuOpen }: { onMobileMenuOpen?: () => void }) {
  const navigate = useNavigate();

  return (
    <header className="header-inner w-full mx-auto flex items-center justify-between h-16 px-4 max-w-6xl" role="banner">
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/') }>
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold shadow">
            <Zap className="h-5 w-5" />
          </div>
          <div className="hidden sm:flex flex-col" style={{minWidth: 180}}>
            <span className="text-base font-semibold text-foreground">{t('app.title') || 'Консоль Лиума'}</span>
            {/* subtitle removed from header to match original layout */}
          </div>
        </div>
      </div>

      <div className="header-center flex-1 flex items-center justify-center">
        <div className="w-full max-w-3xl">
          <nav className="flex items-center justify-center gap-2" aria-label={t('header.nav.ariaLabel') || 'Primary'}>
            <HeaderNav />
          </nav>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Desktop actions: builder and profile; remove Add User from this area per request */}
        <div className="hidden md:flex items-center gap-2">
          {/* Builder link kept */}
          {/* Builder link removed from top-right per request */}
          <></>
        </div>

        <ThemeToggle />
        <ProfileMenu />
      </div>
    </header>
  );
}
