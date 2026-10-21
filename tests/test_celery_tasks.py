import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from database.models import Offer, PriceAlert, User
from processor.celery_app import celery_app
from processor.tasks import (
    task_cleanup_expired,
    task_deduplicate,
    task_check_price_alerts,
    task_send_weekly_newsletter,
)


@pytest.fixture(autouse=True)
def configure_celery_eager():
    """Configura o Celery para executar tasks de forma síncrona/eager durante os testes."""
    original_eager = celery_app.conf.task_always_eager
    celery_app.conf.task_always_eager = True
    yield
    celery_app.conf.task_always_eager = original_eager


def test_task_cleanup_expired(db_session: Session, monkeypatch):
    """Testa marcação de ofertas antigas como expiradas via task_cleanup_expired."""
    monkeypatch.setattr("processor.tasks.SessionLocal", lambda: db_session)
    monkeypatch.setattr(db_session, "close", lambda: None)

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


def test_task_deduplicate(db_session: Session, monkeypatch):
    """Testa detecção de ofertas duplicadas para a mesma URL/produto."""
    monkeypatch.setattr("processor.tasks.SessionLocal", lambda: db_session)
    monkeypatch.setattr(db_session, "close", lambda: None)

    offer1 = Offer(
        title="Mouse Gamer Logitech G203",
        price_current=129.90,
        price_original=179.90,
        discount_pct=28,
        store="Amazon",
        category="eletronicos",
        original_link="https://www.amazon.com.br/dp/B07TEST001",
        affiliate_link="https://www.amazon.com.br/dp/B07TEST001?tag=elitedaspechinchas-20",
        status="published",
        is_active=True,
        created_at=datetime.now(timezone.utc) - timedelta(hours=2),
    )
    db_session.add(offer1)
    db_session.commit()

    res = task_deduplicate(original_link="https://www.amazon.com.br/dp/B07TEST001")
    assert res["is_duplicate"] is True
    assert res["existing_id"] == str(offer1.id)

    res_unique = task_deduplicate(original_link="https://www.amazon.com.br/dp/B09UNIQUE")
    assert res_unique["is_duplicate"] is False


def test_task_check_price_alerts(db_session: Session, monkeypatch):
    """Testa checagem periódica de alertas de preço cadastrados pelos usuários do site."""
    monkeypatch.setattr("processor.tasks.SessionLocal", lambda: db_session)
    monkeypatch.setattr(db_session, "close", lambda: None)

    res = task_check_price_alerts()
    assert res["status"] == "success"
    assert "matches" in res or "matches_found" in res


def test_task_send_weekly_newsletter(db_session: Session, monkeypatch):
    """Testa compilação e envio do digest semanal de ofertas."""
    monkeypatch.setattr("processor.tasks.SessionLocal", lambda: db_session)
    monkeypatch.setattr(db_session, "close", lambda: None)

    res = task_send_weekly_newsletter()
    assert res["status"] == "success"
    assert "top_deals_count" in res
