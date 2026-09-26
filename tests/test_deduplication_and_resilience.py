import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

from database.models import Offer, Source
from bot.publisher import publish_to_telegram, clear_publication_cache, is_duplicate_publication
from bot.listener import should_process_msg_id, process_incoming_payload
from processor.tasks import publish_offer_to_channel


@pytest.fixture(autouse=True)
def clean_cache():
    clear_publication_cache()
    yield
    clear_publication_cache()


def test_publisher_sliding_window_duplicate_prevention(monkeypatch, tmp_path):
    """Garante que publish_to_telegram bloqueia post idêntico dentro da janela de 15 minutos."""
    test_sim_file = str(tmp_path / "simulated_dedup.json")
    monkeypatch.setattr("bot.publisher.SIMULATED_PUBLICATIONS_FILE", test_sim_file)

    msg = "🔥 Oferta Imperdível Fogão Neo Glass Suggar R$ 1.188,00"
    img = "https://img.com/fogao.jpg"

    # Primeiro envio: deve passar
    res1 = publish_to_telegram(message=msg, channel_id="@testchannel", image_url=img)
    assert res1["success"] is True
    assert res1.get("duplicate_prevented") is not True

    # Segundo envio idêntico: deve ser bloqueado com duplicate_prevented=True
    res2 = publish_to_telegram(message=msg, channel_id="@testchannel", image_url=img)
    assert res2["success"] is True
    assert res2.get("duplicate_prevented") is True
    assert "duplicado" in res2.get("message", "").lower()


def test_listener_should_process_msg_id_deduplication():
    """Garante que should_process_msg_id rejeita telegram_msg_id duplicado."""
    msg_id = 88776655

    # Primeira verificação: True
    assert should_process_msg_id(msg_id) is True

    # Segunda verificação imediata: False (já em processamento)
    assert should_process_msg_id(msg_id) is False


def test_publish_offer_to_channel_strict_idempotency(db_session, monkeypatch):
    """Garante que publish_offer_to_channel nunca republica uma oferta com published_at preenchido."""
    monkeypatch.setattr("processor.tasks.SessionLocal", lambda: db_session)

    offer = Offer(
        id="offer-strict-idempotency",
        title="Geladeira Frost Free Inox 400L",
        price_current=2499.00,
        price_original=3299.00,
        discount_pct=24,
        store="Amazon",
        category="eletrodomesticos",
        image_url="https://img.com/geladeira.jpg",
        affiliate_link="https://amzn.to/geladeira",
        status="published",
        published_at=datetime.now(timezone.utc),
    )
    db_session.add(offer)
    db_session.commit()

    # Tentativa de publicar novamente
    with patch("processor.tasks.publish_to_telegram") as mock_pub:
        result = publish_offer_to_channel("offer-strict-idempotency")
        assert result["status"] == "skipped"
        assert result["reason"] == "already_published"
        mock_pub.assert_not_called()


def test_process_incoming_payload_no_celery_dispatch_on_success(monkeypatch):
    """Garante que process_incoming_payload NÃO agenda task Celery redundante se o processamento direto sucede."""
    mock_celery_delay = MagicMock()
    monkeypatch.setattr("bot.listener.process_telegram_message.delay", mock_celery_delay)
    monkeypatch.setattr(
        "bot.listener.process_telegram_message",
        lambda payload: {"status": "success", "offer_id": "test-direct-123"},
    )

    payload = {
        "text": "Notebook Acer Aspire R$ 2500 https://amazon.com.br/dp/1",
        "telegram_msg_id": 99112233,
        "source_name": "@canal_test",
    }

    res = process_incoming_payload(payload)
    assert res["status"] == "success"
    # O Celery NÃO deve ser chamado pois a execução direta sucedeu!
    mock_celery_delay.assert_not_called()
