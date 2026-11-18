import io

from fastapi.testclient import TestClient
from PIL import Image

from main import app


def make_image():
    image = Image.new("RGB", (100, 100), "red")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_home():
    with TestClient(app) as client:
        response = client.get("/")

    assert response.status_code == 200
    assert response.json()["status"] == "running"
    assert response.json()["ai_provider"] == "Ollama"


def test_health():
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_empty_expected_content():
    with TestClient(app) as client:
        response = client.post(
            "/api/inspect",
            files={
                "image": (
                    "test.png",
                    make_image(),
                    "image/png",
                )
            },
            data={"expected_content": "   "},
        )

    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_unsupported_file_type():
    with TestClient(app) as client:
        response = client.post(
            "/api/inspect",
            files={
                "image": (
                    "test.txt",
                    b"Not an image",
                    "text/plain",
                )
            },
            data={"expected_content": "Test content"},
        )

    assert response.status_code == 400


def test_corrupted_image():
    with TestClient(app) as client:
        response = client.post(
            "/api/inspect",
            files={
                "image": (
                    "broken.png",
                    b"This is not really a PNG",
                    "image/png",
                )
            },
            data={"expected_content": "Test content"},
        )

    assert response.status_code == 400
    assert "invalid" in response.json()["detail"].lower()


def test_large_image():
    with TestClient(app) as client:
        response = client.post(
            "/api/inspect",
            files={
                "image": (
                    "large.png",
                    b"x" * (5 * 1024 * 1024 + 1),
                    "image/png",
                )
            },
            data={"expected_content": "Test content"},
        )

    assert response.status_code == 413


def test_expected_content_too_long():
    with TestClient(app) as client:
        response = client.post(
            "/api/inspect",
            files={
                "image": (
                    "test.png",
                    make_image(),
                    "image/png",
                )
            },
            data={"expected_content": "A" * 2001},
        )

    assert response.status_code == 400


def test_unknown_inspection():
    with TestClient(app) as client:
        response = client.get("/api/inspections/999999999")

    assert response.status_code == 404


def test_invalid_history_limit():
    with TestClient(app) as client:
        response = client.get("/api/inspections?limit=101")

    assert response.status_code == 400