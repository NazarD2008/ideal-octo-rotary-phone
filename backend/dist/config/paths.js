import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
function findFirstFile(dir, matcher) {
    if (!fs.existsSync(dir))
        return null;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const nested = findFirstFile(fullPath, matcher);
            if (nested)
                return nested;
            continue;
        }
        if (matcher(entry.name))
            return fullPath;
    }
    return null;
}
function resolveFactoryBuildAssets(factoryDir = path.join(ROOT_DIR, 'app', 'factory')) {
    const candidateApks = [
        path.join(factoryDir, 'baseApp', 'Liuma.apk'),
        path.join(factoryDir, 'baseApp', 'base.apk'),
        path.join(factoryDir, 'Liuma.apk'),
        path.join(factoryDir, 'base.apk'),
    ];
    const ENV_BASE_APK = process.env.BASE_APK ?? process.env.FACTORY_BASE_APK ?? null;
    const baseApkPath = (ENV_BASE_APK && fs.existsSync(ENV_BASE_APK) ? ENV_BASE_APK : null) ??
        candidateApks.find(fs.existsSync) ?? findFirstFile(factoryDir, (name) => name.toLowerCase().endsWith('.apk')) ?? candidateApks[0];
    const apkToolPath = (fs.existsSync(path.join(factoryDir, 'apktool.jar')) ? path.join(factoryDir, 'apktool.jar') : null) ??
        findFirstFile(factoryDir, (name) => name.toLowerCase().includes('apktool') && name.toLowerCase().endsWith('.jar')) ??
        path.join(factoryDir, 'apktool.jar');
    const signerPath = (fs.existsSync(path.join(factoryDir, 'uber-apk-signer.jar')) ? path.join(factoryDir, 'uber-apk-signer.jar') : null) ??
        findFirstFile(factoryDir, (name) => name.toLowerCase().includes('uber-apk-signer') && name.toLowerCase().endsWith('.jar')) ??
        path.join(factoryDir, 'uber-apk-signer.jar');
    return { factoryDir, baseApkPath, apkToolPath, signerPath };
}
const { factoryDir, baseApkPath, apkToolPath, signerPath } = resolveFactoryBuildAssets();
const paths = {
    rootDir: ROOT_DIR,
    dataDir: DATA_DIR,
    dbPath: path.join(DATA_DIR, 'liumaRat.db'),
    factoryDir,
    baseApkPath,
    apkToolPath,
    signerPath,
};
export { resolveFactoryBuildAssets };
function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}
function createBuildDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'fason-build-'));
}
export { paths, ensureDataDir, createBuildDir };
//# sourceMappingURL=paths.js.map