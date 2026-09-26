import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './sidebar';
import Header from './header'; // refactored header (index.tsx in header/)
import MobileDrawer from './header/MobileDrawer';
import { getNavItems } from '@/config/navigation';
import { useAuthStore } from '@/store/auth';
import { useNavigate } from 'react-router-dom';
import { useDevicesStore } from '@/store/devices';
import { initAdminSocket, disconnectAdminSocket } from '@/services/socket';
import type { Socket } from 'socket.io-client';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { onDeviceConnected, onDeviceDisconnected } = useDevicesStore();
  const socketRef = useRef<Socket | null>(null);
  const navigate = useNavigate();
  const { user, logout, hasPermission } = useAuthStore();
  const navItems = getNavItems(hasPermission);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleDeviceChange = useCallback((payload: { id: string; model?: string; ip?: string; online: boolean }) => {
    if (payload.online) {
      onDeviceConnected(payload.id, payload.model, payload.ip);
    } else {
      onDeviceDisconnected(payload.id);
    }
  }, [onDeviceConnected, onDeviceDisconnected]);

  useEffect(() => {
    const s = initAdminSocket(handleDeviceChange);
    socketRef.current = s;

    return () => {
      disconnectAdminSocket();
      socketRef.current = null;
    };
  }, [handleDeviceChange]);

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <Header onMobileMenuOpen={() => setMobileOpen(true)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 md:p-6 lg:p-8 flex justify-center">
            <div className="w-full max-w-6xl px-4 md:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>


      </div>
      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        items={navItems}
      />
    </div>
  );
}
