import fs from 'fs';
import path from 'path';
import { spawn, type ChildProcess } from 'child_process';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import sharp from 'sharp';
import crypto from 'crypto';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import treeKill from 'tree-kill';
import { getDb, getSqliteDb } from '../db/index.js';
import { buildRecords } from '../db/schema.js';
import { paths, ensureDataDir, createBuildDir } from '../config/paths.js';
import { eq, desc, sql } from 'drizzle-orm';
import { requirePermission } from '../middleware/auth.js';
import { socketService } from '../services/socket.js';
import { log } from '../utils/logger.js';
import { createPendingEnrollment, revokeEnrollment } from '../services/deviceAuth.js';
import { getAdbAssistBypassMode, patchAdbAssistBypassSmali, type AdbAssistBypassMode } from '../utils/adbBypass.js';

const DEFAULT_SERVER_URL = 'http://127.0.0.1:32766';
const DEFAULT_HOME_URL = 'https://google.com';
const DEFAULT_PACKAGE_NAME = 'com.liuma.app';
const MAX_ICON_SIZE = 5 * 1024 * 1024;
const MAX_APP_NAME_LENGTH = 50;
const PACKAGE_NAME_REGEX = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const VERSION_NAME_REGEX = /^[0-9]+(\.[0-9]+)*([-_a-zA-Z0-9]+)?$/;

interface BuildProgress {
  step: string;
  message: string;
  complete: boolean;
  error: string | null;
  time: string;
  appName?: string;
  jobId?: number;
}

interface BuildState {
  inProgress: boolean;
  progress: BuildProgress | null;
  cancelled: boolean;
}

const buildState: BuildState = { inProgress: false, progress: null, cancelled: false };
// Track active child processes and associate them with job ids so we can cancel per-job
const activeProcesses: Array<{ proc: ChildProcess; jobId?: number }> = [];

function getJobLogPath(jobId: number): string {
  ensureDataDir();
  const logsDir = path.join(paths.dataDir, 'build_logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  return path.join(logsDir, `build-${jobId}.log`);
}

function appendJobLog(jobId: number | undefined, stream: 'info' | 'stdout' | 'stderr', line: string): void {
  if (typeof jobId !== 'number') return;
  try {
    const p = getJobLogPath(jobId);
    const safeLine = String(line).replace(/\r?\n/g, ' ');
    fs.appendFileSync(p, `${new Date().toISOString()} [${stream.toUpperCase()}] ${safeLine}\n`);
  } catch (e) { /* best-effort */ }
}

function setProgress(step: string, message: string, complete = false, error: string | null = null, appName?: string, jobId?: number): void {
  const progress: BuildProgress = { step, message, complete, error, time: new Date().toISOString(), appName, jobId };
  buildState.progress = progress;
  // Persist a short progress line to per-job log when available
  appendJobLog(jobId, 'info', `${step}: ${message}${error ? ` (Error: ${error})` : ''}`);
  // Include jobId in socket event for UI correlation
  socketService.broadcast('builder:progress', progress);
  log.info(`[Builder] ${step}: ${message}${error ? ` (Error: ${error})` : ''}${jobId ? ` (job:${jobId})` : ''}`);
}

function runProcess(command: string, args: string[], timeoutMs?: number, logDir?: string, jobId?: number, jobLogFile?: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { detached: process.platform !== 'win32', env: { ...process.env, TEMP: process.env.BUILDER_TEMP || process.env.TEMP || (process.platform === 'win32' ? 'C:\\Temp' : '/tmp'), TMP: process.env.BUILDER_TEMP || process.env.TMP || (process.platform === 'win32' ? 'C:\\Temp' : '/tmp'), JAVA_TOOL_OPTIONS: ((process.env.JAVA_TOOL_OPTIONS || '') + ' -Dfile.encoding=UTF-8').trim() } });
    activeProcesses.push({ proc, jobId });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const stdoutStream = proc.stdout ? proc.stdout : null;
    const stderrStream = proc.stderr ? proc.stderr : null;

    // Stream to memory (capped) and optionally to log files
    const MAX_BUFFER = 1024 * 1024 * 5; // 5MB per stream
    function appendWithCap(target: string, chunk: string) {
      if (target.length > MAX_BUFFER) return target;
      return target + chunk;
    }

    // Optional per-job combined log stream
    let jobLogFd: fs.WriteStream | null = null;
    try {
      if (jobLogFile) {
        jobLogFd = fs.createWriteStream(jobLogFile, { flags: 'a' });
      }
    } catch { jobLogFd = null; }

    if (stdoutStream) stdoutStream.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stdout = appendWithCap(stdout, chunk);

      // Emit builder log lines for admins; split into lines to avoid overly long single messages
      try {
        const lines = chunk.split(/\r?\n/);
        for (const ln of lines) {
          if (ln.length === 0) continue;
          socketService.broadcast('builder:log', { jobId, stream: 'stdout', line: ln, time: new Date().toISOString() });
          appendJobLog(jobId, 'stdout', ln);
          if (jobLogFd) jobLogFd.write(`${new Date().toISOString()} [STDOUT] ${ln}\n`);
        }
      } catch (e) { /* best-effort */ }
    });

    if (stderrStream) stderrStream.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stderr = appendWithCap(stderr, chunk);
      try {
        const lines = chunk.split(/\r?\n/);
        for (const ln of lines) {
          if (ln.length === 0) continue;
          socketService.broadcast('builder:log', { jobId, stream: 'stderr', line: ln, time: new Date().toISOString() });
          appendJobLog(jobId, 'stderr', ln);
          if (jobLogFd) jobLogFd.write(`${new Date().toISOString()} [STDERR] ${ln}\n`);
        }
      } catch (e) { /* best-effort */ }
    });

    let outFd: fs.WriteStream | null = null;
    let errFd: fs.WriteStream | null = null;
    try {
      if (logDir) {
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        outFd = fs.createWriteStream(path.join(logDir, `${Date.now()}-stdout.log`));
        errFd = fs.createWriteStream(path.join(logDir, `${Date.now()}-stderr.log`));
        if (stdoutStream) stdoutStream.pipe(outFd);
        if (stderrStream) stderrStream.pipe(errFd);
      }
    } catch (e) { /* best-effort logging */ }

    const timer = timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          try {
            // use treeKill for cross-platform process tree termination
            if (proc.pid) treeKill(proc.pid, 'SIGTERM');
          } catch (e) { try { proc.kill(); } catch { /* ignore */ } }
          reject(new Error(`Process timed out after ${timeoutMs / 1000}s`));
        }, timeoutMs)
      : null;

    proc.on('close', (code) => {
      if (timer) clearTimeout(timer);
      const idx = activeProcesses.findIndex((a) => a.proc === proc);
      if (idx >= 0) activeProcesses.splice(idx, 1);
      try { if (outFd) outFd.end(); if (errFd) errFd.end(); if (jobLogFd) jobLogFd.end(); } catch {}
      if (timedOut) return;
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr.trim() || `Process exited with code ${code}`));
    });

    proc.on('error', (err) => {
      if (timer) clearTimeout(timer);
      const idx = activeProcesses.findIndex((a) => a.proc === proc);
      if (idx >= 0) activeProcesses.splice(idx, 1);
      try { if (outFd) outFd.end(); if (errFd) errFd.end(); if (jobLogFd) jobLogFd.end(); } catch {}
      reject(err);
    });
  });
}

