import type { FastifyInstance } from 'fastify';
import type { clients as ClientsTable } from '../db/schema.js';
export declare function deviceRoutes(app: FastifyInstance): Promise<void>;
type ClientRow = typeof ClientsTable.$inferSelect;
export declare function formatClient(client: ClientRow): {
    id: string;
    ip: string | null;
    country: string | null;
    city: string | null;
    timezone: string | null;
    deviceModel: string | null;
    deviceBrand: string | null;
    deviceVersion: string | null;
    online: boolean;
    firstSeen: string | null;
    lastSeen: string | null;
    reconnectCount: number | null;
    fasonHidden: boolean;
    cameraPermission: boolean;
    currentPath: string | null;
    gpsInterval: number | null;
};
export {};
//# sourceMappingURL=device.d.ts.map