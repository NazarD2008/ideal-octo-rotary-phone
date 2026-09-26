import { NavLink } from 'react-router-dom';
import { getNavItems } from '@/config/navigation';
import { useAuthStore } from '@/store/auth';

export default function HeaderNav() {
  const { hasPermission } = useAuthStore();
  const items = getNavItems(hasPermission);

  // Ensure the top bar shows the requested items in this order: Панель управления, Устройства, Пользователи, Сборка APK, Настройки, Журнал
  const desiredOrder = ['/', '/devices', '/users', '/builder', '/settings', '/logs'];
  const ordered = desiredOrder.map(path => items.find(i => i.to === path)).filter(Boolean) as typeof items;

  return (
    <nav className="h-12 flex items-center">
      <div className="flex gap-2 overflow-x-auto py-2">
        {ordered.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${isActive ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-surface/40 hover:text-foreground'}`}>
            <item.icon className="h-4 w-4" />
            <span className="hidden md:inline">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
