import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { t } from '@/locales/i18n';

type NavItem = { to: string; label: string; icon?: React.ComponentType<any>; end?: boolean };

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  items?: NavItem[];
}

export default function MobileDrawer({ open, onClose, items = [] }: MobileDrawerProps) {
  useEffect(() => {
    if (open) {
      // simple body scroll lock for the drawer; App-level code should prefer a ref-counted lock
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="absolute left-0 top-0 h-full w-72 bg-surface p-4 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold">{t('header.brand.title') || 'Консоль Лиума'}</div>
          <button aria-label={t('header.closeMenu') || 'Close menu'} onClick={onClose} className="p-2 rounded hover:bg-surface/50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded ${isActive ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
                onClick={onClose}
              >
                {Icon ? <Icon className="h-4 w-4" /> : null}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </div>,
    document.body,
  );
}
