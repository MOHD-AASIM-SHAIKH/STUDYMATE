import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "storage", "studymate.db")

if not os.path.exists(db_path):
    print("Database not found at", db_path)
    exit(0)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(sessions)")
cols = [row[1] for row in cursor.fetchall()]
print("Existing columns:", cols)

if "title" not in cols:
    cursor.execute('ALTER TABLE sessions ADD COLUMN title VARCHAR(200) DEFAULT ""')
    conn.commit()
    print("Added title column")
else:
    print("Title column already exists")

conn.close()
