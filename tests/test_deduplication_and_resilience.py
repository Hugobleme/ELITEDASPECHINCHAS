import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

from database.models import Offer, Source
from bot.publisher import publish_to_telegram, clear_publication_cache, is_duplicate_publication
from bot.listener import (
    should_process_msg_id,
    process_incoming_payload,
    clear_processing_msg_ids,
    ENABLE_WEB_POLLER,
)
from processor.tasks import publish_offer_to_channel, process_telegram_message
from processor.rules import is_duplicate, clear_rules_memory_dedup


@pytest.fixture(autouse=True)
def clean_cache():
    clear_publication_cache()
    clear_processing_msg_ids()
    clear_rules_memory_dedup()
    yield
    clear_publication_cache()
    clear_processing_msg_ids()
    clear_rules_memory_dedup()


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


def test_incoming_payload_processed_normally_once():
    """Garante que a primeira mensagem com telegram_msg_id é aceita e processada, e apenas a segunda é ignorada."""
    calls = []
    def mock_proc(payload):
        calls.append(payload["telegram_msg_id"])
        return {"status": "success", "offer_id": "test-1"}

    with patch("bot.listener.process_telegram_message", side_effect=mock_proc):
        p1 = {"telegram_msg_id": 55443322, "source_name": "@pechinchou", "text": "Teste"}
        r1 = process_incoming_payload(p1)
        assert r1["status"] == "success"
        assert len(calls) == 1

        # Segunda chamada com o mesmo ID deve ser ignorada
        r2 = process_incoming_payload(p1)
        assert r2["status"] == "skipped"
        assert r2["reason"] == "already_processing_or_processed"
        assert len(calls) == 1


@pytest.mark.asyncio
async def test_poll_public_channel(monkeypatch):
    """Valida extração resiliente de posts públicos do Telegram via web preview."""
    from bot.listener import poll_public_channel

    mock_html = """
    <div class="tgme_widget_message_wrap">
      <div class="tgme_widget_message" data-post="pechinchou/998877">
        <a class="tgme_widget_message_photo_wrap" style="background-image:url('https://cdn.telesco.pe/photo123.jpg')"></a>
        <div class="tgme_widget_message_text">
          <b>Fone Bluetooth Gamer</b><br>
          R$ 89,90<br>
          <a href="https://pechin.co/998877">https://pechin.co/998877</a>
        </div>
      </div>
    </div>
    """

    class MockResponse:
        status_code = 200
        text = mock_html

    class MockAsyncClient:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, *args):
            pass
        async def get(self, url):
            return MockResponse()

    monkeypatch.setattr("httpx.AsyncClient", MockAsyncClient)

    messages = await poll_public_channel("@pechinchou")
    assert len(messages) == 1
    m = messages[0]
    assert m["telegram_msg_id"] == 998877
    assert m["source_name"] == "@pechinchou"
    assert "https://pechin.co/998877" in m["entities_links"]
    assert m["media_url"] == "https://cdn.telesco.pe/photo123.jpg"
    assert "Fone Bluetooth Gamer" in m["text"]


def test_web_poller_disabled_by_default():
    """Garante que o Web Poller público HTTP fica desligado por padrão."""
    from bot.listener import ENABLE_WEB_POLLER
    assert ENABLE_WEB_POLLER is False


def test_boot_deduplication_listener_skips_recent_persisted_offer(db_session, monkeypatch):
    """
    Garante que o reinício do listener não reprocessa ofertas já persistidas nas últimas 30 min.
    Deve registrar log claro com [dedup no boot] e retornar status 'skipped'.
    """
    class NoCloseSession:
        def __init__(self, session):
            self._session = session
        def __getattr__(self, name):
            if name == "close":
                return lambda: None
            return getattr(self._session, name)

    monkeypatch.setattr("bot.listener.SessionLocal", lambda: NoCloseSession(db_session))
    monkeypatch.setattr("database.connection.SessionLocal", lambda: NoCloseSession(db_session))

    recent_offer = Offer(
        id="offer-boot-recent-1",
        title="Monitor Gamer 144Hz 24 Pol",
        price_current=799.00,
        price_original=999.00,
        discount_pct=20,
        store="Kabum",
        category="informatica",
        image_url="https://img.com/monitor.jpg",
        affiliate_link="https://kabum.com.br/monitor",
        telegram_msg_id=778899,
        created_at=(datetime.now(timezone.utc) - timedelta(minutes=10)).replace(tzinfo=None),
    )
    db_session.add(recent_offer)
    db_session.commit()

    payload = {
        "text": "Monitor Gamer 144Hz 24 Pol R$ 799",
        "telegram_msg_id": 778899,
        "source_name": "@promocoes",
    }

    res = process_incoming_payload(payload)
    assert res["status"] == "skipped"
    assert "dedup no boot" in res["reason"]
    assert res["offer_id"] == "offer-boot-recent-1"


