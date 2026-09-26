import React from 'react';
import ThemeToggle from './ThemeToggle';
import ProfileMenu from './ProfileMenu';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { t } from '@/locales/i18n';

export default function HeaderActions() {
  return (
    <div className="flex items-center gap-2">
      <div className="hidden sm:flex items-center gap-2">
        <Button variant="ghost" size="sm" aria-label={t('header.actions.addUser') || 'Add user'}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ThemeToggle />
      <ProfileMenu />
    </div>
  );
}
