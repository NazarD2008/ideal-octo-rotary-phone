import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const dbPath = path.resolve(process.cwd(), 'backend', 'data', 'liumaRat.db');
console.log('DB path:', dbPath);
const db = new Database(dbPath);
try {
  const row = db.prepare('SELECT id, username, email, is_default FROM users WHERE username = ?').get('admin');
  console.log('Before:', row);
  const newPass = 's20041021';
  const hash = bcrypt.hashSync(newPass, 12);
  const res = db.prepare('UPDATE users SET password = ? WHERE username = ?').run(hash, 'admin');
  console.log('Updated rows:', res.changes);
  const after = db.prepare('SELECT id, username, email, is_default FROM users WHERE username = ?').get('admin');
  console.log('After:', after);
} finally {
  db.close();
}
