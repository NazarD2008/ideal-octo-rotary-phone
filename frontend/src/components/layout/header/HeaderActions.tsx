import React from 'react';
import { Button } from '@/components/ui/button';
import ThemeToggle from './ThemeToggle';
import ProfileMenu from './ProfileMenu';

export default function HeaderActions({ onAddUser, onBuilder } : { onAddUser?: () => void; onBuilder?: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden md:flex items-center gap-2">
        <Button onClick={onAddUser} size="sm" className="gap-2 btn-pill">+ Пользователь</Button>
        <Button onClick={onBuilder} size="sm" variant="outline" className="gap-2 btn-pill">Сборка APK</Button>
      </div>
      <ThemeToggle />
      <ProfileMenu />
    </div>
  );
}
