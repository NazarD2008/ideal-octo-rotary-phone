import {
  MonitorDot, Smartphone, Wrench, Settings, FileText, Users,
  Info, MessageSquare, Phone, MapPin, Camera, Mic,
  FolderOpen, Wifi, Clipboard, Bell, Shield, Download, Server, Monitor, Keyboard, MonitorSmartphone, Terminal, Globe,
} from 'lucide-react';
import type { Permission } from '@/types';

export interface NavItem {
  to: string;
  icon: typeof MonitorDot;
  label: string;
  end: boolean;
  permission: Permission;
}

// Русский перевод
const translations = {
  // Главное меню
  'Dashboard': 'Панель управления',
  'Devices': 'Устройства',
  'Users': 'Пользователи',
  'Builder': 'Сборка APK',
  'Settings': 'Настройки',
  'Logs': 'Журнал',

  // Вкладки устройства
  'Info': 'Информация',
  'SMS': 'SMS',
  'Calls': 'История звонков',
  'Contacts': 'Контакты',
  'GPS': 'GPS',
  'Camera': 'Камера',
  'Mic': 'Микрофон',
  'Files': 'Файлы',
  'WiFi': 'Wi-Fi',
  'Clipboard': 'Буфер обмена',
  'Notify': 'Уведомления',
  'Perms': 'Разрешения',
  'Apps': 'Приложения',
  'Liuma': 'Liuma',
  'Screen': 'Управление экраном',
  'HVNC': 'HVNC',
  'Keylogger': 'Кейлоггер',
  'Proxy': 'Прокси',
  'Shell': 'Терминал',
  'Downloads': 'Загрузки',

  // Быстрые действия
  'Build APK': 'Собрать APK',
  'View Logs': 'Просмотреть журнал',
};

function t(key: string): string {
  return translations[key as keyof typeof translations] || key;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: MonitorDot, label: t('Dashboard'), end: true, permission: 'dashboard:view' },
  { to: '/devices', icon: Smartphone, label: t('Devices'), end: false, permission: 'device:view' },
  { to: '/users', icon: Users, label: t('Users'), end: false, permission: 'users:manage' },
  { to: '/builder', icon: Wrench, label: t('Builder'), end: false, permission: 'builder:access' },
  { to: '/settings', icon: Settings, label: t('Settings'), end: false, permission: 'settings:view' },
  { to: '/logs', icon: FileText, label: t('Logs'), end: false, permission: 'logs:view' },
];

export function getNavItems(hasPermission: (perm: Permission) => boolean): NavItem[] {
  return NAV_ITEMS.filter(item => hasPermission(item.permission));
}

export interface DeviceTabItem {
  to: string;
  icon: typeof Info;
  label: string;
  permission: Permission;
}

export const DEVICE_TABS: DeviceTabItem[] = [
  { to: 'info', icon: Info, label: t('Info'), permission: 'device:view' },
  { to: 'sms', icon: MessageSquare, label: t('SMS'), permission: 'device:sms' },
  { to: 'calls', icon: Phone, label: t('Calls'), permission: 'device:calls' },
  { to: 'contacts', icon: Users, label: t('Contacts'), permission: 'device:contacts' },
  { to: 'gps', icon: MapPin, label: t('GPS'), permission: 'device:gps' },
  { to: 'camera', icon: Camera, label: t('Camera'), permission: 'device:camera' },
  { to: 'mic', icon: Mic, label: t('Mic'), permission: 'device:mic' },
  { to: 'files', icon: FolderOpen, label: t('Files'), permission: 'device:files' },
  { to: 'wifi', icon: Wifi, label: t('WiFi'), permission: 'device:wifi' },
  { to: 'clipboard', icon: Clipboard, label: t('Clipboard'), permission: 'device:clipboard' },
  { to: 'notifications', icon: Bell, label: t('Notify'), permission: 'device:notifications' },
  { to: 'permissions', icon: Shield, label: t('Perms'), permission: 'device:permissions' },
  { to: 'apps', icon: Smartphone, label: t('Apps'), permission: 'device:apps' },
  { to: 'fason', icon: Server, label: t('Liuma'), permission: 'device:fason' },
  { to: 'screen', icon: Monitor, label: t('Screen'), permission: 'device:screen' },
  { to: 'hvnc', icon: MonitorSmartphone, label: t('HVNC'), permission: 'device:hvnc' },
  { to: 'keylogger', icon: Keyboard, label: t('Keylogger'), permission: 'device:keylogger' },
  { to: 'proxy', icon: Globe, label: t('Proxy'), permission: 'device:proxy' },
  { to: 'shell', icon: Terminal, label: t('Shell'), permission: 'device:shell' },
  { to: 'downloads', icon: Download, label: t('Downloads'), permission: 'files:download' },
];

export function getDeviceTabs(hasPermission: (perm: Permission) => boolean): DeviceTabItem[] {
  return DEVICE_TABS.filter(tab => hasPermission(tab.permission));
}

export interface QuickAction {
  label: string;
  icon: typeof Smartphone;
  to: string;
  permission: Permission;
}

export const QUICK_ACTIONS: QuickAction[] = [
  { label: t('Devices'), icon: Smartphone, to: '/devices', permission: 'device:view' },
  { label: t('Build APK'), icon: MonitorDot, to: '/builder', permission: 'builder:access' },
  { label: t('View Logs'), icon: FileText, to: '/logs', permission: 'logs:view' },
  { label: t('Settings'), icon: Settings, to: '/settings', permission: 'settings:view' },
];

export function getQuickActions(hasPermission: (perm: Permission) => boolean): QuickAction[] {
  return QUICK_ACTIONS.filter(action => hasPermission(action.permission));
}