import sqlite3, sys
db = "backend/data/liumaRat.db"
conn = sqlite3.connect(db)
cur = conn.cursor()
cur.execute("PRAGMA table_info(build_records)")
cols = [r[1] for r in cur.fetchall()]
if "creator_id" in cols:
    print("creator_id already exists")
    conn.close()
    sys.exit(0)
try:
    cur.execute("ALTER TABLE build_records ADD COLUMN creator_id INTEGER")
    conn.commit()
    print("creator_id added")
except Exception as e:
    print("ERROR:", e)
finally:
    conn.close()
