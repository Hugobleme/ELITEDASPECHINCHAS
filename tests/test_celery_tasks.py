import pytest
from unittest.mock import patch
from sqlalchemy.orm import Session

from database.models import Offer, Source
from processor.celery_app import celery_app
from processor.tasks import process_telegram_message


@pytest.fixture(autouse=True)
def configure_celery_eager():
    """Configura o Celery para executar tasks de forma síncrona/eager durante os testes."""
    original_eager = celery_app.conf.task_always_eager
    celery_app.conf.task_always_eager = True
    yield
    celery_app.conf.task_always_eager = original_eager


def test_process_telegram_message_success(db_session: Session, monkeypatch):
    """
    Testa o fluxo completo da task assíncrona Celery (process_telegram_message):
    1. Entrada da mensagem simulando evento do Telegram;
    2. Parsing de título, preços, cupom e URL;
    3. Avaliação pelo motor de regras;
    4. Geração de link de afiliado oficial;
    5. Persistência relacional no banco com status 'pending' (curadoria);
    6. Presença de coupon_code.

    NOTA: O listener de rede real do Telethon (MTProto) NÃO é executado aqui.
    O teste opera sobre a camada de processamento e mensageria Celery.
    """
    # Monkeypatch SessionLocal na task para usar a sessão transacional de teste
    monkeypatch.setattr("processor.tasks.SessionLocal", lambda: db_session)

    # Cadastra fonte autorizada no banco de dados de teste
    test_source = Source(
        id="src-celery-1",
        name="Canal Oficial Teste",
        channel_username="canal_promos_oficial",
        is_active=True,
    )
    db_session.add(test_source)
    db_session.commit()

    raw_message = {
        "text": (
            "🔥 SUPER OFERTA AMAZON!\n"
            "Echo Dot 5ª Geração Smart Speaker com Alexa\n"
            "De R$ 429,00 por apenas R$ 269,10 à vista!\n"
            "Cupom: ALEXA10\n"
            "Compre aqui: https://www.amazon.com.br/dp/B09B8V1LZ3"
        ),
        "telegram_msg_id": 99881,
        "source_name": "@canal_promos_oficial",
        "media_url": None,
        "entities_links": [],
    }

    # Executa a task Celery
    result = process_telegram_message.delay(raw_message).get()

    assert result is not None
    assert result["status"] == "success"
    assert result["initial_status"] == "pending"
    assert result["coupon_code"] == "ALEXA10"
    assert "offer_id" in result

    # Valida persistência no banco de dados
    offer = db_session.query(Offer).filter(Offer.telegram_msg_id == 99881).first()
    assert offer is not None
    assert "Echo Dot" in offer.title
    assert offer.price_current == 269.10
    assert offer.price_original == 429.00
    assert offer.discount_pct == 37
    assert offer.store == "Amazon"
    assert offer.coupon_code == "ALEXA10"
    assert offer.status == "pending"
    assert "tag=" in offer.affiliate_link or "amazon" in offer.affiliate_link.lower()


def test_process_telegram_message_invalid_offer(db_session: Session, monkeypatch):
    """Valida rejeição de mensagem inválida (sem URL válida e com preço zerado)."""
    monkeypatch.setattr("processor.tasks.SessionLocal", lambda: db_session)

    raw_message = {
        "text": "Produto sem link e sem preço qualquer",
        "telegram_msg_id": 99882,
        "source_name": "TEST_SOURCE",
    }

    result = process_telegram_message.delay(raw_message).get()

    assert result["status"] == "rejected"
    assert "reason" in result

    # Não deve persistir no banco
    offer = db_session.query(Offer).filter(Offer.telegram_msg_id == 99882).first()
    assert offer is None


def test_process_telegram_message_missing_source(db_session: Session, monkeypatch):
    """Valida rejeição quando source_name não é informado na mensagem real."""
    monkeypatch.setattr("processor.tasks.SessionLocal", lambda: db_session)

    raw_message = {
        "text": (
            "Monitor Gamer 27 165Hz\n"
            "De R$ 1200 por R$ 800\n"
            "Link: https://www.amazon.com.br/dp/B0CX000000"
        ),
        "telegram_msg_id": 99883,
        "source_name": None,  # Fonte ausente
    }

    result = process_telegram_message.delay(raw_message).get()

    assert result["status"] == "rejected"
    assert "Origem (source_name) ausente" in result["reason"]

    offer = db_session.query(Offer).filter(Offer.telegram_msg_id == 99883).first()
    assert offer is None


