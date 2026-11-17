import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DATABASE_PATH = Path(__file__).parent / "inspections.db"


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS inspections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                expected_content TEXT NOT NULL,
                status TEXT NOT NULL
                    CHECK(status IN ('PASS', 'FAIL', 'REVIEW')),
                summary TEXT NOT NULL,
                issues TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)


def save_inspection(filename, expected_content, result):
    created_at = datetime.now(timezone.utc).isoformat()

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO inspections (
                filename,
                expected_content,
                status,
                summary,
                issues,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                filename,
                expected_content,
                result["status"],
                result["summary"],
                json.dumps(result["issues"]),
                created_at,
            ),
        )

        return cursor.lastrowid


def serialize_inspection(row):
    item = dict(row)
    item["issues"] = json.loads(item["issues"])
    return item


def get_inspections(limit=50):
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT *
            FROM inspections
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    return [serialize_inspection(row) for row in rows]


def get_inspection(inspection_id):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM inspections WHERE id = ?",
            (inspection_id,),
        ).fetchone()

    if row is None:
        return None

    return serialize_inspection(row)