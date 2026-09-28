process.env.APKTOOL_JAR = "C:/tools/apktool.jar";
process.env.BASE_APK = "C:/tools/Liuma.apk";
process.env.SIGNER_JAR = "C:/tools/uber-apk-signer.jar";
import('./dist/index.js').catch(e=>{ console.error(e); process.exit(1) });
