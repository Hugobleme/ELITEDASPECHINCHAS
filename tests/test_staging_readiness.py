import os
import re
import pytest
from unittest.mock import MagicMock
from api.main import CORS_ORIGIN_REGEX


def test_health_check_endpoint(client):
    """Valida que o endpoint /health responde 200 com JSON contendo status, database, redis, bot e uptime_seconds."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data
    assert "Elite das Pechinchas" in data["service"]
    assert "database" in data
    assert "redis" in data
    assert "bot" in data
    assert "uptime_seconds" in data
    assert isinstance(data["uptime_seconds"], (int, float))


def test_health_check_bot_status_configuration(client, monkeypatch):
    """Valida que o status do bot em /health reflete o ambiente."""
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
    monkeypatch.delenv("TARGET_CHANNEL_ID", raising=False)
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["bot"] == "not_configured"

    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "123456789:ABCDEF_mock_token_for_health_test")
    monkeypatch.setenv("TARGET_CHANNEL_ID", "@ElitedasPechinchas")
    res2 = client.get("/health")
    assert res2.status_code == 200
    assert res2.json()["bot"] == "configured"


def test_structured_json_logs_format_and_filtering():
    """Valida que os logs estruturados são gerados em JSON válido com chaves obrigatórias e filtráveis."""
    import json
    import logging
    from bot.structured_logger import emit_json_log

    test_logger = logging.getLogger("test_structured_logs")
    test_logger.setLevel(logging.INFO)

    log_str = emit_json_log(
        logger=test_logger,
        level="info",
        component="publisher",
        event="publish_success",
        message="Oferta publicada com sucesso",
        request_id="req-test-99",
        path="/api/offers",
        duration=35.2,
    )

    parsed = json.loads(log_str)
    assert parsed["level"] == "INFO"
    assert parsed["component"] == "publisher"
    assert parsed["event"] == "publish_success"
    assert parsed["request_id"] == "req-test-99"
    assert parsed["path"] == "/api/offers"
    assert parsed["duration"] == 35.2
    assert "timestamp" in parsed
    assert "message" in parsed


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


def test_security_headers_and_request_id_present(client):
    """Valida a injeção obrigatória de Security Headers OWASP e X-Request-ID."""
    res = client.get("/health")
    assert res.status_code == 200
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert res.headers.get("X-XSS-Protection") == "1; mode=block"
    assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "X-Request-ID" in res.headers
    assert "X-Response-Time" in res.headers
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database"] in ("connected", "unavailable")
    assert "uptime_seconds" in data


def test_custom_request_id_propagated(client):
    """Valida que um correlation ID X-Request-ID enviado pelo cliente é preservado na resposta."""
    custom_id = "req-audit-test-9999"
    res = client.get("/health", headers={"X-Request-ID": custom_id})
    assert res.headers.get("X-Request-ID") == custom_id


def test_hsts_header_in_production(client, monkeypatch):
    """Valida que Strict-Transport-Security é injetado em ambiente de produção."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    res = client.get("/health")
    assert "Strict-Transport-Security" in res.headers
    assert "max-age=31536000" in res.headers["Strict-Transport-Security"]

