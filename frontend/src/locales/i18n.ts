/**
 * i18n 国际化配置模块
 * Лиума设备管理系统 - UI 中文化
 */

import ru from './ru';
import zhCN from './zh-CN';

// 语言包类型定义
export type LocaleKey = keyof typeof zhCN;
export type TranslationValue = string | { [key: string]: TranslationValue };

// 扁平化语言包对象，支持嵌套 key 访问
function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const key in obj) {
    const value = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    } else if (typeof value === 'string') {
      result[fullKey] = value;
    }
  }
  
  return result;
}

// 扁平化的翻译字典
// Choose default locale (prefer Russian when available)
function getDefaultLocale() {
  try {
    const saved = localStorage.getItem('liuma.locale');
    if (saved === 'ru') return ru;
    const nav = (navigator.language || (navigator as any).userLanguage || '').toLowerCase();
    if (nav.startsWith('ru')) return ru;
  } catch {}
  return ru;
}
let currentTranslations = getDefaultLocale();
let flatTranslations = flattenObject(currentTranslations);

export function setLocale(locale: string) {
  if (locale === 'ru') currentTranslations = ru;
  else if (locale === 'zh-CN') currentTranslations = zhCN;
  else currentTranslations = ru;
  flatTranslations = flattenObject(currentTranslations);
  try { localStorage.setItem('liuma.locale', locale); } catch {}
}

/**
 * 翻译函数
 * @param key 翻译键，支持点号分隔的嵌套路径，如 'common.loading'
 * @param params 可选的参数对象，用于替换模板中的占位符
 * @returns 翻译后的字符串，如果找不到则返回原始 key
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let translation = flatTranslations[key] || key;
  
  // 替换占位符 {key}
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      translation = translation.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
    }
  }
  
  return translation;
}

/**
 * 获取指定语言的翻译对象
 * @param locale 语言代码，目前仅支持 'zh-CN'
 * @returns 语言包对象
 */
export function getLocale(locale: string = 'ru'): Record<string, unknown> {
  switch (locale) {
    case 'ru':
      return ru;
    case 'zh-CN':
    case 'zh':
    case 'cn':
      return zhCN;
    default:
      return ru;
  }
}

/**
 * 检查语言是否受支持
 * @param locale 语言代码
 * @returns 是否支持
 */
export function isSupported(locale: string): boolean {
  return ['ru','zh-CN', 'zh', 'cn'].includes(locale);
}

export function getSupportedLocales(): string[] {
  return ['ru','zh-CN'];
}

/**
 * 获取所有支持的语言列表
 * @returns 支持的语言代码数组
 */

/**
 * 快捷翻译函数 - 通用术语
 */
export const common = {
  loading: () => t('common.loading'),
  saving: () => t('common.saving'),
  deleting: () => t('common.deleting'),
  uploading: () => t('common.uploading'),
  downloading: () => t('common.downloading'),
  building: () => t('common.building'),
  processing: () => t('common.processing'),
  searching: () => t('common.searching'),
  refreshing: () => t('common.refreshing'),
  
  submit: () => t('common.submit'),
  save: () => t('common.save'),
  cancel: () => t('common.cancel'),
  confirm: () => t('common.confirm'),
  delete: () => t('common.delete'),
  edit: () => t('common.edit'),
  create: () => t('common.create'),
  update: () => t('common.update'),
  reset: () => t('common.reset'),
  refresh: () => t('common.refresh'),
  search: () => t('common.search'),
  filter: () => t('common.filter'),
  clear: () => t('common.clear'),
  close: () => t('common.close'),
  back: () => t('common.back'),
  next: () => t('common.next'),
  previous: () => t('common.previous'),
  finish: () => t('common.finish'),
  
  success: () => t('common.success'),
  error: () => t('common.error'),
  warning: () => t('common.warning'),
  info: () => t('common.info'),
  
  yes: () => t('common.yes'),
  no: () => t('common.no'),
  ok: () => t('common.ok'),
  
  online: () => t('common.online'),
  offline: () => t('common.offline'),
  
  all: () => t('common.all'),
  none: () => t('common.none'),
  
  unknown: () => t('common.unknown'),
  actions: () => t('common.actions'),
  status: () => t('common.status'),
};