def test_process_telegram_message_deduplication(db_session: Session, monkeypatch):
    """Valida prevenção de duplicidade por telegram_msg_id."""
    monkeypatch.setattr("processor.tasks.SessionLocal", lambda: db_session)

    raw_message = {
        "text": (
            "SSD NVMe 1TB Kingston\n"
            "De R$ 450 por R$ 280\n"
            "Link: https://www.amazon.com.br/dp/B0B0000001"
        ),
        "telegram_msg_id": 99884,
        "source_name": "TEST_SOURCE",
    }

    # Primeira ingestão: sucesso
    res1 = process_telegram_message.delay(raw_message).get()
    assert res1["status"] == "success"
    assert res1["initial_status"] == "pending"

    # Segunda ingestão com o mesmo telegram_msg_id: deve ser rejeitada por duplicidade
    res2 = process_telegram_message.delay(raw_message).get()
    assert res2["status"] == "rejected"
    assert "duplicada" in res2["reason"].lower()

    # Confirma apenas 1 registro no banco
    count = db_session.query(Offer).filter(Offer.telegram_msg_id == 99884).count()
    assert count == 1


def test_task_batch_process(db_session: Session, monkeypatch):
    """Testa processamento em lote via task_batch_process."""
    monkeypatch.setattr("processor.tasks.SessionLocal", lambda: db_session)
    from processor.tasks import task_batch_process

    batch = [
        {
            "text": "Item 1 Mouse Gamer R$ 80,00 De R$ 120,00 https://www.amazon.com.br/dp/B001",
            "telegram_msg_id": 11101,
            "source_name": "TEST_SOURCE",
        },
        {
            "text": "Item 2 Teclado R$ 150,00 De R$ 200,00 https://www.kabum.com.br/p/222",
            "telegram_msg_id": 11102,
            "source_name": "TEST_SOURCE",
        },
        {
            "text": "Mensagem inválida sem link e sem preço",
            "telegram_msg_id": 11103,
            "source_name": "TEST_SOURCE",
        },
    ]

    res = task_batch_process(batch)
    assert res["total"] == 3
    assert res["approved"] == 2
    assert res["rejected"] == 1
    assert len(res["results"]) == 3


def test_task_cleanup_expired(db_session: Session, monkeypatch):
    """Testa marcação de ofertas antigas como expiradas via task_cleanup_expired."""
    monkeypatch.setattr("processor.tasks.SessionLocal", lambda: db_session)
    monkeypatch.setattr(db_session, "close", lambda: None)
    from processor.tasks import task_cleanup_expired
    from datetime import datetime, timedelta, timezone

    old_published = Offer(
        title="Oferta Antiga 40 Dias",
        price_current=99.0,
        price_original=150.0,
        discount_pct=34,
        store="Amazon",
        category="eletronicos",
        image_url="https://via.com/1.jpg",
        affiliate_link="https://amzn.to/old",
        status="published",
        published_at=datetime.now(timezone.utc) - timedelta(days=40),
    )
    new_published = Offer(
        title="Oferta Recente 2 Dias",
        price_current=199.0,
        price_original=250.0,
        discount_pct=20,
        store="Amazon",
        category="eletronicos",
        image_url="https://via.com/2.jpg",
        affiliate_link="https://amzn.to/new",
        status="published",
        published_at=datetime.now(timezone.utc) - timedelta(days=2),
    )
    db_session.add_all([old_published, new_published])
    db_session.commit()

    old_id = old_published.id
    new_id = new_published.id

    res = task_cleanup_expired(max_age_days=30)
    assert res["status"] == "success"
    assert res["expired_count"] >= 1

    check_old = db_session.query(Offer).filter(Offer.id == old_id).first()
    check_new = db_session.query(Offer).filter(Offer.id == new_id).first()
    assert check_old.status == "expired"
    assert check_new.status == "published"
