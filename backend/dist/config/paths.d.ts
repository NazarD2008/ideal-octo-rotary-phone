declare function resolveFactoryBuildAssets(factoryDir?: string): {
    factoryDir: string;
    baseApkPath: string;
    apkToolPath: string;
    signerPath: string;
};
declare const paths: {
    rootDir: string;
    dataDir: string;
    dbPath: string;
    factoryDir: string;
    baseApkPath: string;
    apkToolPath: string;
    signerPath: string;
};
export { resolveFactoryBuildAssets };
declare function ensureDataDir(): void;
declare function createBuildDir(): string;
export { paths, ensureDataDir, createBuildDir };
//# sourceMappingURL=paths.d.ts.map