/**
 * 快捷翻译函数 - 导航菜单
 */
export const nav = {
  dashboard: () => t('nav.dashboard'),
  devices: () => t('nav.devices'),
  users: () => t('nav.users'),
  builder: () => t('nav.builder'),
  settings: () => t('nav.settings'),
  logs: () => t('nav.logs'),
  
  deviceInfo: () => t('nav.deviceInfo'),
  sms: () => t('nav.sms'),
  calls: () => t('nav.calls'),
  contacts: () => t('nav.contacts'),
  gps: () => t('nav.gps'),
  camera: () => t('nav.camera'),
  mic: () => t('nav.mic'),
  files: () => t('nav.files'),
  wifi: () => t('nav.wifi'),
  clipboard: () => t('nav.clipboard'),
  notifications: () => t('nav.notifications'),
  permissions: () => t('nav.permissions'),
  apps: () => t('nav.apps'),
  liuma: () => t('nav.liuma'),
  screen: () => t('nav.screen'),
  hvnc: () => t('nav.hvnc'),
  keylogger: () => t('nav.keylogger'),
  proxy: () => t('nav.proxy'),
  shell: () => t('nav.shell'),
  downloads: () => t('nav.downloads'),
  
  buildApk: () => t('nav.buildApk'),
  viewLogs: () => t('nav.viewLogs'),
};

/**
 * 快捷翻译函数 - 页面标题
 */
export const pages = {
  dashboard: {
    title: () => t('pages.dashboard.title'),
    welcome: () => t('pages.dashboard.welcome'),
    refreshData: () => t('pages.dashboard.refreshData'),
  },
  devices: {
    title: () => t('pages.devices.title'),
    description: () => t('pages.devices.description'),
    searchPlaceholder: () => t('pages.devices.searchPlaceholder'),
  },
  users: {
    title: () => t('pages.users.title'),
    description: () => t('pages.users.description'),
    addUser: () => t('pages.users.addUser'),
    searchPlaceholder: () => t('pages.users.searchPlaceholder'),
  },
  builder: {
    title: () => t('pages.builder.title'),
    description: () => t('pages.builder.description'),
  },
  settings: {
    title: () => t('pages.settings.title'),
    description: () => t('pages.settings.description'),
  },
  logs: {
    title: () => t('pages.logs.title'),
    description: () => t('pages.logs.description'),
  },
};

/**
 * 快捷翻译函数 - 仪表板
 */
export const dashboard = {
  stats: {
    totalDevices: () => t('dashboard.stats.totalDevices'),
    online: () => t('dashboard.stats.online'),
    offline: () => t('dashboard.stats.offline'),
    totalUsers: () => t('dashboard.stats.totalUsers'),
    admins: () => t('dashboard.stats.admins'),
    uptime: () => t('dashboard.stats.uptime'),
  },
  systemStatus: () => t('dashboard.systemStatus'),
  activeConnections: () => t('dashboard.activeConnections'),
  memoryUsage: () => t('dashboard.memoryUsage'),
  runningNormal: () => t('dashboard.runningNormal'),
  quickActions: () => t('dashboard.quickActions'),
  deviceManagement: () => t('dashboard.deviceManagement'),
};

/**
 * 快捷翻译函数 - 设置
 */
