import fs from 'fs';
const fp = 'dist/routes/builder.js';
let s = fs.readFileSync(fp, 'utf8');
const marker = "setProgress('building', 'Rebuilding APK with apktool...', false, null, appName, jobId);";
const idx = s.indexOf(marker);
if (idx === -1) { console.error('marker not found'); process.exit(1); }
const insertAt = s.indexOf('\n', idx) + 1;
const inject = `
    // DEBUG: dump AndroidManifest.xml into job log for debugging malformed XML
    try {
      const manifestPathDbg = path.join(decompilePath, 'AndroidManifest.xml');
      if (fs.existsSync(manifestPathDbg)) {
        const manifestContentDbg = fs.readFileSync(manifestPathDbg, 'utf8');
        appendJobLog(jobId, 'stdout', '--- AndroidManifest.xml START ---');
        manifestContentDbg.split(/\r?\n/).forEach((ln, i) => appendJobLog(jobId, 'stdout', (i+1) + ': ' + ln));
        appendJobLog(jobId, 'stdout', '--- AndroidManifest.xml END ---');
      } else {
        appendJobLog(jobId, 'stdout', 'AndroidManifest.xml not found at ' + manifestPathDbg);
      }
    } catch (e) {
      appendJobLog(jobId, 'stderr', 'Failed to read AndroidManifest.xml: ' + String(e));
    }
`;

s = s.slice(0, insertAt) + inject + s.slice(insertAt);
fs.writeFileSync(fp, s, 'utf8');
console.log('Injected manifest dump into', fp);