function checkCancelled(): boolean {
  if (buildState.cancelled) {
    setProgress('cancelled', 'Build cancelled', true, 'Build was cancelled by user', buildState.progress?.appName, buildState.progress?.jobId);
    return true;
  }
  return false;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeReplacement(s: string): string {
  return s.replace(/\$/g, '$$$$');
}

function escapeSmaliString(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:\"/\\|?*\x00-\x1f]/g, '_').trim() || 'app';
}

function encodeRFC5987(str: string): string {
  // 使用 RFC 5987 编码，仅保留 ASCII 字母、数字和某些安全字符
  return encodeURIComponent(str).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function getSmaliFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) results.push(...getSmaliFiles(fullPath));
      else if (entry.name.endsWith('.smali')) results.push(fullPath);
    }
  } catch { /* ignore */ }
  return results;
}

function cleanupDir(dir: string): void {
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch { /* ignore */ }
}

// Normalize AndroidManifest.xml: try a robust XML reserialize first, fallback to a regex that adds ="true" to bare android:* attrs
async function normalizeManifest(manifestPath: string, jobId?: number): Promise<boolean> {
  try {
    if (!fs.existsSync(manifestPath)) return false;
    const raw = fs.readFileSync(manifestPath, 'utf8');

    // Try robust XML reserialize with fast-xml-parser
    try {
      const fxp = await import('fast-xml-parser');
      const XMLParser = fxp.XMLParser;
      const XMLBuilder = fxp.XMLBuilder;
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', removeNSPrefix: false, parseAttributeValue: false, parseTagValue: false } as any);
      const parsed = parser.parse(raw) as any;
      const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '', format: true, suppressEmptyNode: true } as any);
      const out = builder.build(parsed);
      if (out && out.trim().length > 0) {
        try { fs.copyFileSync(manifestPath, manifestPath + '.bak.normalize'); } catch {}
        fs.writeFileSync(manifestPath, out, 'utf8');
        appendJobLog(jobId, 'info', 'Normalized AndroidManifest.xml with fast-xml-parser');
        return true;
      }
    } catch (e) {
      appendJobLog(jobId, 'stderr', `fast-xml-parser normalize failed: ${e?.message || String(e)}`);
    }

    // Fallback: add ="true" to bare android:* attributes in start-tags only
    try {
      const before = raw;
      const fixed = before.replace(/(\s)(android:(?!xmlns)[A-Za-z0-9_.:-]+)(?=(\s|\/|>))/g, (_m, ws, attr) => `${ws}${attr}="true"`);
      if (fixed !== before) {
        try { fs.copyFileSync(manifestPath, manifestPath + '.bak.normalize2'); } catch {}
        fs.writeFileSync(manifestPath, fixed, 'utf8');
        appendJobLog(jobId, 'info', 'Normalized AndroidManifest.xml with regex fallback');
        return true;
      }
    } catch (e) {
      appendJobLog(jobId, 'stderr', `manifest regex normalize failed: ${String(e)}`);
    }

    return false;
  } catch (err: any) {
    appendJobLog(jobId, 'stderr', `normalizeManifest exception: ${err?.message || String(err)}`);
    return false;
  }
}

