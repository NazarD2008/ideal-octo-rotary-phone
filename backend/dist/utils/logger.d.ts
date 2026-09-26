import pino from 'pino';
export declare const logger: pino.Logger<never, boolean>;
export declare const log: {
    info: (msg: string, ...args: unknown[]) => void;
    error: (msg: string, err?: unknown) => void;
    warn: (msg: string, ...args: unknown[]) => void;
    debug: (msg: string, ...args: unknown[]) => void;
};
//# sourceMappingURL=logger.d.ts.map