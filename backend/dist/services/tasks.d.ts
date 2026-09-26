declare class TaskManager {
    private tasks;
    private running;
    register(name: string, interval: number, handler: () => void | Promise<void>, stopOnError?: boolean): void;
    startAll(): void;
    stopAll(): void;
}
export declare const taskManager: TaskManager;
export {};
//# sourceMappingURL=tasks.d.ts.map