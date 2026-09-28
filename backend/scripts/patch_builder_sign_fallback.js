const fs = require('fs');
const path = require('path');
const file = path.resolve('backend','src','routes','builder.ts');
if (!fs.existsSync(file)) {
  console.error('File not found:', file);
  process.exit(2);
}
const src = fs.readFileSync(file,'utf8');
const marker = "setProgress('signing', 'Signing APK with uber-apk-signer...', false, null, appName, jobId);";
const pos = src.indexOf(marker);
if (pos === -1) {
  console.error('Marker not found in file');
  process.exit(3);
}
const after = src.slice(pos + marker.length);
const relRun = after.indexOf('await runProcess(');
if (relRun === -1) {
  console.error('await runProcess not found after marker');
  process.exit(4);
}
const runIndex = pos + marker.length + relRun;
// find the semicolon that ends the runProcess call
let semi = src.indexOf(';', runIndex);
if (semi === -1) {
  console.error('End semicolon not found for runProcess call');
  process.exit(5);
}
// but ensure we capture closing parenthesis; find the first ')' after runIndex
const parenClose = src.indexOf(')', runIndex);
if (parenClose !== -1 && parenClose > semi) {
  // unlikely; keep semi as is
}
const startReplace = runIndex;
const endReplace = semi + 1;
const originalCall = src.slice(startReplace, endReplace);
console.log('Located original runProcess call (len=' + originalCall.length + ')');

const replacementLines = [
  "try {",
  "  await runProcess('java', ['-jar', paths.signerPath, '--apks', outputApk, '--overwrite'], 180000, buildDir, jobId, jobLogFile);",
  "} catch (errSign) {",
  "  appendJobLog(jobId, 'stderr', 'uber-apk-signer failed: ' + String(errSign));",
  "  log.warn('[Builder] uber-apk-signer failed for job ' + jobId + ': ' + String(errSign));",
  "  const debugKeystore = process.env.DEBUG_KEYSTORE || path.join('C:', 'tools', 'debug.jks');",
  "  if (fs.existsSync(debugKeystore)) {",
  "    setProgress('signing', 'uber-apk-signer failed — falling back to jarsigner with debug keystore', false, null, appName, jobId);",
  "    try {",
  "      await runProcess('jarsigner', ['-verbose', '-keystore', debugKeystore, '-storepass', 'android', '-keypass', 'android', outputApk, 'liuma-debug', '-sigalg', 'SHA256withRSA', '-digestalg', 'SHA-256'], 120000, buildDir, jobId, jobLogFile);",
  "    } catch (err2) {",
  "      appendJobLog(jobId, 'stderr', 'jarsigner fallback failed: ' + String(err2));",
  "      throw new Error('Signing failed (uber-apk-signer err: ' + String(errSign) + '; jarsigner err: ' + String(err2) + ')');",
  "    }",
  "  } else {",
  "    appendJobLog(jobId, 'stderr', 'Debug keystore not found for jarsigner fallback, signing failed');",
  "    throw errSign;",
  "  }",
  "}",
].join('\n');

const newSrc = src.slice(0, startReplace) + replacementLines + src.slice(endReplace);
const bak = file + '.bak.signfallback';
fs.writeFileSync(bak, src, 'utf8');
fs.writeFileSync(file, newSrc, 'utf8');
console.log('Patched file written. Backup saved to', bak);
