import type { ServerConfig } from '../types/index.js';
export declare const defaultConfig: ServerConfig;
export declare function getConfig(): ServerConfig;
export declare function parseConfigValue(value: string): unknown;
/** Set a nested config value by dot-separated key (e.g. "socket.pingInterval"). */
export declare function updateConfig(key: string, value: unknown): void;
/** Load persisted settings from the database into runtime config. */
export declare function loadPersistedSettings(): void;
//# sourceMappingURL=index.d.ts.map