def test_boot_deduplication_processor_tasks_skips_recent_persisted_offer(db_session, monkeypatch):
    """
    Garante que a task process_telegram_message consulta o banco para mensagens recentes (< 30 min)
    e pula o processamento com log claro e status 'skipped'.
    """
    class NoCloseSession:
        def __init__(self, session):
            self._session = session
        def __getattr__(self, name):
            if name == "close":
                return lambda: None
            return getattr(self._session, name)

    monkeypatch.setattr("processor.tasks.SessionLocal", lambda: NoCloseSession(db_session))
    monkeypatch.setattr("database.connection.SessionLocal", lambda: NoCloseSession(db_session))

    recent_offer = Offer(
        id="offer-task-boot-recent-2",
        title="Teclado Mecânico RGB Switch Blue",
        price_current=199.90,
        price_original=299.90,
        discount_pct=33,
        store="AliExpress",
        category="informatica",
        image_url="https://img.com/teclado.jpg",
        affiliate_link="https://aliexpress.com/item/1",
        telegram_msg_id=881122,
        created_at=(datetime.now(timezone.utc) - timedelta(minutes=5)).replace(tzinfo=None),
    )
    db_session.add(recent_offer)
    db_session.commit()

    raw_data = {
        "text": "Teclado Mecânico RGB R$ 199,90",
        "telegram_msg_id": 881122,
        "source_name": "@canal_gamer",
    }

    result = process_telegram_message(raw_data)
    assert result["status"] == "skipped"
    assert "dedup no boot" in result["reason"]
    assert result["offer_id"] == "offer-task-boot-recent-2"


def test_rules_is_duplicate_boot_window_and_memory(db_session):
    """
    Garante que processor/rules.py:
    1. Detecta duplicatas de boot para mensagens persistidas nas últimas 30 min por telegram_msg_id.
    2. Mantém deduplicação rápida em memória para a janela de 30 min.
    3. Mantém deduplicação no banco de dados para a janela de 24h.
    """
    # 1. Boot dedup (últimas 30 min via telegram_msg_id)
    recent_offer = Offer(
        id="offer-rules-boot-3",
        title="Mouse Gamer Sem Fio 16000 DPI",
        price_current=150.00,
        price_original=250.00,
        discount_pct=40,
        store="Amazon",
        category="informatica",
        image_url="https://img.com/mouse.jpg",
        affiliate_link="https://amzn.to/mouse",
        telegram_msg_id=556677,
        created_at=(datetime.now(timezone.utc) - timedelta(minutes=15)).replace(tzinfo=None),
        is_active=True,
    )
    db_session.add(recent_offer)
    db_session.commit()

    is_dup, reason = is_duplicate(
        db=db_session,
        telegram_msg_id=556677,
        title="Mouse Gamer Sem Fio 16000 DPI",
        price_current=150.00,
    )
    assert is_dup is True
    assert "[dedup no boot]" in reason

    # 2. Dedup em memória (janela de 30 min)
    clear_rules_memory_dedup()
    is_dup1, _ = is_duplicate(
        db=db_session,
        telegram_msg_id=None,
        title="Headset Gamer 7.1 Surround",
        price_current=299.00,
    )
    assert is_dup1 is False  # Primeira vez não é duplicado, entra no cache de memória

    # Segunda chamada imediata: deve ser capturada pelo cache em memória
    is_dup2, reason2 = is_duplicate(
        db=db_session,
        telegram_msg_id=None,
        title="Headset Gamer 7.1 Surround",
        price_current=299.00,
    )
    assert is_dup2 is True
    assert "memória (30 min)" in reason2

    # 3. Dedup no banco de dados (janela de 24h)
    clear_rules_memory_dedup()  # Limpa memória para validar persistência do banco
    old_offer = Offer(
        id="offer-rules-db-24h",
        title="Cadeira Gamer Ergonômica",
        price_current=899.00,
        price_original=1299.00,
        discount_pct=30,
        store="Kabum",
        category="moveis",
        image_url="https://img.com/cadeira.jpg",
        affiliate_link="https://kabum.com.br/cadeira",
        telegram_msg_id=None,
        created_at=(datetime.now(timezone.utc) - timedelta(hours=2)).replace(tzinfo=None),
        is_active=True,
    )
    db_session.add(old_offer)
    db_session.commit()

    is_dup3, reason3 = is_duplicate(
        db=db_session,
        telegram_msg_id=None,
        title="Cadeira Gamer Ergonômica",
        price_current=899.00,
        hours=24,
    )
    assert is_dup3 is True
    assert "24h" in reason3


