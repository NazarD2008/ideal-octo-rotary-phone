import fs from 'fs';
const fp = 'dist/config/paths.js';
let s = fs.readFileSync(fp, 'utf8');

// Insert ENV vars after DATA_DIR line
s = s.replace("const DATA_DIR = path.resolve(ROOT_DIR, 'data');", `const DATA_DIR = path.resolve(ROOT_DIR, 'data');\nconst ENV_APKTOOL_JAR = process.env.APKTOOL_JAR ?? process.env.APKTOOL_PATH ?? null;\nconst ENV_SIGNER_JAR = process.env.SIGNER_JAR ?? process.env.UBER_APK_SIGNER_PATH ?? null;\nconst ENV_BASE_APK = process.env.BASE_APK ?? process.env.FACTORY_BASE_APK ?? null;`);

// Replace baseApkPath assignment
s = s.replace(/const baseApkPath =[\s\S]*?candidateApks\[0\];/, `const baseApkPath = (ENV_BASE_APK && fs.existsSync(ENV_BASE_APK) ? ENV_BASE_APK : null) ?? candidateApks.find(fs.existsSync) ?? findFirstFile(factoryDir, (name) => name.toLowerCase().endsWith('.apk')) ?? candidateApks[0];`);

// Replace apkToolPath assignment to prefer env or C:/tools
s = s.replace(/const apkToolPath =[\s\S]*?path.join\(factoryDir, 'apktool.jar'\)\);/, `const apkToolPath = (ENV_APKTOOL_JAR && fs.existsSync(ENV_APKTOOL_JAR) ? ENV_APKTOOL_JAR : null) ?? (fs.existsSync(path.join('C:/tools','apktool.jar')) ? path.join('C:/tools','apktool.jar') : null) ?? (fs.existsSync(path.join(factoryDir, 'apktool.jar')) ? path.join(factoryDir, 'apktool.jar') : null) ?? findFirstFile(factoryDir, (name) => name.toLowerCase().includes('apktool') && name.toLowerCase().endsWith('.jar')) ?? (ENV_APKTOOL_JAR || path.join(factoryDir, 'apktool.jar'));`);

// Replace signerPath assignment to prefer env or C:/tools
s = s.replace(/const signerPath =[\s\S]*?path.join\(factoryDir, 'uber-apk-signer.jar'\)\);/, `const signerPath = (ENV_SIGNER_JAR && fs.existsSync(ENV_SIGNER_JAR) ? ENV_SIGNER_JAR : null) ?? (fs.existsSync(path.join('C:/tools','uber-apk-signer.jar')) ? path.join('C:/tools','uber-apk-signer.jar') : null) ?? (fs.existsSync(path.join(factoryDir, 'uber-apk-signer.jar')) ? path.join(factoryDir, 'uber-apk-signer.jar') : null) ?? findFirstFile(factoryDir, (name) => name.toLowerCase().includes('uber-apk-signer') && name.toLowerCase().endsWith('.jar')) ?? (ENV_SIGNER_JAR || path.join(factoryDir, 'uber-apk-signer.jar'));`);

fs.writeFileSync(fp, s, 'utf8');
console.log('patched', fp);