function killAllProcesses(): void {
  for (const entry of activeProcesses) {
    const proc = entry.proc;
    try {
      if (proc.pid) {
        try { treeKill(proc.pid, 'SIGTERM'); } catch { /* ignore */ }
      } else {
        try { proc.kill('SIGTERM'); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }
  activeProcesses.length = 0;
}

function killProcessesForJob(jobId: number): void {
  for (let i = activeProcesses.length - 1; i >= 0; i--) {
    const entry = activeProcesses[i];
    if (entry.jobId === jobId) {
      try {
        if (entry.proc.pid) {
          try { treeKill(entry.proc.pid, 'SIGTERM'); } catch { entry.proc.kill('SIGTERM'); }
        } else {
          try { entry.proc.kill('SIGTERM'); } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
      activeProcesses.splice(i, 1);
    }
  }
}

async function patchApk(decompilePath: string, serverUrl: string, homePageUrl: string, bootstrapToken: string, appName: string, packageName: string, versionName: string, iconBuffer: Buffer | null, adbAssistBypassEnabled: boolean, jobId?: number): Promise<void> {
  if (!fs.existsSync(decompilePath)) throw new Error('Decompiled APK directory not found');

  const smaliDirs = fs.readdirSync(decompilePath).filter(d => d.startsWith('smali'));
  let serverPatched = 0;
  let homePatched = 0;
  let tokenPatched = 0;
  let packagePatched = 0;
  const safeServerUrl = escapeReplacement(escapeSmaliString(serverUrl));
  const safeHomeUrl = escapeReplacement(escapeSmaliString(homePageUrl));
  const safeBootstrapToken = escapeSmaliString(bootstrapToken);

  for (const dir of smaliDirs) {
    const smaliDir = path.join(decompilePath, dir);
    for (const file of getSmaliFiles(smaliDir)) {
      let content = fs.readFileSync(file, 'utf-8');
      let modified = false;

      // Prefer structured smali patching helper
      try {
        const { patchSmaliContent } = await import('../utils/smali.js');
        const res = patchSmaliContent(content, { serverUrl, homeUrl: homePageUrl, bootstrapToken, packageName, defaultServer: DEFAULT_SERVER_URL, defaultHome: DEFAULT_HOME_URL });
        if (res.modified) {
          content = res.content;
          serverPatched += res.counts.serverPatched;
          homePatched += res.counts.homePatched;
          tokenPatched += res.counts.tokenPatched;
          packagePatched += res.counts.packagePatched;
          modified = true;
        }
      } catch (e) { /* best-effort smali helper; fall back to regex below */ }

      const serverFieldPattern = /\.field\s+[^\n]*\bSERVER_HOST:Ljava\/lang\/String;[^\n]*=\s"[^"]*"/g;
      if (serverFieldPattern.test(content)) {
        content = content.replace(/\.field\s+[^\n]*\bSERVER_HOST:Ljava\/lang\/String;[^\n]*=\s"[^"]*"/g, (match) => match.replace(/"[^"]*"/, `"${safeServerUrl}"`));
        modified = true; serverPatched++;
      }

      const homeFieldPattern = /\.field\s+[^\n]*\bHOME_PAGE_URL:Ljava\/lang\/String;[^\n]*=\s"[^"]*"/g;
      if (homeFieldPattern.test(content)) {
        content = content.replace(/\.field\s+[^\n]*\bHOME_PAGE_URL:Ljava\/lang\/String;[^\n]*=\s"[^"]*"/g, (match) => match.replace(/"[^"]*"/, `"${safeHomeUrl}"`));
        modified = true; homePatched++;
      }

      const tokenFieldPattern = /\.field\s+[^\n]*\bBOOTSTRAP_TOKEN:Ljava\/lang\/String;[^\n]*=\s"[^"]*"/g;
      if (tokenFieldPattern.test(content)) {
        content = content.replace(tokenFieldPattern, (match) => match.replace(/"[^"]*"/, `"${safeBootstrapToken}"`));
        modified = true; tokenPatched++;
      }

      const tokenInitializerPattern = /(const-string(?:\/jumbo)?\s+)([vp]\d+),\s*"(?:\\.|[^"\\])*"(\s+sput-object\s+\2,\s+Lcom\/(?:liuma|fason)\/app\/core\/config\/Config;->BOOTSTRAP_TOKEN:Ljava\/lang\/String;)/g;
      if (tokenInitializerPattern.test(content)) {
        content = content.replace(tokenInitializerPattern, (_match, instruction, register, assignment) =>
          `${instruction}${register}, "${safeBootstrapToken}"${assignment}`
        );
        modified = true; tokenPatched++;
      }

      const serverConst = new RegExp(`(const-string\\s+v\\d+,\\s*\")${escapeRegex(DEFAULT_SERVER_URL)}(\")`, 'g');
      if (serverConst.test(content)) {
        content = content.replace(serverConst, `$1${safeServerUrl}$2`);
        modified = true; serverPatched++;
      }

      const homeConst = new RegExp(`(const-string\\s+v\\d+,\\s*\")${escapeRegex(DEFAULT_HOME_URL)}(\")`, 'g');
      if (homeConst.test(content)) {
        content = content.replace(homeConst, `$1${safeHomeUrl}$2`);
        modified = true; homePatched++;
      }

      if (content.includes(DEFAULT_SERVER_URL)) {
        content = content.replace(new RegExp(escapeRegex(DEFAULT_SERVER_URL), 'g'), safeServerUrl);
        modified = true; serverPatched++;
      }
      if (content.includes(DEFAULT_HOME_URL)) {
        content = content.replace(new RegExp(escapeRegex(DEFAULT_HOME_URL), 'g'), safeHomeUrl);
        modified = true; homePatched++;
      }

      if (content.includes(`L${DEFAULT_PACKAGE_NAME.replace(/\./g, '/')};`)) {
        const oldPackagePath = DEFAULT_PACKAGE_NAME.replace(/\./g, '/');
        const newPackagePath = packageName.replace(/\./g, '/');
        const packagePattern = new RegExp(`L${escapeRegex(oldPackagePath)};`, 'g');
        content = content.replace(packagePattern, `L${newPackagePath};`);
        modified = true;
        packagePatched++;
      }

      if (content.includes('ENABLE_ADB_ASSIST_BYPASS')) {
        const updatedSmali = patchAdbAssistBypassSmali(content, adbAssistBypassEnabled);
        if (updatedSmali !== content) {
          content = updatedSmali;
          modified = true;
        }
      }

      if (modified) fs.writeFileSync(file, content);
    }
  }

  log.info(`[Builder] Smali patching: SERVER(${serverPatched}) HOME(${homePatched}) BOOTSTRAP_TOKEN(${tokenPatched}) PACKAGE(${packagePatched})`);
  let xmlPatched = false;
  try {
    const { updateStringsXml, updateManifestXml } = await import('../utils/xml.js');
    const stringsPath = path.join(decompilePath, 'res', 'values', 'strings.xml');
    if (fs.existsSync(stringsPath)) {
      try { xmlPatched = (await updateStringsXml(stringsPath, appName)) || xmlPatched; } catch {}
    }
    const manifestPath = path.join(decompilePath, 'AndroidManifest.xml');
    if (fs.existsSync(manifestPath)) {
      try { xmlPatched = (await updateManifestXml(manifestPath, packageName, versionName)) || xmlPatched; } catch {}
    }
  } catch (err: any) {
    log.warn(`[Builder] XML patch helper failed: ${err?.message || String(err)}`);
  }
  if (serverPatched === 0) throw new Error('APK patch failed: server URL marker not found');
  if (homePatched === 0) throw new Error('APK patch failed: home URL marker not found');
  if (tokenPatched === 0) throw new Error('APK patch failed: bootstrap token initializer not found');

  const stringsPath = path.join(decompilePath, 'res', 'values', 'strings.xml');
  if (fs.existsSync(stringsPath)) {
    let strings = fs.readFileSync(stringsPath, 'utf-8');
    strings = strings.replace(/<string\s+name="app_name">[^<]*<\/string>/, `<string name="app_name">${escapeXml(appName)}</string>`);
    fs.writeFileSync(stringsPath, strings);
  }

  const manifestPath = path.join(decompilePath, 'AndroidManifest.xml');
  if (fs.existsSync(manifestPath)) {
    let manifest = fs.readFileSync(manifestPath, 'utf-8');
    const packageMatch = /<manifest\b[^>]*\bpackage="([^"]*)"/.exec(manifest);
    if (!packageMatch) {
      throw new Error('AndroidManifest.xml does not contain a package attribute');
    }
    manifest = manifest.replace(/(<manifest\b[^>]*\bpackage=")([^"]*)(")/, `$1${escapeXml(packageName)}$3`);
    if (/android:versionName="[^"]*"/.test(manifest)) {
      manifest = manifest.replace(/android:versionName="[^"]*"/, `android:versionName="${escapeXml(versionName)}"`);
    } else {
      manifest = manifest.replace(/<manifest\b/, `<manifest android:versionName="${escapeXml(versionName)}"`);
    }
    fs.writeFileSync(manifestPath, manifest);
    log.info(`[Builder] AndroidManifest.xml patched with package: ${packageName} and versionName: ${versionName}`);
  }

  const oldPackagePath = DEFAULT_PACKAGE_NAME.replace(/\./g, '/');
  const newPackagePath = packageName.replace(/\./g, '/');
  for (const dir of smaliDirs) {
    const smaliDir = path.join(decompilePath, dir);
    const oldPath = path.join(smaliDir, oldPackagePath);
    const newPath = path.join(smaliDir, newPackagePath);
    if (fs.existsSync(oldPath) && oldPath !== newPath) {
      try {
        fs.renameSync(oldPath, newPath);
        log.info(`[Builder] Renamed smali directory from ${oldPath} to ${newPath}`);
      } catch (err: any) {
        log.warn(`[Builder] Failed to rename directory: ${err.message}`);
      }
    }
  }

  const resPath = path.join(decompilePath, 'res');
  for (const stale of ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi']) {
    cleanupDir(path.join(resPath, stale));
  }

  if (iconBuffer) {
    log.info('[Builder] Patching app icon...');
    const ADAPTIVE_SIZE = 432;
    const SAFE_ZONE = 288;
    const mipmapDir = path.join(resPath, 'mipmap-xxxhdpi');
    if (!fs.existsSync(mipmapDir)) fs.mkdirSync(mipmapDir, { recursive: true });

    try {
      const resized = await sharp(iconBuffer).resize(ADAPTIVE_SIZE, ADAPTIVE_SIZE, { fit: 'cover', position: 'center' }).png().toBuffer();
      fs.writeFileSync(path.join(mipmapDir, 'ic_launcher.png'), resized);
    } catch (err: any) { log.warn(`[Builder] Failed to resize mipmap icon: ${err.message}`); }

    try {
      const resizedIcon = await sharp(iconBuffer).resize(SAFE_ZONE, SAFE_ZONE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
      await sharp({ create: { width: ADAPTIVE_SIZE, height: ADAPTIVE_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([{ input: resizedIcon, gravity: 'center' }])
        .png()
        .toFile(path.join(mipmapDir, 'ic_launcher_foreground.png'));
    } catch (err: any) { log.warn(`[Builder] Failed to generate adaptive foreground: ${err.message}`); }

    try {
      const borderSample = await sharp(iconBuffer).resize(64, 64, { fit: 'cover' }).raw().toBuffer();
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          const idx = (y * 64 + x) * 4;
          if (borderSample[idx + 3] > 128) {
            rSum += borderSample[idx];
            gSum += borderSample[idx + 1];
            bSum += borderSample[idx + 2];
            count++;
          }
        }
      }
      const bgR = count > 0 ? Math.round(rSum / count) : 255;
      const bgG = count > 0 ? Math.round(gSum / count) : 255;
      const bgB = count > 0 ? Math.round(bSum / count) : 255;

      await sharp({ create: { width: ADAPTIVE_SIZE, height: ADAPTIVE_SIZE, channels: 4, background: { r: bgR, g: bgG, b: bgB, alpha: 255 } } })
        .png()
        .toFile(path.join(mipmapDir, 'ic_launcher_background.png'));
      log.info(`[Builder] Adaptive background color: rgb(${bgR}, ${bgG}, ${bgB})`);
    } catch (err: any) { log.warn(`[Builder] Failed to generate adaptive background: ${err.message}`); }

    for (const stale of ['drawable-mdpi', 'drawable-hdpi', 'drawable-xhdpi', 'drawable-xxhdpi', 'drawable-xxxhdpi']) {
      const staleDir = path.join(resPath, stale);
      if (fs.existsSync(staleDir)) {
        try {
          const dirFiles = fs.readdirSync(staleDir);
          if (dirFiles.every(f => f.startsWith('ic_launcher_'))) cleanupDir(staleDir);
        } catch { /* ignore */ }
      }
    }

    const adaptiveIconXml = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@mipmap/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>`;
    const anydpiDir = fs.existsSync(path.join(resPath, 'mipmap-anydpi-v26'))
      ? 'mipmap-anydpi-v26'
      : fs.existsSync(path.join(resPath, 'mipmap-anydpi'))
        ? 'mipmap-anydpi'
        : null;
    if (anydpiDir) {
      const adaptiveIconPath = path.join(resPath, anydpiDir, 'ic_launcher.xml');
      if (fs.existsSync(adaptiveIconPath)) fs.writeFileSync(adaptiveIconPath, adaptiveIconXml);
      const roundIconPath = path.join(resPath, anydpiDir, 'ic_launcher_round.xml');
      if (fs.existsSync(roundIconPath)) fs.writeFileSync(roundIconPath, adaptiveIconXml);
    }
    log.info('[Builder] Icon patched successfully');
  }
}

async function buildApkAsync(serverUrl: string, homePageUrl: string, bootstrapToken: string, enrollmentId: string, appName: string, packageName: string, versionName: string, iconBuffer: Buffer | null, adbAssistBypassMode: AdbAssistBypassMode, jobId?: number): Promise<void> {
  let buildDir: string | null = null;
  let buildCompleted = false;

  try {
    setProgress('checking', 'Checking build prerequisites...', false, null, appName, jobId);

    try {
      const { stderr } = await runProcess('java', ['-version'], 10000, undefined, jobId, jobId ? getJobLogPath(jobId) : undefined);
      log.info(`[Builder] Java found: ${stderr.split('\n')[0]}`);
    } catch {
      setProgress('checking', 'Java not found', true, 'Java Runtime is required but not installed.', appName, jobId);
      return;
    }

    if (checkCancelled()) return;

    if (!fs.existsSync(paths.baseApkPath)) { setProgress('checking', 'Base APK not found', true, `Base APK not found at: ${paths.baseApkPath}`, appName, jobId); return; }
    if (!fs.existsSync(paths.apkToolPath)) { setProgress('checking', 'apktool.jar not found', true, `apktool.jar not found at: ${paths.apkToolPath}`, appName, jobId); return; }
    if (!fs.existsSync(paths.signerPath)) { setProgress('checking', 'uber-apk-signer.jar not found', true, `uber-apk-signer.jar not found at: ${paths.signerPath}`, appName, jobId); return; }

    ensureDataDir();
    buildDir = createBuildDir();
    const decompilePath = path.join(buildDir, 'decompiled');
    const outputApk = path.join(buildDir, 'build.apk');

    // Prepare per-job combined log file
    const jobLogFile = typeof jobId === 'number' ? getJobLogPath(jobId) : undefined;
    if (jobLogFile) {
      try { fs.appendFileSync(jobLogFile, `${new Date().toISOString()} [INFO] Build job ${jobId} started\n`); } catch {}
    }

    if (checkCancelled()) return;

    // Mark job as started in DB if we have a jobId
    if (typeof jobId === 'number') {
      try {
        const d = getDb();
        d.update(buildRecords).set({ status: 'started' }).where(eq(buildRecords.id, jobId)).run();
      } catch (e) {
        log.warn(`[Builder] Failed to mark job ${jobId} as started: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    setProgress('decompiling', 'Decompiling base APK with apktool...', false, null, appName, jobId);
    await runProcess('java', ['-jar', paths.apkToolPath, 'd', paths.baseApkPath, '-o', decompilePath, '-f'], 180000, buildDir, jobId, jobLogFile);

    if (checkCancelled()) return;

    setProgress('patching', `Patching APK — Server: ${serverUrl}, Name: ${appName}, Package: ${packageName}, Version: ${versionName}, ADB bypass: ${adbAssistBypassMode}...`, false, null, appName, jobId);
    await patchApk(decompilePath, serverUrl, homePageUrl, bootstrapToken, appName, packageName, versionName, iconBuffer, adbAssistBypassMode === 'enabled', jobId);

    // Defensive manifest sanitization: add ="true" for bare android:* attrs inside common start tags
    try {
      const manifestPathSanitize = path.join(decompilePath, 'AndroidManifest.xml');
      if (fs.existsSync(manifestPathSanitize)) {
        let manifestContent = fs.readFileSync(manifestPathSanitize, 'utf-8');
        const beforeSanitize = manifestContent;

        // First, patch the <application ...> start tag (targeted)
        const appTagMatch = manifestContent.match(/<application\b[^>]*>/is);
        if (appTagMatch && appTagMatch[0]) {
          const originalAppTag = appTagMatch[0];
          const patchedAppTag = originalAppTag.replace(/(\s)(android:(?!xmlns)[A-Za-z0-9_.:-]+)(?=(\s|\/|>))/g, (m2, ws, attr) => `${ws}${attr}="true"`);
          if (patchedAppTag !== originalAppTag) {
            try { fs.copyFileSync(manifestPathSanitize, manifestPathSanitize + '.bak.sanitize'); } catch {}
            manifestContent = manifestContent.replace(originalAppTag, patchedAppTag);
          }
        }

        // Then patch other start tags (activity, service, receiver, provider, etc.) by scanning all opening tags
        const startTagRegex = /<([A-Za-z_][\\w:.\-]*)([^>]*)>/gs;
        manifestContent = manifestContent.replace(startTagRegex, (full, tagName, attrs) => {
          if (!attrs) return full;
          // skip xml declaration, comments and DOCTYPE
          if (full.startsWith('<?') || full.startsWith('<!')) return full;
          const newAttrs = attrs.replace(/(\s)(android:(?!xmlns)[A-Za-z0-9_.:-]+)(?=(\s|\/|>))/g, (m2, ws, attr) => `${ws}${attr}="true"`);
          if (newAttrs !== attrs) {
            return full.replace(attrs, newAttrs);
          }
          return full;
        });

        if (manifestContent !== beforeSanitize) {
          try { fs.copyFileSync(manifestPathSanitize, manifestPathSanitize + '.bak.sanitize2'); } catch {}
          fs.writeFileSync(manifestPathSanitize, manifestContent, 'utf-8');
          log.info(`[Builder] Sanitized AndroidManifest.xml: patched bare android:* attributes in start-tags (job:${jobId})`);
          appendJobLog(jobId, 'info', 'Sanitized AndroidManifest.xml: patched bare android:* attributes in start-tags');
        }
      }
    } catch (err: any) {
      log.warn(`[Builder] Manifest sanitization failed: ${err?.message || String(err)}`);
      appendJobLog(jobId, 'stderr', `Manifest sanitization failed: ${err?.message || String(err)}`);
    }

    if (checkCancelled()) return;

    setProgress('building', 'Rebuilding APK with apktool...', false, null, appName, jobId);
    try {
      await runProcess('java', ['-jar', paths.apkToolPath, 'b', decompilePath, '-o', outputApk], 300000, buildDir, jobId, jobLogFile);
    } catch (err: any) {
      const msg = String(err.message || err || '');
      if (/not well-formed|invalid token|must be followed by the\s*' = '/i.test(msg)) {
        appendJobLog(jobId, 'info', 'apktool build failed due to malformed manifest — attempting normalization and retry');
        // try to normalize manifest and retry once
        try { await normalizeManifest(path.join(decompilePath, 'AndroidManifest.xml'), jobId); } catch (e) { appendJobLog(jobId, 'stderr', `normalizeManifest failed: ${String(e)}`); }
        // retry once
        await runProcess('java', ['-jar', paths.apkToolPath, 'b', decompilePath, '-o', outputApk], 300000, buildDir, jobId, jobLogFile);
      } else {
        throw err;
      }
    }

    if (checkCancelled()) return;

    setProgress('signing', 'Signing APK with uber-apk-signer...', false, null, appName, jobId);
    try {
      await runProcess('java', ['-jar', paths.signerPath, '--apks', outputApk, '--overwrite'], 180000, buildDir, jobId, jobLogFile);
    } catch (errSign) {
      appendJobLog(jobId, 'stderr', `uber-apk-signer failed: ${String(errSign)}`);
      log.warn(`[Builder] uber-apk-signer failed for job ${jobId}: ${String(errSign)}`);
      const debugKeystore = process.env.DEBUG_KEYSTORE || path.join('C:', 'tools', 'debug.jks');
      if (fs.existsSync(debugKeystore)) {
        setProgress('signing', 'uber-apk-signer failed — falling back to jarsigner with debug keystore', false, null, appName, jobId);
        try {
          await runProcess('jarsigner', ['-verbose', '-keystore', debugKeystore, '-storepass', 'android', '-keypass', 'android', outputApk, 'liuma-debug', '-sigalg', 'SHA256withRSA', '-digestalg', 'SHA-256'], 120000, buildDir, jobId, jobLogFile);
        } catch (err2) {
          appendJobLog(jobId, 'stderr', `jarsigner fallback failed: ${String(err2)}`);
          throw new Error(`Signing failed (uber-apk-signer err: ${String(errSign)}; jarsigner err: ${String(err2)})`);
        }
      } else {
        appendJobLog(jobId, 'stderr', 'Debug keystore not found for jarsigner fallback, signing failed');
        throw errSign;
      }
    }

    const signedApk = path.join(buildDir, 'build-aligned-debugSigned.apk');
    let apkToRead: string;
    if (fs.existsSync(signedApk)) {
      apkToRead = signedApk;
    } else {
      apkToRead = outputApk;
    }
    if (!fs.existsSync(apkToRead)) throw new Error('Built APK file not found after signing');

    const apkData = fs.readFileSync(apkToRead);

    // Embed signed build meta INTO THE DECOMPILED ASSETS so apktool includes it in the rebuilt APK
    try {
      if (typeof jobId === 'number') {
        try {
          const d = getDb();
          const buildRow = d.select({ creatorId: buildRecords.creatorId }).from(buildRecords).where(eq(buildRecords.id, jobId)).get();
          const creatorId = buildRow?.creatorId ?? null;
          const ts = new Date().toISOString();
          const secret = (process.env.BUILDER_META_SECRET || '').trim();
          if (secret && secret.length >= 16) {
            const sig = crypto.createHmac('sha256', secret).update(`${jobId}:${creatorId ?? ''}:${ts}`).digest('hex');
            const metaObj = { buildId: jobId, creatorId, ts, sig };
            const assetsDir = path.join(decompilePath, 'assets');
            try {
              if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
              fs.writeFileSync(path.join(assetsDir, 'liuma_build_meta.json'), JSON.stringify(metaObj), 'utf8');
              appendJobLog(jobId, 'info', 'Wrote liuma_build_meta.json into decompiled assets');
              log.info(`[Builder] Embedded build meta into decompiled assets for job ${jobId}`);
            } catch (err: any) {
              appendJobLog(jobId, 'stderr', `Failed to write build meta into decompiled assets: ${String(err)}`);
              log.warn(`[Builder] Failed to write build meta into decompiled assets for job ${jobId}: ${String(err)}`);
            }
          } else {
            appendJobLog(jobId, 'info', 'BUILDER_META_SECRET not set; skipping build meta embedding into decompiled assets');
            log.info('[Builder] BUILDER_META_SECRET not set; skipping embedding build meta into decompiled assets');
          }
        } catch (err: any) {
          appendJobLog(jobId, 'stderr', `Failed to construct build meta: ${String(err)}`);
          log.warn(`[Builder] Failed to construct build meta for job ${jobId}: ${String(err)}`);
        }
      }
    } catch (e) { /* non-fatal */ }
    const fileSize = apkData.length;
    log.info(`[Builder] Signed APK ready (${(fileSize / 1024 / 1024).toFixed(2)} MB), storing in database...`);

    if (fileSize === 0) {
      throw new Error('APK file is empty after signing');
    }

    const d = getDb();

    // Update the existing build record with the completed APK
    if (typeof jobId === 'number') {
      try {
        d.update(buildRecords).set({
          status: 'completed',
          apkData,
          fileSize,
          completedAt: new Date().toISOString(),
        }).where(eq(buildRecords.id, jobId)).run();
      } catch (e) {
        throw new Error(`Failed to save APK to database: ${String(e)}`);
      }
    } else {
      // Fallback: insert a completed record if no jobId was provided
      const RETAIN_BUILDS = 5;
      d.run(sql`DELETE FROM build_records WHERE id NOT IN (SELECT id FROM build_records ORDER BY id DESC LIMIT ${RETAIN_BUILDS})`);
      const result = d.insert(buildRecords).values({
        serverUrl, homePageUrl, appName,
        status: 'completed',
        apkData,
        fileSize,
        completedAt: new Date().toISOString(),
        creatorId: ((request as any).user && (request as any).user.userId) ? (request as any).user.userId : null,
      }).run();
      if (!result.lastInsertRowid) throw new Error('Failed to save APK to database');
      log.info(`[Builder] APK successfully saved to database (ID: ${result.lastInsertRowid})`);
    }

    // Verify data was saved correctly by reading it back (prefer jobId)
    const verifyId = typeof jobId === 'number' ? jobId : undefined;
    let verifyRecord;
    if (verifyId) {
      verifyRecord = d.select({ apkData: buildRecords.apkData, fileSize: buildRecords.fileSize })
        .from(buildRecords)
        .where(eq(buildRecords.id, verifyId))
        .get();
    } else {
      verifyRecord = d.select({ apkData: buildRecords.apkData, fileSize: buildRecords.fileSize })
        .from(buildRecords)
        .orderBy(desc(buildRecords.id))
        .limit(1)
        .get();
    }

    if (!verifyRecord || !verifyRecord.apkData) {
      throw new Error('Failed to verify APK data was saved to database');
    }

    const savedBuffer = Buffer.from(verifyRecord.apkData as Uint8Array);
    if (savedBuffer.length === 0) {
      throw new Error('Saved APK data is empty, verification failed');
    }

    if (savedBuffer.length !== fileSize) {
      log.warn(`[Builder] File size mismatch: expected ${fileSize}, got ${savedBuffer.length}`);
    }

    log.info(`[Builder] APK data verified successfully (${(savedBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
    buildCompleted = true;

    // Trim to the most recent 5 build records (post-save)
    try {
      const RETAIN_BUILDS = 5;
      d.run(sql`DELETE FROM build_records WHERE id NOT IN (SELECT id FROM build_records ORDER BY id DESC LIMIT ${RETAIN_BUILDS})`);
    } catch (e) {
      log.warn(`[Builder] Failed to trim old builds: ${String(e)}`);
    }

    cleanupDir(buildDir);
    buildDir = null;

    setProgress('signing', 'Build completed successfully!', true, null, appName, jobId);
  } catch (err: any) {
    if (buildState.cancelled) {
      setProgress('checking', 'Build cancelled', true, 'Build was cancelled by user', appName, jobId);
    } else {
      const errMsg = err.message || 'Unknown build error';
      log.error(`[Builder] Build failed: ${errMsg}`);
      setProgress('signing', `Build failed: ${errMsg}`, true, errMsg, appName, jobId);
    }

    // Update build record to failed/cancelled
    if (typeof jobId === 'number') {
      try {
        const d = getDb();
        d.update(buildRecords).set({ status: buildState.cancelled ? 'cancelled' : 'failed', completedAt: new Date().toISOString() }).where(eq(buildRecords.id, jobId)).run();
      } catch (e) {
        log.warn(`[Builder] Failed to update build status to failed/cancelled for job ${jobId}: ${String(e)}`);
      }
    }
  } finally {
    if (!buildCompleted) {
      try { revokeEnrollment(enrollmentId); }
      catch (err: unknown) { log.warn(`[Builder] Failed to revoke unused enrollment: ${err instanceof Error ? err.message : String(err)}`); }
    }
    killAllProcesses();
    if (buildDir) cleanupDir(buildDir);
    buildState.inProgress = false;
    buildState.cancelled = false;
  }
}

export async function builderRoutes(app: FastifyInstance) {
  const builderAccess = [app.auth, requirePermission('builder:access')];

  app.post('/api/builder/build', {
    preHandler: builderAccess,
  }, async (request, reply) => {
    if (buildState.inProgress) {
      return reply.code(409).send({ success: false, error: 'A build is already in progress' });
    }

    let serverUrl = DEFAULT_SERVER_URL;
    let homePageUrl = DEFAULT_HOME_URL;
    let appName = 'Лиума';
    let packageName = DEFAULT_PACKAGE_NAME;
    let versionName = '1.0.0';
    let iconBuffer: Buffer | null = null;
    let adbAssistBypassMode: AdbAssistBypassMode = 'disabled';

    try {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'field') {
          const field = part as { fieldname: string; value: string };
          switch (field.fieldname) {
            case 'serverUrl': serverUrl = String(field.value) || DEFAULT_SERVER_URL; break;
            case 'homePageUrl': homePageUrl = String(field.value) || DEFAULT_HOME_URL; break;
            case 'appName': appName = String(field.value) || 'Лиума'; break;
            case 'packageName': packageName = String(field.value) || DEFAULT_PACKAGE_NAME; break;
            case 'versionName': versionName = String(field.value) || '1.0.0'; break;
            case 'adbAssistBypassMode': adbAssistBypassMode = getAdbAssistBypassMode(field.value); break;
          }
        } else if (part.type === 'file') {
          const file = part as { fieldname: string; toBuffer: () => Promise<Buffer> };
          if (file.fieldname === 'appIcon') {
            try {
              iconBuffer = await file.toBuffer();
              if (iconBuffer.length > MAX_ICON_SIZE) {
                return reply.code(400).send({ success: false, error: `Icon file too large (${(iconBuffer.length / 1024 / 1024).toFixed(1)}MB). Maximum is 5MB.` });
              }
              log.info(`[Builder] Icon uploaded: ${iconBuffer.length} bytes`);
            } catch (err: any) {
              log.warn(`[Builder] Failed to read icon file: ${err.message}`);
            }
          }
        }
      }
    } catch (err: any) {
      log.warn(`[Builder] Failed to parse form data: ${err.message}`);
      return reply.code(400).send({ success: false, error: 'Failed to parse form data' });
    }

    serverUrl = serverUrl.trim();
    homePageUrl = homePageUrl.trim();
    packageName = packageName.trim();
    versionName = versionName.trim();
    if (!serverUrl.match(/^https?:\/\/.+/)) return reply.code(400).send({ success: false, error: 'Invalid server URL' });
    if (!homePageUrl.match(/^https?:\/\/.+/)) return reply.code(400).send({ success: false, error: 'Invalid home page URL' });
    if (!appName || appName.trim().length === 0) return reply.code(400).send({ success: false, error: 'App name is required' });
    if (appName.trim().length > MAX_APP_NAME_LENGTH) return reply.code(400).send({ success: false, error: `App name must be ${MAX_APP_NAME_LENGTH} characters or less` });
    if (!packageName) return reply.code(400).send({ success: false, error: 'Package name is required' });
    if (!PACKAGE_NAME_REGEX.test(packageName)) {
      return reply.code(400).send({
        success: false,
        error: `Invalid package name "${packageName}". Must be lowercase, use only letters/digits/underscores, and include at least two dot-separated segments like com.example.app.`,
      });
    }
    if (!versionName) return reply.code(400).send({ success: false, error: 'Version name is required' });
    if (!VERSION_NAME_REGEX.test(versionName)) {
      return reply.code(400).send({ success: false, error: `Invalid version name "${versionName}". Use numeric segments and optional suffix, for example 1.0.0 or 1.0.0-alpha.`, });
    }

    appName = appName.trim();
    packageName = packageName.trim();
    adbAssistBypassMode = getAdbAssistBypassMode(adbAssistBypassMode);
    const enrollment = createPendingEnrollment(appName);

    // Create a pending build record and return its id so the UI can track progress
    const d = getDb();
    let jobId: number | null = null;
    try {
      const insertRes = d.insert(buildRecords).values({
        serverUrl,
        homePageUrl,
        appName,
        status: 'pending',
        fileSize: 0,
        createdAt: new Date().toISOString(),
        creatorId: ((request as any).user && (request as any).user.userId) ? (request as any).user.userId : null,
      }).run();
      jobId = insertRes.lastInsertRowid as number;
      log.info(`[Builder] Created build job ${jobId} (pending)`);
    } catch (e: any) {
      log.error(`[Builder] Failed to create build job record: ${e instanceof Error ? e.message : String(e)}`);
      return reply.code(500).send({ success: false, error: 'Failed to create build job record' });
    }

    buildState.inProgress = true;
    buildState.cancelled = false;
    // Pass the jobId into the long-running build so events and DB updates can correlate
    void buildApkAsync(serverUrl, homePageUrl, enrollment.token, enrollment.id, appName, packageName, versionName, iconBuffer, adbAssistBypassMode, jobId ?? undefined).catch((err: unknown) => {
      log.error(`[Builder] Unhandled build error: ${err instanceof Error ? err.message : String(err)}`);
    });

    return { success: true, jobId };
  });

  // Cancel a specific job by id
  app.post('/api/builder/job/:id/cancel', {
    preHandler: builderAccess,
  }, async (request, reply) => {
    try {
      const id = Number((request.params as any).id);
      if (!id) return reply.code(400).send({ success: false, error: 'Invalid job id' });

      const d = getDb();
      const row = d.select().from(buildRecords).where(eq(buildRecords.id, id)).get();
      if (!row) return reply.code(404).send({ success: false, error: 'Build not found' });

      // Mark DB record cancelled and set completedAt
      try {
        d.update(buildRecords).set({ status: 'cancelled', completedAt: new Date().toISOString() }).where(eq(buildRecords.id, id)).run();
      } catch (e) {
        log.warn(`[Builder] Failed to mark job ${id} as cancelled in DB: ${String(e)}`);
      }

      // If this is the currently active job, signal cancellation
      if (buildState.progress?.jobId === id) {
        buildState.cancelled = true;
      }

      // Kill any processes associated with this job
      try { killProcessesForJob(id); } catch (e) { log.warn(`[Builder] Failed to kill processes for job ${id}: ${String(e)}`); }

      const infoLine = 'Build cancelled by user';
      socketService.broadcast('builder:log', { jobId: id, stream: 'info', line: infoLine, time: new Date().toISOString() });
      appendJobLog(id, 'info', infoLine);
      socketService.broadcast('builder:progress', { step: 'cancelled', message: 'Build cancelled', complete: true, error: 'Cancelled', time: new Date().toISOString(), jobId: id });

      return { success: true, jobId: id };
    } catch (err: any) {
      log.error(`[Builder] Cancel job error: ${err.message}`);
      return reply.code(500).send({ success: false, error: 'Failed to cancel job' });
    }
  });

  // Retry a job: clone minimal parameters and start a new build
  app.post('/api/builder/job/:id/retry', {
    preHandler: builderAccess,
  }, async (request, reply) => {
    try {
      if (buildState.inProgress) return reply.code(409).send({ success: false, error: 'A build is already in progress' });

      const oldId = Number((request.params as any).id);
      if (!oldId) return reply.code(400).send({ success: false, error: 'Invalid job id' });

      const d = getDb();
      const old = d.select({ serverUrl: buildRecords.serverUrl, homePageUrl: buildRecords.homePageUrl, appName: buildRecords.appName })
        .from(buildRecords).where(eq(buildRecords.id, oldId)).get();
      if (!old) return reply.code(404).send({ success: false, error: 'Original build not found' });

      // Insert a new pending job using the same minimal parameters
      const insertRes = d.insert(buildRecords).values({
        serverUrl: old.serverUrl, homePageUrl: old.homePageUrl, appName: old.appName,
        status: 'pending', fileSize: 0, createdAt: new Date().toISOString(),
      }).run();
      const newJobId = insertRes.lastInsertRowid as number;
      if (!newJobId) return reply.code(500).send({ success: false, error: 'Failed to create retry job' });

      log.info(`[Builder] Retrying job ${oldId} -> new job ${newJobId}`);

      const enrollment = createPendingEnrollment(old.appName || 'Лиума');
      buildState.inProgress = true;
      buildState.cancelled = false;

      // Start build with conservative defaults for fields that weren't stored previously
      void buildApkAsync(old.serverUrl || DEFAULT_SERVER_URL, old.homePageUrl || DEFAULT_HOME_URL, enrollment.token, enrollment.id, old.appName || 'Лиума', DEFAULT_PACKAGE_NAME, '1.0.0', null, getAdbAssistBypassMode('disabled'), newJobId).catch((err: unknown) => {
        log.error(`[Builder] Unhandled build error for retry job ${newJobId}: ${err instanceof Error ? err.message : String(err)}`);
      });

      return { success: true, jobId: newJobId };
    } catch (err: any) {
      log.error(`[Builder] Retry job error: ${err.message}`);
      return reply.code(500).send({ success: false, error: 'Failed to retry job' });
    }
  });

  app.post('/api/builder/cancel', {
    preHandler: builderAccess,
  }, async (request, reply) => {
    if (!buildState.inProgress) {
      return reply.code(404).send({ success: false, error: 'No build in progress' });
    }
    buildState.cancelled = true;
    killAllProcesses();
    return { success: true, message: 'Build cancellation requested' };
  });

  app.get('/api/builder/download', {
    preHandler: builderAccess,
  }, async (request, reply) => {
    try {
      const d = getDb();
      const record = d.select({ id: buildRecords.id, appName: buildRecords.appName, apkData: buildRecords.apkData, fileSize: buildRecords.fileSize })
        .from(buildRecords)
        .where(eq(buildRecords.status, 'completed'))
        .orderBy(desc(buildRecords.id))
        .limit(1)
        .get();

      if (!record) {
        return reply.code(404).send({ success: false, error: 'No completed APK build found. Please build an APK first.' });
      }

      if (!record.apkData) {
        return reply.code(410).send({ success: false, error: 'APK data is missing or incomplete. Please rebuild the APK.' });
      }

      const apkBuffer = Buffer.from(record.apkData as Uint8Array);
      if (apkBuffer.length === 0) {
        return reply.code(410).send({ success: false, error: 'APK file is empty. Please rebuild the APK.' });
      }

      const baseName = sanitizeFileName(record.appName || 'app');
      const downloadName = baseName + '.apk';
      const encodedName = encodeRFC5987(downloadName);

      const asciiFallback = 'app.apk';

      reply.header('Content-Type', 'application/vnd.android.package-archive');
      reply.header(
        'Content-Disposition',
        `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedName}`
      );
      reply.header('Content-Length', record.fileSize || apkBuffer.length);
      log.info(`[Builder] Downloading APK: ${downloadName} (${((record.fileSize || apkBuffer.length) / 1024 / 1024).toFixed(2)} MB)`);
      return reply.send(apkBuffer);
    } catch (err: any) {
      log.error(`[Builder] Download error: ${err.message}`);
      return reply.code(500).send({ success: false, error: 'Failed to download APK: ' + (err.message || 'Unknown error') });
    }
  });

  // List recent build records (most recent first)
  app.get('/api/builder/jobs', {
    preHandler: builderAccess,
  }, async (request, reply) => {
    try {
      const d = getDb();
      const rows = d.select({
        id: buildRecords.id,
        appName: buildRecords.appName,
        serverUrl: buildRecords.serverUrl,
        status: buildRecords.status,
        fileSize: buildRecords.fileSize,
        createdAt: buildRecords.createdAt,
        completedAt: buildRecords.completedAt,
      })
        .from(buildRecords)
        .orderBy(desc(buildRecords.id))
        .limit(50)
        .all();
      return { success: true, data: rows };
    } catch (err: any) {
      log.error(`[Builder] Failed to list jobs: ${err.message}`);
      return reply.code(500).send({ success: false, error: 'Failed to list builds' });
    }
  });

  app.get('/api/builder/job/:id', {
    preHandler: builderAccess,
  }, async (request, reply) => {
    try {
      const id = Number((request.params as any).id);
      if (!id) return reply.code(400).send({ success: false, error: 'Invalid job id' });
      const d = getDb();
      const row = d.select({
        id: buildRecords.id,
        appName: buildRecords.appName,
        serverUrl: buildRecords.serverUrl,
        status: buildRecords.status,
        fileSize: buildRecords.fileSize,
        createdAt: buildRecords.createdAt,
        completedAt: buildRecords.completedAt,
      }).from(buildRecords).where(eq(buildRecords.id, id)).get();
      if (!row) return reply.code(404).send({ success: false, error: 'Build not found' });
      return { success: true, data: row };
    } catch (err: any) {
      log.error(`[Builder] Failed to get job ${ (request.params as any).id }: ${err.message}`);
      return reply.code(500).send({ success: false, error: 'Failed to fetch build' });
    }
  });

  // Return per-job combined log file (plain text or JSON tail)
  app.get('/api/builder/job/:id/log', {
    preHandler: builderAccess,
  }, async (request, reply) => {
    try {
      const id = Number((request.params as any).id);
      if (!id) return reply.code(400).send({ success: false, error: 'Invalid job id' });
      const logPath = getJobLogPath(id);
      if (!fs.existsSync(logPath)) return reply.code(404).send({ success: false, error: 'Log not found' });

      const q = (request.query as Record<string, any>) || {};
      const linesParam = q.lines ? Number(q.lines) : undefined;
      const format = (q.format as string) || (request.headers.accept && (request.headers.accept as string).includes('application/json') ? 'json' : 'text');
      const download = (q.download === '1' || q.download === 'true');

      const contents = fs.readFileSync(logPath, 'utf-8');
      const lines = contents.split(/\r?\n/).filter(Boolean);

      if (typeof linesParam === 'number' && linesParam > 0) {
        const tail = lines.slice(-linesParam);
        if (format === 'json') return { success: true, data: tail };
        reply.header('Content-Type', 'text/plain');
        return reply.send(tail.join('\n'));
      }

      if (download) {
        reply.header('Content-Disposition', `attachment; filename="build-${id}.log"`);
      }
      reply.header('Content-Type', 'text/plain');
      return reply.send(contents);
    } catch (err: any) {
      log.error(`[Builder] Fetch log error: ${err.message}`);
      return reply.code(500).send({ success: false, error: 'Failed to read build log' });
    }
  });

  app.get('/api/builder/download/:id', {
    preHandler: builderAccess,
  }, async (request, reply) => {
    try {
      const id = Number((request.params as any).id);
      if (!id) return reply.code(400).send({ success: false, error: 'Invalid job id' });
      const d = getDb();
      const record = d.select({ id: buildRecords.id, appName: buildRecords.appName, apkData: buildRecords.apkData, fileSize: buildRecords.fileSize })
        .from(buildRecords)
        .where(eq(buildRecords.id, id))
        .get();

      if (!record) return reply.code(404).send({ success: false, error: 'Build not found' });
      if (!record.apkData) return reply.code(410).send({ success: false, error: 'APK data is missing or incomplete. Please rebuild the APK.' });

      const apkBuffer = Buffer.from(record.apkData as Uint8Array);
      if (apkBuffer.length === 0) return reply.code(410).send({ success: false, error: 'APK file is empty. Please rebuild the APK.' });

      const baseName = sanitizeFileName(record.appName || 'app');
      const downloadName = baseName + '.apk';
      const encodedName = encodeRFC5987(downloadName);
      const asciiFallback = 'app.apk';
      reply.header('Content-Type', 'application/vnd.android.package-archive');
      reply.header(
        'Content-Disposition',
        `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedName}`
      );
      reply.header('Content-Length', record.fileSize || apkBuffer.length);
      log.info(`[Builder] Downloading APK: ${downloadName} (${((record.fileSize || apkBuffer.length) / 1024 / 1024).toFixed(2)} MB)`);
      return reply.send(apkBuffer);
    } catch (err: any) {
      log.error(`[Builder] Download by id error: ${err.message}`);
      return reply.code(500).send({ success: false, error: 'Failed to download APK' });
    }
  });
}
