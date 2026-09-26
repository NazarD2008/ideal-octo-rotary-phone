import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { NavLink } from 'react-router-dom';

interface NavItem { to: string; label: string; }

export default function MobileDrawer({ open, onClose, items, user, onLogout, ariaLabel = 'Mobile menu' } : { open: boolean; onClose: ()=>void; items: NavItem[]; user?: any; onLogout?: ()=>Promise<void>; ariaLabel?: string }){
  const ref = useRef<HTMLDivElement | null>(null);
  const portalRoot = document.body;

  useEffect(()=>{
    if(!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const handleKey = (e: KeyboardEvent)=>{
      if(e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return ()=>{
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
      prev?.focus();
    };
  },[open,onClose]);

  if(!open) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <aside ref={ref} role="dialog" aria-modal="true" aria-label={ariaLabel} className="w-72 max-w-[85vw] bg-card border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Меню</h3>
          <button aria-label="Close" onClick={onClose} className="p-2">✕</button>
        </div>
        <nav className="flex flex-col gap-2">
          {items.map((it)=> (
            <NavLink key={it.to} to={it.to} onClick={onClose} className="px-2 py-2 rounded hover:bg-surface">{it.label}</NavLink>
          ))}
        </nav>
        <div className="mt-4 border-t pt-4">
          {user ? (
            <div>
              <p className="font-medium">{user.username}</p>
              <button onClick={()=>{ onLogout?.(); onClose(); }} className="text-sm text-destructive mt-2">Выйти</button>
            </div>
          ) : (
            <NavLink to="/login" onClick={onClose}>Войти</NavLink>
          )}
        </div>
      </aside>
    </div>, portalRoot
  );
}
