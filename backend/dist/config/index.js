import { getDb } from '../db/index.js';
import { settings } from '../db/schema.js';
import { LIMITS } from '../constants/index.js';
export const defaultConfig = {
    port: 32766,
    debug: false,
    socket: {
        pingInterval: 25000,
        pingTimeout: 60000,
        maxHttpBufferSize: LIMITS.MAX_CHUNK_BASE64_LENGTH,
        transports: ['websocket', 'polling'],
        cors: {
            origin: true,
            methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS'],
        },
    },
    rateLimit: {
        windowMs: 60000,
        maxRequests: 100,
    },
    build: {
        timeout: 600000,
    },
    security: {
        sessionTimeout: 86400000,
        loginAttempts: 5,
        loginLockout: 900000,
    },
    logger: {
        maxDbLogs: 10000,
        files: {
            maxSize: '20m',
            errorRetention: '30d',
        },
        console: {
            enabled: true,
        },
    },
};
let runtimeConfig = structuredClone(defaultConfig);
export function getConfig() {
    return runtimeConfig;
}
export function parseConfigValue(value) {
    if (value === 'true')
        return true;
    if (value === 'false')
        return false;
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== '')
        return num;
    return value;
}
/** Set a nested config value by dot-separated key (e.g. "socket.pingInterval"). */
export function updateConfig(key, value) {
    const keys = key.split('.');
    let obj = runtimeConfig;
    for (let i = 0; i < keys.length - 1; i++) {
        if (obj[keys[i]] === undefined)
            obj[keys[i]] = {};
        obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
}
/** Load persisted settings from the database into runtime config. */
export function loadPersistedSettings() {
    try {
        const d = getDb();
        const allSettings = d.select().from(settings).all();
        for (const setting of allSettings) {
            updateConfig(setting.key, parseConfigValue(setting.value));
        }
    }
    catch {
        // Settings table might not exist yet
    }
}
//# sourceMappingURL=index.js.map