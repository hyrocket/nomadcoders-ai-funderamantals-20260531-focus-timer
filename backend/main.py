import sqlite3
import os
from datetime import datetime, timedelta, timezone
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), "focus.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER NOT NULL,
            duration INTEGER NOT NULL DEFAULT 25,
            created_at TEXT NOT NULL,
            FOREIGN KEY (subject_id) REFERENCES subjects(id)
        );
        INSERT OR IGNORE INTO subjects (name) VALUES ('Work'), ('Reading'), ('Exercise'), ('Study');
    """)
    conn.commit()
    conn.close()


# ── Subjects ────────────────────────────────────────────────

@app.route("/subjects", methods=["GET"])
def get_subjects():
    conn = get_db()
    rows = conn.execute("SELECT id, name FROM subjects ORDER BY id").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/subjects", methods=["POST"])
def create_subject():
    data = request.get_json()
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    conn = get_db()
    try:
        cur = conn.execute("INSERT INTO subjects (name) VALUES (?)", (name,))
        conn.commit()
        new_id = cur.lastrowid
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "Subject already exists"}), 409
    conn.close()
    return jsonify({"id": new_id, "name": name}), 201


@app.route("/subjects/<int:subject_id>", methods=["DELETE"])
def delete_subject(subject_id):
    conn = get_db()
    conn.execute("DELETE FROM subjects WHERE id = ?", (subject_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# ── Sessions ─────────────────────────────────────────────────

@app.route("/sessions", methods=["GET"])
def get_sessions():
    subject_id = request.args.get("subject_id")
    range_filter = request.args.get("range", "all")

    query = """
        SELECT s.id, s.subject_id, sub.name AS subject_name, s.duration, s.created_at
        FROM sessions s
        JOIN subjects sub ON s.subject_id = sub.id
        WHERE 1=1
    """
    params = []

    if subject_id:
        query += " AND s.subject_id = ?"
        params.append(int(subject_id))

    now = datetime.now(timezone.utc)
    if range_filter == "week":
        start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        query += " AND s.created_at >= ?"
        params.append(start.isoformat())
    elif range_filter == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        query += " AND s.created_at >= ?"
        params.append(start.isoformat())

    query += " ORDER BY s.created_at DESC"

    conn = get_db()
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/sessions", methods=["POST"])
def create_session():
    data = request.get_json()
    subject_id = data.get("subject_id")
    duration = data.get("duration", 25)
    if not subject_id:
        return jsonify({"error": "subject_id required"}), 400
    created_at = datetime.now(timezone.utc).isoformat()
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO sessions (subject_id, duration, created_at) VALUES (?, ?, ?)",
        (subject_id, duration, created_at),
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return jsonify({"id": new_id, "subject_id": subject_id, "duration": duration, "created_at": created_at}), 201


@app.route("/sessions/<int:session_id>", methods=["DELETE"])
def delete_session(session_id):
    conn = get_db()
    conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# ── Stats ─────────────────────────────────────────────────────

@app.route("/stats", methods=["GET"])
def get_stats():
    conn = get_db()

    # total hours
    row = conn.execute("SELECT SUM(duration) AS total FROM sessions").fetchone()
    total_minutes = row["total"] or 0
    total_hours = round(total_minutes / 60, 1)

    # sessions this week (Mon-based)
    now = datetime.now(timezone.utc)
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    row = conn.execute(
        "SELECT COUNT(*) AS cnt FROM sessions WHERE created_at >= ?",
        (week_start.isoformat(),),
    ).fetchone()
    sessions_this_week = row["cnt"]

    # streak: count consecutive days ending today (or yesterday)
    rows = conn.execute(
        "SELECT DISTINCT DATE(created_at) AS day FROM sessions ORDER BY day DESC"
    ).fetchall()
    dates = [datetime.strptime(r["day"], "%Y-%m-%d").date() for r in rows]
    streak = 0
    check = now.date()
    if dates and dates[0] < check - timedelta(days=1):
        streak = 0
    else:
        for d in dates:
            if d == check or d == check - timedelta(days=1):
                streak += 1
                check = d - timedelta(days=1) if d == check else d - timedelta(days=1)
            else:
                break

    # by subject
    rows = conn.execute(
        "SELECT sub.name, SUM(s.duration) AS minutes FROM sessions s JOIN subjects sub ON s.subject_id = sub.id GROUP BY s.subject_id"
    ).fetchall()
    by_subject = [{"name": r["name"], "minutes": r["minutes"]} for r in rows]

    # by weekday (last 4 weeks)
    four_weeks_ago = (now - timedelta(weeks=4)).isoformat()
    rows = conn.execute(
        "SELECT strftime('%w', created_at) AS dow, SUM(duration) AS minutes FROM sessions WHERE created_at >= ? GROUP BY dow",
        (four_weeks_ago,),
    ).fetchall()
    dow_map = {"0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat"}
    by_weekday = {"Mon": 0, "Tue": 0, "Wed": 0, "Thu": 0, "Fri": 0, "Sat": 0, "Sun": 0}
    for r in rows:
        label = dow_map.get(r["dow"], "")
        if label:
            by_weekday[label] = r["minutes"]

    conn.close()
    return jsonify({
        "streak": streak,
        "total_hours": total_hours,
        "sessions_this_week": sessions_this_week,
        "by_subject": by_subject,
        "by_weekday": by_weekday,
    })


# ── Reset ─────────────────────────────────────────────────────

@app.route("/reset", methods=["POST"])
def reset_all():
    conn = get_db()
    conn.executescript("""
        DELETE FROM sessions;
        DELETE FROM subjects;
        INSERT OR IGNORE INTO subjects (name) VALUES ('Work'), ('Reading'), ('Exercise'), ('Study');
    """)
    conn.commit()
    conn.close()
    return jsonify({"success": True})


if __name__ == "__main__":
    init_db()
    app.run(debug=True)

init_db()
