import sqlite3, sys, os, datetime

def main(apk_path):
    db_path = os.path.join('backend','data','liumaRat.db')
    if not os.path.exists(db_path):
        print('Database not found at', db_path)
        sys.exit(2)
    if not os.path.exists(apk_path):
        print('APK file not found at', apk_path)
        sys.exit(3)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        cur.execute("PRAGMA table_info(build_records)")
        cols = [r[1] for r in cur.fetchall()]
        print('build_records columns:', cols)

        # Find most recent non-completed build
        cur.execute("SELECT id, status, creator_id FROM build_records WHERE status!='completed' AND status!='cancelled' ORDER BY id DESC LIMIT 1")
        row = cur.fetchone()
        if row:
            job_id = row[0]
            print('Found existing job id to update:', job_id, 'status=', row[1], 'creator_id=', row[2])
        else:
            # Insert a new completed record placeholder
            now = datetime.datetime.utcnow().isoformat()
            cur.execute("INSERT INTO build_records (server_url, home_page_url, app_name, status, file_size, created_at, creator_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        ('http://127.0.0.1:32766','https://example.com','manual-upload','pending',0, now, 1))
            job_id = cur.lastrowid
            print('Inserted new pending job id:', job_id)

        with open(apk_path, 'rb') as f:
            data = f.read()
        size = len(data)
        now2 = datetime.datetime.utcnow().isoformat()
        # Update the row with APK blob
        cur.execute('UPDATE build_records SET status=?, apk_data=?, file_size=?, completed_at=? WHERE id=?', ('completed', sqlite3.Binary(data), size, now2, job_id))
        conn.commit()
        print(f'Updated build_records id {job_id} with apk {apk_path} (size={size} bytes)')
    except Exception as e:
        print('ERROR:', e)
        conn.rollback()
        sys.exit(4)
    finally:
        conn.close()

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: update_db_with_apk.py <apk-path>')
        sys.exit(1)
    main(sys.argv[1])
