import fs from 'fs';
const fp = 'dist/config/paths.js';
let s = fs.readFileSync(fp, 'utf8');

// Replace apkToolPath assignment block
s = s.replace(/const apkToolPath =([\s\S]*?)path.join\(factoryDir, 'apktool.jar'\)\);/, `const apkToolPath = (ENV_APKTOOL_JAR && fs.existsSync(ENV_APKTOOL_JAR) ? ENV_APKTOOL_JAR : null) ??\n        (fs.existsSync(path.join('C:/tools','apktool.jar')) ? path.join('C:/tools','apktool.jar') : null) ??\n        (fs.existsSync(path.join(factoryDir, 'apktool.jar')) ? path.join(factoryDir, 'apktool.jar') : null) ??\n        findFirstFile(factoryDir, (name) => name.toLowerCase().includes('apktool') && name.toLowerCase().endsWith('.jar')) ??\n        (ENV_APKTOOL_JAR || path.join(factoryDir, 'apktool.jar'));`);

// Replace signerPath assignment block
s = s.replace(/const signerPath =([\s\S]*?)path.join\(factoryDir, 'uber-apk-signer.jar'\)\);/, `const signerPath = (ENV_SIGNER_JAR && fs.existsSync(ENV_SIGNER_JAR) ? ENV_SIGNER_JAR : null) ??\n        (fs.existsSync(path.join('C:/tools','uber-apk-signer.jar')) ? path.join('C:/tools','uber-apk-signer.jar') : null) ??\n        (fs.existsSync(path.join(factoryDir, 'uber-apk-signer.jar')) ? path.join(factoryDir, 'uber-apk-signer.jar') : null) ??\n        findFirstFile(factoryDir, (name) => name.toLowerCase().includes('uber-apk-signer') && name.toLowerCase().endsWith('.jar')) ??\n        (ENV_SIGNER_JAR || path.join(factoryDir, 'uber-apk-signer.jar'));`);

fs.writeFileSync(fp, s, 'utf8');
console.log('Patched', fp);
