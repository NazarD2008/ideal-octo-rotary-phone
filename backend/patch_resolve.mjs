import fs from 'fs';
const fp = 'dist/config/paths.js';
let s = fs.readFileSync(fp, 'utf8');
const startIdx = s.indexOf('function resolveFactoryBuildAssets(factoryDir');
if (startIdx === -1) throw new Error('start marker not found');
const returnMarker = 'return { factoryDir, baseApkPath, apkToolPath, signerPath };';
const returnIdx = s.indexOf(returnMarker, startIdx);
if (returnIdx === -1) throw new Error('return marker not found');
// Find end of function (the closing brace after the return line)
const funcEndIdx = s.indexOf('};', returnIdx);
if (funcEndIdx === -1) throw new Error('function end not found');
const afterIdx = funcEndIdx + 2;

const newFunc = `function resolveFactoryBuildAssets(factoryDir = path.join(ROOT_DIR, 'app', 'factory')) {
  const candidateApks = [
    path.join(factoryDir, 'baseApp', 'Liuma.apk'),
    path.join(factoryDir, 'baseApp', 'base.apk'),
    path.join(factoryDir, 'Liuma.apk'),
    path.join(factoryDir, 'base.apk'),
  ];

  // explicit override: prefer env vars, then C:/tools, then factoryDir
  const overrideBase = process.env.BASE_APK || process.env.FACTORY_BASE_APK || 'C:/tools/Liuma.apk';
  const overrideApktool = process.env.APKTOOL_JAR || process.env.APKTOOL_PATH || 'C:/tools/apktool.jar';
  const overrideSigner = process.env.SIGNER_JAR || process.env.UBER_APK_SIGNER_PATH || 'C:/tools/uber-apk-signer.jar';

  const baseApkPath = (overrideBase && fs.existsSync(overrideBase) ? overrideBase : (candidateApks.find(fs.existsSync) ?? findFirstFile(factoryDir, (name) => name.toLowerCase().endsWith('.apk')) ?? candidateApks[0]));

  const apkToolPath = (overrideApktool && fs.existsSync(overrideApktool) ? overrideApktool : ((fs.existsSync(path.join(factoryDir, 'apktool.jar')) ? path.join(factoryDir, 'apktool.jar') : null) ?? findFirstFile(factoryDir, (name) => name.toLowerCase().includes('apktool') && name.toLowerCase().endsWith('.jar')) ?? path.join(factoryDir, 'apktool.jar')));

  const signerPath = (overrideSigner && fs.existsSync(overrideSigner) ? overrideSigner : ((fs.existsSync(path.join(factoryDir, 'uber-apk-signer.jar')) ? path.join(factoryDir, 'uber-apk-signer.jar') : null) ?? findFirstFile(factoryDir, (name) => name.toLowerCase().includes('uber-apk-signer') && name.toLowerCase().endsWith('.jar')) ?? path.join(factoryDir, 'uber-apk-signer.jar')));

  return { factoryDir, baseApkPath, apkToolPath, signerPath };
}
`;

const newS = s.slice(0, startIdx) + newFunc + s.slice(afterIdx);
fs.writeFileSync(fp, newS, 'utf8');
console.log('Patched', fp);
