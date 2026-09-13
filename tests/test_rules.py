import pytest
from datetime import datetime, timedelta
from database.models import Offer
from processor.rules import (
    generate_offer_hash,
    is_duplicate,
    check_rate_limit,
    evaluate_rules,
)


def test_generate_offer_hash():
    hash1 = generate_offer_hash("Smart TV 50 4K", 1899.90)
    hash2 = generate_offer_hash("smart tv 50 4k", 1899.90)
    hash3 = generate_offer_hash("Smart TV 50 4K", 1999.90)
    assert hash1 == hash2
    assert hash1 != hash3


def test_is_duplicate_by_telegram_msg_id(db_session):
    existing = Offer(
        title="Monitor Gamer 144Hz",
        price_current=799.0,
        price_original=1199.0,
        discount_pct=33,
        store="Kabum",
        category="informatica",
        image_url="https://img.com/mon.jpg",
        affiliate_link="https://kabum.com/af",
        telegram_msg_id=98765,
        status="pending",
    )
    db_session.add(existing)
    db_session.commit()

    is_dup, reason = is_duplicate(db_session, telegram_msg_id=98765, title="Monitor Gamer", price_current=799.0)
    assert is_dup is True
    assert "telegram_msg_id: 98765" in reason


def test_is_duplicate_by_hash(db_session):
    existing = Offer(
        title="Cadeira Gamer Confort",
        price_current=450.0,
        price_original=600.0,
        discount_pct=25,
        store="Mercado Livre",
        category="casa-cozinha",
        image_url="https://img.com/cad.jpg",
        affiliate_link="https://ml.com/af",
        created_at=datetime.utcnow() - timedelta(hours=2),
        status="pending",
    )
    db_session.add(existing)
    db_session.commit()

    is_dup, reason = is_duplicate(db_session, telegram_msg_id=None, title="Cadeira Gamer Confort", price_current=450.0)
    assert is_dup is True
    assert "Oferta idêntica encontrada" in reason


def test_evaluate_rules_discount_threshold(db_session):
    # Oferta com apenas 5% de desconto (abaixo do piso de 10%)
    parsed_bad = {
        "title": "Mouse USB Barato",
        "price_current": 95.0,
        "price_original": 100.0,
        "discount_pct": 5,
        "store": "Amazon",
        "category": "informatica",
        "original_link": "https://amazon.com",
    }
    approved, reason, status = evaluate_rules(parsed_bad, db_session)
    assert approved is False
    assert status == "rejected"
    assert "abaixo do piso mínimo" in reason

    # Oferta boa com 30% de desconto
    parsed_good = {
        "title": "Teclado Mecânico RGB",
        "price_current": 140.0,
        "price_original": 200.0,
        "discount_pct": 30,
        "store": "Amazon",
        "category": "informatica",
        "original_link": "https://amazon.com",
    }
    approved, reason, status = evaluate_rules(parsed_good, db_session)
    assert approved is True
    assert status == "pending"


def test_seed_database(monkeypatch, db_session):
    import seed
    monkeypatch.setattr(seed, "SessionLocal", lambda: db_session)
    monkeypatch.setattr(seed.Base.metadata, "create_all", lambda bind: None)
    
    # Executa seed inicial
    seed.seed_database()
    from database.models import Source, AffiliateRule
    sources = db_session.query(Source).all()
    assert len(sources) >= 3
    rules = db_session.query(AffiliateRule).all()
    assert len(rules) >= 5

    # Executa novamente para validar idempotência (não duplicar)
    seed.seed_database()
    sources_after = db_session.query(Source).all()
    assert len(sources_after) == len(sources)

