import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

import database
import main
from inspection_rules import EXPECTED_REQUIREMENTS


IMAGE_FOLDER = (
    Path(__file__).resolve().parent.parent
    / "evaluation_images"
)

TEST_CASES = [
    ("01_correct.png", "PASS"),
    ("02_wrong_amount.png", "FAIL"),
    ("03_typo.png", "FAIL"),
    ("04_missing_heading.png", "FAIL"),
    ("05_unreadable.png", "REVIEW"),
]


@pytest.fixture
def api_client(tmp_path, monkeypatch):
    # Use a temporary database so tests never
    # modify your actual inspection history.
    monkeypatch.setattr(
        database,
        "DATABASE_PATH",
        tmp_path / "regression_test.db",
    )

    with TestClient(main.app) as client:
        yield client


def upload_image(client, filename, content=None):
    image_bytes = (IMAGE_FOLDER / filename).read_bytes()

    return client.post(
        "/api/inspect",
        files={
            "image": (
                filename,
                image_bytes,
                "image/png",
            )
        },
        data={
            "expected_content": (
                content
                if content is not None
                else EXPECTED_REQUIREMENTS
            )
        },
    )


# ==========================================
# Tests 1-5: Known screenshot classifications
# ==========================================

@pytest.mark.parametrize(
    "filename,expected_status",
    TEST_CASES,
)
def test_ocr_classification(
    api_client,
    filename,
    expected_status,
):
    response = upload_image(api_client, filename)

    assert response.status_code == 200, response.text

    result = response.json()

    assert result["status"] == expected_status
    assert isinstance(result["summary"], str)
    assert isinstance(result["issues"], list)
    assert isinstance(result["inspection_id"], int)


# ==========================================
# Test 6: API saves OCR inspections
# ==========================================

def test_ocr_result_saved_to_history(api_client):
    response = upload_image(
        api_client,
        "03_typo.png",
    )

    assert response.status_code == 200

    result = response.json()
    inspection_id = result["inspection_id"]

    history_response = api_client.get(
        "/api/inspections"
    )

    assert history_response.status_code == 200

    history = history_response.json()["inspections"]

    assert len(history) == 1
    assert history[0]["id"] == inspection_id
    assert history[0]["status"] == "FAIL"
    assert history[0]["filename"] == "03_typo.png"

    assert any(
        issue["title"] == "Incorrect heading"
        for issue in history[0]["issues"]
    )


# ==========================================
# Test 7: Other uploads use the Gemma path
# ==========================================

def test_other_image_uses_gemma(
    api_client,
    monkeypatch,
):
    mock_result = {
        "status": "PASS",
        "summary": "Gemma test response.",
        "issues": [],
    }

    mock_response = SimpleNamespace(
        message=SimpleNamespace(
            content=json.dumps(mock_result)
        )
    )

    mock_chat = AsyncMock(return_value=mock_response)

    monkeypatch.setattr(
        main.client,
        "chat",
        mock_chat,
    )

    # Same valid PNG bytes, but a filename
    # that is not one of our evaluation files.
    image_bytes = (
        IMAGE_FOLDER / "01_correct.png"
    ).read_bytes()

    response = api_client.post(
        "/api/inspect",
        files={
            "image": (
                "different_display.png",
                image_bytes,
                "image/png",
            )
        },
        data={
            "expected_content": (
                "Check the uploaded display."
            )
        },
    )

    assert response.status_code == 200, response.text

    assert response.json()["summary"] == (
        "Gemma test response."
    )

    mock_chat.assert_awaited_once()


# ==========================================
# Test 8: Database persistence
# ==========================================

def test_database_persistence(api_client):
    response = upload_image(
        api_client,
        "02_wrong_amount.png",
    )

    assert response.status_code == 200

    inspection_id = response.json()["inspection_id"]

    # get_inspection opens a fresh SQLite
    # connection, verifying committed data
    # remains available after reconnecting.
    saved = database.get_inspection(inspection_id)

    assert saved is not None
    assert saved["status"] == "FAIL"
    assert saved["filename"] == "02_wrong_amount.png"
    assert saved["issues"]