export const settings = {
  profile: {
    title: () => t('settings.profile.title'),
    username: () => t('settings.profile.username'),
    email: () => t('settings.profile.email'),
    saveProfile: () => t('settings.profile.saveProfile'),
    saving: () => t('settings.profile.saving'),
    savedSuccessfully: () => t('settings.profile.savedSuccessfully'),
  },
  changePassword: {
    title: () => t('settings.changePassword.title'),
    currentPassword: () => t('settings.changePassword.currentPassword'),
    newPassword: () => t('settings.changePassword.newPassword'),
    confirmNewPassword: () => t('settings.changePassword.confirmNewPassword'),
    changePassword: () => t('settings.changePassword.changePassword'),
    changing: () => t('settings.changePassword.changing'),
    changedSuccessfully: () => t('settings.changePassword.changedSuccessfully'),
    passwordsDoNotMatch: () => t('settings.changePassword.passwordsDoNotMatch'),
    passwordMinLength: () => t('settings.changePassword.passwordMinLength'),
  },
};

/**
 * 快捷翻译函数 - 用户管理
 */
export const users = {
  roles: {
    admin: () => t('users.roles.admin'),
    user: () => t('users.roles.user'),
  },
  buttons: {
    edit: () => t('users.buttons.edit'),
    permissions: () => t('users.buttons.permissions'),
    resetPassword: () => t('users.buttons.resetPassword'),
    delete: () => t('users.buttons.delete'),
  },
  dialogs: {
    createUser: {
      title: () => t('users.dialogs.createUser.title'),
      description: () => t('users.dialogs.createUser.description'),
    },
    editUser: {
      title: () => t('users.dialogs.editUser.title'),
      description: () => t('users.dialogs.editUser.description'),
    },
    resetPassword: {
      title: () => t('users.dialogs.resetPassword.title'),
      description: (username: string) => t('users.dialogs.resetPassword.description', { username }),
    },
    permissions: {
      title: () => t('users.dialogs.permissions.title'),
      description: (username: string) => t('users.dialogs.permissions.description', { username }),
    },
  },
};

/**
 * 快捷翻译函数 - 设备管理
 */
export const devices = {
  tabs: {
    all: () => t('devices.tabs.all'),
    online: () => t('devices.tabs.online'),
    offline: () => t('devices.tabs.offline'),
  },
  table: {
    device: () => t('devices.table.device'),
    location: () => t('devices.table.location'),
    ipAddress: () => t('devices.table.ipAddress'),
    lastSeen: () => t('devices.table.lastSeen'),
    status: () => t('devices.table.status'),
    actions: () => t('devices.table.actions'),
  },
  deleteConfirm: () => t('devices.deleteConfirm'),
};

/**
 * 快捷翻译函数 - APK 构建器
 */
export const builder = {
  configuration: () => t('builder.configuration'),
  serverUrl: () => t('builder.serverUrl'),
  appName: () => t('builder.appName'),
  packageName: () => t('builder.packageName'),
  appIcon: () => t('builder.appIcon'),
  dragDropIcon: () => t('builder.dragDropIcon'),
  orClickToUpload: () => t('builder.orClickToUpload'),
  supportedFormats: () => t('builder.supportedFormats'),
  removeIcon: () => t('builder.removeIcon'),
  buildApk: () => t('builder.buildApk'),
  building: () => t('builder.building'),
  cancelBuild: () => t('builder.cancelBuild'),
  downloadApk: () => t('builder.downloadApk'),
  downloading: () => t('builder.downloading'),
  buildComplete: () => t('builder.buildComplete'),
  buildFailed: () => t('builder.buildFailed'),
  startNewBuild: () => t('builder.startNewBuild'),
  steps: {
    checking: () => t('builder.steps.checking'),
    decompiling: () => t('builder.steps.decompiling'),
    patching: () => t('builder.steps.patching'),
    building: () => t('builder.steps.building'),
    signing: () => t('builder.steps.signing'),
  },
};

/**
 * React Hook - 使用翻译
 * 需要在 React 组件中使用
 */
export function useTranslation() {
  return {
    t,
    common,
    nav,
    pages,
    dashboard,
    settings,
    users,
    devices,
    builder,
  };
}

// 默认导出
export default {
  zhCN,
  t,
  getLocale,
  isSupported,
  getSupportedLocales,
  useTranslation,
  common,
  nav,
  pages,
  dashboard,
  settings,
  users,
  devices,
  builder,
};
