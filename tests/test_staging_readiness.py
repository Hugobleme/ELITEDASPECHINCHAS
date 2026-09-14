import os
import pytest


def test_health_check_endpoint(client):
    """Valida que o endpoint básico de liveness /health responde 200 OK com timestamp."""
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
    assert "timestamp" in data


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


def test_staging_notify_subject_default():
    """Valida que o VAPID_SUBJECT padrão aponta para o domínio oficial elitedaspechinchas."""
    from processor.notify import VAPID_SUBJECT
    assert "elitedaspechinchas.com.br" in VAPID_SUBJECT
