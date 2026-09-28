const fs = require('fs');
const fp = 'dist/config/paths.js';
let s = fs.readFileSync(fp, 'utf8');

const baseStart = s.indexOf('const baseApkPath =');
if (baseStart === -1) { console.error('baseApkPath not found'); process.exit(1); }
const baseEnd = s.indexOf('\n', baseStart);
let baseEndIdx = baseEnd;
// find the semicolon that ends the assignment (look forward a bit)
const semi = s.indexOf(';', baseStart);
if (semi !== -1 && semi > baseStart) baseEndIdx = semi + 1;

const returnIndex = s.indexOf('return { factoryDir, baseApkPath, apkToolPath, signerPath };');
if (returnIndex === -1) { console.error('returnIndex not found'); process.exit(1); }

const head = s.slice(0, baseEndIdx);
const tail = s.slice(returnIndex);

const newMiddle = `\n  const apkToolPath = (ENV_APKTOOL_JAR && fs.existsSync(ENV_APKTOOL_JAR) ? ENV_APKTOOL_JAR : null) ??\n        (fs.existsSync(path.join('C:/tools','apktool.jar')) ? path.join('C:/tools','apktool.jar') : null) ??\n        (fs.existsSync(path.join(factoryDir, 'apktool.jar')) ? path.join(factoryDir, 'apktool.jar') : null) ??\n        findFirstFile(factoryDir, (name) => name.toLowerCase().includes('apktool') && name.toLowerCase().endsWith('.jar')) ??\n        (ENV_APKTOOL_JAR || path.join(factoryDir, 'apktool.jar'));\n\n  const signerPath = (ENV_SIGNER_JAR && fs.existsSync(ENV_SIGNER_JAR) ? ENV_SIGNER_JAR : null) ??\n        (fs.existsSync(path.join('C:/tools','uber-apk-signer.jar')) ? path.join('C:/tools','uber-apk-signer.jar') : null) ??\n        (fs.existsSync(path.join(factoryDir, 'uber-apk-signer.jar')) ? path.join(factoryDir, 'uber-apk-signer.jar') : null) ??\n        findFirstFile(factoryDir, (name) => name.toLowerCase().includes('uber-apk-signer') && name.toLowerCase().endsWith('.jar')) ??\n        (ENV_SIGNER_JAR || path.join(factoryDir, 'uber-apk-signer.jar'));\n\n`;

const newS = head + newMiddle + tail;
fs.writeFileSync(fp, newS, 'utf8');
console.log('patched', fp);
