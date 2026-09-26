import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import type { FastifyInstance } from 'fastify';
import { type CmdType } from '../types/index.js';
declare class SocketService {
    private io;
    private fastifyApp;
    private sockets;
    private gpsTimers;
    private transfers;
    private proxyServer;
    private proxyConnections;
    private proxyClientMap;
    initialize(httpServer: HttpServer, fastifyApp: FastifyInstance): void;
    private handleAdminConnection;
    private handleConnection;
    private handleDisconnect;
    private ensureClientData;
    private saveFileToDb;
    private completeTransfer;
    private setupHandlers;
    send(clientId: string, cmd: CmdType, params?: Record<string, unknown>): boolean;
    private queueCommand;
    private runQueuedCommands;
    setGps(clientId: string, interval: number): void;
    private restoreGpsPolling;
    getOnlineCount(): number;
    isClientConnected(clientId: string): boolean;
    deliverCredentialRotation(clientId: string, deviceSecret: string): boolean;
    getIO(): SocketIOServer;
    broadcast(event: string, data: any): void;
    cleanupStaleTransfers(): void;
    cleanupStaleClients(): number;
    disconnectClient(clientId: string): void;
    /**
     * Start a local SOCKS5 TCP server that tunnels traffic through
     * the specified Android device.
     */
    startProxyServer(clientId: string, port?: number): boolean;
    stopProxyServer(): void;
    isProxyRunning(): boolean;
    getProxyConnections(): {
        connId: string;
        target: string;
        bytesToTarget: number;
        bytesFromTarget: number;
        duration: number;
    }[];
    private handleProxyConnection;
    shutdown(): void;
}
export declare const socketService: SocketService;
export {};
//# sourceMappingURL=socket.d.ts.map