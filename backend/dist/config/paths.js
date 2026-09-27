import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const DATA_DIR = path.resolve(ROOT_DIR, 'data');

// Environment overrides (prefer explicit env vars, fall back to C:/tools)
const ENV_APKTOOL_JAR = process.env.APKTOOL_JAR ?? process.env.APKTOOL_PATH ?? null;
const ENV_SIGNER_JAR = process.env.SIGNER_JAR ?? process.env.UBER_APK_SIGNER_PATH ?? null;
const ENV_BASE_APK = process.env.BASE_APK ?? process.env.FACTORY_BASE_APK ?? null;

function findFirstFile(dir, matcher) {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = findFirstFile(fullPath, matcher);
      if (nested) return nested;
      continue;
    }
    if (matcher(entry.name)) return fullPath;
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

  // Prefer explicit env override -> C:/tools -> factoryDir candidates
  const toolsDir = 'C:/tools';

  let baseApkPath = null;
  if (ENV_BASE_APK && fs.existsSync(ENV_BASE_APK)) baseApkPath = ENV_BASE_APK;
  else if (fs.existsSync(path.join(toolsDir, 'Liuma.apk'))) baseApkPath = path.join(toolsDir, 'Liuma.apk');
  else baseApkPath = candidateApks.find(p => fs.existsSync(p)) ?? findFirstFile(factoryDir, (name) => name.toLowerCase().endsWith('.apk')) ?? candidateApks[0];

  let apkToolPath = null;
  if (ENV_APKTOOL_JAR && fs.existsSync(ENV_APKTOOL_JAR)) apkToolPath = ENV_APKTOOL_JAR;
  else if (fs.existsSync(path.join(toolsDir, 'apktool.jar'))) apkToolPath = path.join(toolsDir, 'apktool.jar');
  else if (fs.existsSync(path.join(factoryDir, 'apktool.jar'))) apkToolPath = path.join(factoryDir, 'apktool.jar');
  else apkToolPath = findFirstFile(factoryDir, (name) => name.toLowerCase().includes('apktool') && name.toLowerCase().endsWith('.jar')) ?? path.join(factoryDir, 'apktool.jar');

  let signerPath = null;
  if (ENV_SIGNER_JAR && fs.existsSync(ENV_SIGNER_JAR)) signerPath = ENV_SIGNER_JAR;
  else if (fs.existsSync(path.join(toolsDir, 'uber-apk-signer.jar'))) signerPath = path.join(toolsDir, 'uber-apk-signer.jar');
  else if (fs.existsSync(path.join(factoryDir, 'uber-apk-signer.jar'))) signerPath = path.join(factoryDir, 'uber-apk-signer.jar');
  else signerPath = findFirstFile(factoryDir, (name) => name.toLowerCase().includes('uber-apk-signer') && name.toLowerCase().endsWith('.jar')) ?? path.join(factoryDir, 'uber-apk-signer.jar');

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
