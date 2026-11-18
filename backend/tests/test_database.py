import sqlite3

import database


def test_database_save_and_retrieve(tmp_path, monkeypatch):
    test_db = tmp_path / "test_inspections.db"

    monkeypatch.setattr(
        database,
        "DATABASE_PATH",
        test_db,
    )

    database.init_db()

    result = {
        "status": "FAIL",
        "summary": "Incorrect jackpot amount detected.",
        "issues": [
            {
                "severity": "HIGH",
                "title": "Incorrect amount",
                "description": "Wrong jackpot displayed.",
            }
        ],
    }

    inspection_id = database.save_inspection(
        filename="test_jackpot.png",
        expected_content="Jackpot must be $50,000,000",
        result=result,
    )

    saved = database.get_inspection(inspection_id)

    assert saved is not None
    assert saved["id"] == inspection_id
    assert saved["filename"] == "test_jackpot.png"
    assert saved["status"] == "FAIL"
    assert saved["summary"] == result["summary"]
    assert saved["issues"] == result["issues"]
    assert saved["created_at"]


def test_inspection_history_order(tmp_path, monkeypatch):
    test_db = tmp_path / "test_inspections.db"

    monkeypatch.setattr(
        database,
        "DATABASE_PATH",
        test_db,
    )

    database.init_db()

    first_id = database.save_inspection(
        "first.png",
        "Expected A",
        {
            "status": "PASS",
            "summary": "No issues",
            "issues": [],
        },
    )

    second_id = database.save_inspection(
        "second.png",
        "Expected B",
        {
            "status": "FAIL",
            "summary": "Issue found",
            "issues": [],
        },
    )

    history = database.get_inspections()

    assert len(history) == 2
    assert history[0]["id"] == second_id
    assert history[1]["id"] == first_id


def test_missing_inspection(tmp_path, monkeypatch):
    monkeypatch.setattr(
        database,
        "DATABASE_PATH",
        tmp_path / "test_inspections.db",
    )

    database.init_db()

    assert database.get_inspection(999) is None


def test_database_rejects_invalid_status(tmp_path, monkeypatch):
    monkeypatch.setattr(
        database,
        "DATABASE_PATH",
        tmp_path / "test_inspections.db",
    )

    database.init_db()

    try:
        database.save_inspection(
            "invalid.png",
            "Expected content",
            {
                "status": "BROKEN",
                "summary": "Invalid status",
                "issues": [],
            },
        )
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError(
            "Database accepted an invalid inspection status."
        )