import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { t } from '@/locales/i18n';

type NavItem = { to: string; label: string; icon?: React.ComponentType<any>; end?: boolean };

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  items?: NavItem[];
  ariaLabel?: string;
}

export default function MobileDrawer({ open, onClose, items = [], ariaLabel }: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    // save previously focused element to restore focus on close
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    // lock body scroll (simple approach)
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // focus close button on next tick
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const nodes = drawerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [];
        if (nodes.length === 0) {
          e.preventDefault();
          return;
        }
        const first = nodes[0];
        const last = nodes[nodes.length - 1];

        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', onKeyDown);
      // restore focus
      try { previouslyFocusedRef.current?.focus(); } catch {}
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50" aria-hidden={!open}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || t('header.nav.ariaLabel') || 'Меню'}
        className="absolute left-0 top-0 h-full w-72 bg-surface p-4 shadow-lg"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold">{t('header.brand.title') || 'Консоль Лиума'}</div>
          <button
            ref={closeButtonRef}
            aria-label={t('header.closeMenu') || 'Закрыть меню'}
            onClick={onClose}
            className="p-2 rounded hover:bg-surface/50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-2" aria-label={t('header.nav.ariaLabel') || 'Навигация'}>
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
