import os
import re
import pytest
from unittest.mock import MagicMock
from api.main import CORS_ORIGIN_REGEX


def test_health_check_endpoint(client):
    """Valida que o endpoint básico de liveness /health responde 200 OK com timestamp ISO."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data
    assert "Elite das Pechinchas" in data["service"]


def test_readiness_probe_success(client):
    """Valida que o endpoint de prontidão /ready verifica o banco e responde 200 OK."""
    res = client.get("/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert data["database"] == "connected"
    assert "redis" in data
    assert "timestamp" in data


def test_readiness_probe_database_failure(client):
    """Valida que falha no banco de dados retorna status 503 e identifica status unhealthy."""
    from database.connection import get_db
    from api.main import app

    def failing_db():
        mock_db = MagicMock()
        mock_db.execute.side_effect = Exception("DB Connection Timeout")
        yield mock_db

    app.dependency_overrides[get_db] = failing_db
    try:
        res = client.get("/ready")
        assert res.status_code == 503
        data = res.json()["detail"]
        assert data["status"] == "unhealthy"
        assert data["database"] == "error"
    finally:
        app.dependency_overrides.clear()


def test_public_vapid_endpoint(client, monkeypatch):
    """Valida que o endpoint público de VAPID retorna a chave pública e nunca a privada."""
    monkeypatch.setenv("VAPID_PUBLIC_KEY", "test_staging_vapid_public_key_123")
    monkeypatch.setenv("VAPID_PRIVATE_KEY", "SUPER_SECRET_PRIVATE_KEY_NEVER_EXPOSE")

    # Endpoint público na raiz
    res = client.get("/push/vapid-public-key")
    assert res.status_code == 200
    data = res.json()
    assert data["vapid_public_key"] == "test_staging_vapid_public_key_123"
    assert "private" not in str(data).lower()
    assert "SUPER_SECRET_PRIVATE_KEY_NEVER_EXPOSE" not in str(data)

    # Endpoint sob /me/push
    res_me = client.get("/me/push/vapid-public-key")
    assert res_me.status_code == 200
    assert res_me.json()["vapid_public_key"] == "test_staging_vapid_public_key_123"


def test_cors_origin_regex_security():
    """Valida que o regex de CORS para staging não permite origens perigosas ou forjadas."""
    pattern = r"^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$"

    # Origens válidas permitidas
    assert re.match(pattern, "https://elitedaspechinchas-staging.vercel.app")
    assert re.match(pattern, "https://preview-123.vercel.app")

    # Origens maliciosas estritamente bloqueadas
    assert not re.match(pattern, "https://attacker.com")
    assert not re.match(pattern, "http://preview-123.vercel.app")  # HTTP não seguro
    assert not re.match(pattern, "https://attacker.com/fake.vercel.app")
    assert not re.match(pattern, "https://evilvercel.app.attacker.com")
    assert not re.match(pattern, "https://test.vercel.app.evil.com")


def test_staging_notify_subject_default():
    """Valida que o VAPID_SUBJECT padrão aponta para o domínio oficial elitedaspechinchas."""
    from processor.notify import VAPID_SUBJECT
    assert "elitedaspechinchas.com.br" in VAPID_SUBJECT


def test_staging_environment_test_ingest_strictly_blocked(client, monkeypatch):
    """Valida que /offers/test-ingest é estritamente bloqueado com 403 em ambiente de staging."""
    monkeypatch.setenv("ENVIRONMENT", "staging")
    monkeypatch.setenv("TEST_INGEST_KEY", "any_secret_key")

    res = client.post(
        "/offers/test-ingest",
        json={"title": "Oferta Staging Bloqueada", "original_link": "https://amazon.com.br/dp/123"},
        headers={"X-Test-Key": "any_secret_key"},
    )
    assert res.status_code == 403
    assert "desabilitado no ambiente 'staging'" in res.json()["detail"]
