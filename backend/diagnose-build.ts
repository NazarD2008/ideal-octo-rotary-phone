import { getDb, initDb } from './src/db/index.js';
import { buildRecords, logs } from './src/db/schema.js';
import { desc, eq } from 'drizzle-orm';

console.log('🔍 Build Records Diagnostic Report\n');
console.log('═'.repeat(80));

// Initialize database first
initDb();
const d = getDb();

// 1. 检查所有构建记录
console.log('\n📋 All Build Records:');
const allBuilds = d.select().from(buildRecords).orderBy(desc(buildRecords.id)).all();
console.log(`Total: ${allBuilds.length} records\n`);

if (allBuilds.length === 0) {
  console.log('❌ No build records found in database');
} else {
  allBuilds.forEach((record, idx) => {
    const apkDataSize = record.apkData ? (record.apkData instanceof Uint8Array ? record.apkData.byteLength : Buffer.byteLength(record.apkData as string)) : 0;
    console.log(`
${idx + 1}. Build ID: ${record.id}
   ├─ App Name: ${record.appName}
   ├─ Status: ${record.status}
   ├─ Server URL: ${record.serverUrl}
   ├─ Home Page: ${record.homePageUrl}
   ├─ APK Data Size: ${apkDataSize > 0 ? (apkDataSize / 1024 / 1024).toFixed(2) + ' MB' : '❌ EMPTY'}
   ├─ File Size in DB: ${record.fileSize || 0} bytes
   ├─ Created: ${record.createdAt}
   └─ Completed: ${record.completedAt || 'N/A'}
`);
  });
}

// 2. 检查最近的构建日志
console.log('\n📝 Recent Build Logs (Last 20):');
const recentLogs = d.select()
  .from(logs)
  .orderBy(desc(logs.id))
  .limit(20)
  .all()
  .filter(log => log.category === 'SYSTEM' || log.message.includes('[Builder]'));

if (recentLogs.length === 0) {
  console.log('No builder logs found');
} else {
  recentLogs.reverse().forEach(log => {
    const icon = log.type === 'ERROR' ? '❌' : log.type === 'WARN' ? '⚠️' : 'ℹ️';
    console.log(`${icon} [${log.createdAt}] ${log.message}`);
    if (log.details) console.log(`   Details: ${log.details}`);
  });
}

// 3. 检查是否有完成的构建（可供下载）
console.log('\n\n✅ Downloadable Builds:');
const completedBuilds = d.select()
  .from(buildRecords)
  .where(eq(buildRecords.status, 'completed'))
  .orderBy(desc(buildRecords.id))
  .all();

if (completedBuilds.length === 0) {
  console.log('❌ No completed builds available for download');
  console.log('   → Run /api/builder/build first to create an APK');
} else {
  console.log(`✅ ${completedBuilds.length} completed build(s) available`);
  const latest = completedBuilds[0];
  const apkDataSize = latest.apkData ? (latest.apkData instanceof Uint8Array ? latest.apkData.byteLength : Buffer.byteLength(latest.apkData as string)) : 0;
  console.log(`   → Latest: ID ${latest.id} - ${latest.appName} (${(apkDataSize / 1024 / 1024).toFixed(2)} MB)`);
}

// 4. 检查是否有失败的构建
console.log('\n\n❌ Failed Builds:');
const failedBuilds = d.select()
  .from(buildRecords)
  .where(eq(buildRecords.status, 'failed'))
  .orderBy(desc(buildRecords.id))
  .all();

if (failedBuilds.length === 0) {
  console.log('None');
} else {
  console.log(`Found ${failedBuilds.length}:`);
  failedBuilds.forEach(build => {
    console.log(`  • ID ${build.id}: ${build.appName} - ${build.createdAt}`);
  });
}

// 5. 检查构建所需的工具
console.log('\n\n🔧 Build Prerequisites Check:');
import { promises as fs } from 'fs';
import { paths } from './src/config/paths.js';

async function checkPrerequisites() {
  const checks = [
    { name: 'Base APK', path: paths.baseApkPath },
    { name: 'apktool.jar', path: paths.apkToolPath },
    { name: 'uber-apk-signer.jar', path: paths.signerPath },
  ];

  for (const check of checks) {
    try {
      await fs.access(check.path);
      const stat = await fs.stat(check.path);
      console.log(`✅ ${check.name}: ${check.path} (${(stat.size / 1024).toFixed(2)} KB)`);
    } catch (err) {
      console.log(`❌ ${check.name}: ${check.path} - NOT FOUND`);
    }
  }

  // Check Java
  try {
    const { spawn } = await import('child_process');
    const java = spawn('java', ['-version'], { stdio: 'pipe' });
    await new Promise((resolve) => {
      java.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Java Runtime: Available');
        } else {
          console.log('❌ Java Runtime: Not available');
        }
        resolve(null);
      });
    });
  } catch (err) {
    console.log('❌ Java Runtime: Not found');
  }
}

await checkPrerequisites();

console.log('\n' + '═'.repeat(80));
console.log('\n💡 Recommendations:');
if (allBuilds.length === 0) {
  console.log('  1. Run POST /api/builder/build to create a new APK');
  console.log('  2. Wait for the build to complete (watch WebSocket for builder:progress)');
  console.log('  3. Then use GET /api/builder/download to download the APK');
}
if (completedBuilds.length === 0 && allBuilds.length > 0) {
  console.log('  1. Previous builds failed - check logs above for errors');
  console.log('  2. Verify all build prerequisites are available');
  console.log('  3. Try building again with /api/builder/build');
}
if (failedBuilds.length > 0) {
  console.log('  1. Check the build logs to understand what went wrong');
  console.log('  2. Verify build parameters (app name, package name, URLs)');
  console.log('  3. Check if base APK, apktool, and signer tools are intact');
}

console.log('\n');
process.exit(0);
