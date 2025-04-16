import sqlite3
from datetime import datetime, timedelta

conn = sqlite3.connect("userbots.db", check_same_thread=False)
cursor = conn.cursor()

# Buat tabel jika belum ada
cursor.execute("""
CREATE TABLE IF NOT EXISTS userbots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    prefix TEXT,
    session_string TEXT,
    expired_at TEXT,
    status TEXT
)
""")
conn.commit()

def add_userbot(name, prefix, session_string, duration_minutes):
    expired_at = datetime.now() + timedelta(minutes=duration_minutes)
    cursor.execute("""
        INSERT INTO userbots (name, prefix, session_string, expired_at, status)
        VALUES (?, ?, ?, ?, ?)
    """, (name, prefix, session_string, expired_at.isoformat(), "inactive"))
    conn.commit()

def get_all_userbots():
    cursor.execute("SELECT * FROM userbots")
    return cursor.fetchall()

def get_userbot(bot_id):
    cursor.execute("SELECT * FROM userbots WHERE id = ?", (bot_id,))
    return cursor.fetchone()

def update_status(bot_id, status):
    cursor.execute("UPDATE userbots SET status = ? WHERE id = ?", (status, bot_id))
    conn.commit()

def get_expired_userbots():
    now = datetime.now().isoformat()
    cursor.execute("SELECT * FROM userbots WHERE expired_at <= ? AND status = 'active'", (now,))
    return cursor.fetchall()

def update_userbot_prefix(bot_id, new_prefix):
    cursor.execute("UPDATE userbots SET prefix = ? WHERE id = ?", (new_prefix, bot_id))
    conn.commit()
