import fs from 'fs';
const fp = 'dist/routes/builder.js';
let s = fs.readFileSync(fp, 'utf8');
const startMarker = "setProgress('building', 'Rebuilding APK with apktool...', false, null, appName, jobId);";
const runMarker = "await runProcess('java', ['-jar', paths.apkToolPath";
const startIdx = s.indexOf(startMarker);
const runIdx = s.indexOf(runMarker);
if (startIdx === -1 || runIdx === -1) {
  console.error('Markers not found', { startIdx, runIdx });
  process.exit(1);
}
const before = s.slice(0, startIdx + startMarker.length);
const after = s.slice(runIdx);
const inject = `\n\n    // Robust manifest rewrite using fast-xml-parser\n    try {\n      const manifestFile = path.join(decompilePath, 'AndroidManifest.xml');\n      if (fs.existsSync(manifestFile)) {\n        try {\n          const fxp = await import('fast-xml-parser');\n          const XMLParser = fxp.XMLParser;\n          const XMLBuilder = fxp.XMLBuilder;\n          const xml = fs.readFileSync(manifestFile, 'utf8');\n          const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', removeNSPrefix: false, parseTagValue: false });\n          const obj = parser.parse(xml);\n          const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '', format: false });\n          const newXml = builder.build(obj);\n          fs.writeFileSync(manifestFile, newXml, 'utf8');\n          appendJobLog(jobId, 'info', 'Rewrote AndroidManifest.xml using fast-xml-parser');\n        } catch (e) {\n          appendJobLog(jobId, 'stderr', 'fast-xml-parser rewrite failed: ' + String(e));\n        }\n      } else {\n        appendJobLog(jobId, 'info', 'Manifest file not found for rewrite: ' + manifestFile);\n      }\n    } catch (e) { appendJobLog(jobId, 'stderr', 'Manifest rewrite exception: ' + String(e)); }\n\n`;
fs.writeFileSync(fp, before + inject + after, 'utf8');
console.log('patched', fp);
