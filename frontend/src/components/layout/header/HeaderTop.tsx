import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Zap, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from './ThemeToggle';
import ProfileMenu from './ProfileMenu';
import { t } from '@/locales/i18n';

export default function HeaderTop({ onMobileMenuOpen }: { onMobileMenuOpen: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between h-16">
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuOpen}
          className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg border border-border bg-surface text-foreground hover:bg-surface-light hover:border-primary transition-all"
          aria-label={t('nav.openMenu') || 'Открыть меню'}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>

        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/') }>
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold shadow">
            <Zap className="h-5 w-5" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-base font-semibold text-foreground">{t('app.title') || 'Консоль Лиума'}</span>
            <span className="text-xs text-muted-foreground">{t('app.subtitle') || 'Панель управления'}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2">
          <Button onClick={() => navigate('/users')} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> {t('pages.users.addUser')}
          </Button>
          <Button onClick={() => navigate('/builder')} size="sm" variant="outline" className="gap-2">
            <Zap className="h-4 w-4" /> {t('nav.builder') || 'Сборка APK'}
          </Button>
        </div>

        <ThemeToggle />
        <ProfileMenu />
      </div>
    </div>
  );
}
