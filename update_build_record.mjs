import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
const dbPath = path.resolve('backend','data','liumaRat.db');
const db = new Database(dbPath);

// Find the most recent non-completed build record
let row = db.prepare("select id,status from build_records where status!='completed' order by id desc limit 1").get();
let jobId = row ? row.id : null;
if (!jobId) {
  // insert a new record
  const now = new Date().toISOString();
  const res = db.prepare('insert into build_records (server_url, home_page_url, app_name, status, file_size, created_at, creator_id) values (?,?,?,?,?,?,?)')
    .run('http://127.0.0.1:32766','https://example.com','manual-upload','completed',0,now,1);
  jobId = res.lastInsertRowid;
}

const apkPath = process.argv[2] || 'C:/tools/manual-build-1790524058.apk';
const buf = fs.readFileSync(apkPath);
const now = new Date().toISOString();

const upd = db.prepare('update build_records set status=?, apk_data=?, file_size=?, completed_at=? where id=?');
upd.run('completed', buf, buf.length, now, jobId);
console.log('Updated build_records id', jobId, 'with apk', apkPath);

db.close();
