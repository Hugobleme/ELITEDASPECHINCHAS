import pytest
from datetime import datetime, timedelta, timezone
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
        created_at=datetime.now(timezone.utc) - timedelta(hours=2),
        status="pending",
    )
    db_session.add(existing)
    db_session.commit()

    is_dup, reason = is_duplicate(db_session, telegram_msg_id=None, title="Cadeira Gamer Confort", price_current=450.0)
    assert is_dup is True
    assert "Oferta idêntica encontrada" in reason


def test_evaluate_rules_discount_threshold(monkeypatch, db_session):
    # Simula piso de desconto configurado em 10%
    monkeypatch.setattr("processor.rules.MIN_DISCOUNT_PERCENT", 10)

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
    approved, reason, status = evaluate_rules(parsed_bad, db_session, source_name="TEST_SOURCE")
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
    approved, reason, status = evaluate_rules(parsed_good, db_session, source_name="TEST_SOURCE")
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


def test_evaluate_rules_empty_title(db_session):
    """Rejeita oferta sem título ou com título excessivamente curto."""
    parsed = {
        "title": "",
        "price_current": 100.0,
        "price_original": 200.0,
        "discount_pct": 50,
        "store": "Amazon",
        "original_link": "https://amazon.com.br/dp/123",
    }
    approved, reason, status = evaluate_rules(parsed, db_session)
    assert approved is False
    assert status == "rejected"
    assert "Título ausente" in reason


def test_evaluate_rules_invalid_price(db_session):
    """Rejeita oferta com preço zerado, negativo ou nulo."""
    parsed_zero = {
        "title": "Fone Bluetooth JBL",
        "price_current": 0.0,
        "price_original": 100.0,
        "discount_pct": 100,
        "store": "Amazon",
        "original_link": "https://amazon.com.br/dp/123",
    }
    approved, reason, status = evaluate_rules(parsed_zero, db_session)
    assert approved is False
    assert status == "rejected"
    assert "Preço atual inválido" in reason


def test_evaluate_rules_missing_or_malformed_link(db_session):
    """Rejeita oferta sem link ou com link que não seja http/https."""
    parsed_no_link = {
        "title": "Smart TV 50 Polegadas LG",
        "price_current": 1899.0,
        "price_original": 2500.0,
        "discount_pct": 24,
        "store": "Amazon",
        "original_link": None,
    }
    approved, reason, status = evaluate_rules(parsed_no_link, db_session)
    assert approved is False
    assert status == "rejected"
    assert "Link original ausente ou malformado" in reason


def test_evaluate_rules_unidentified_store(db_session):
    """Rejeita oferta cuja loja não foi identificada."""
    parsed_no_store = {
        "title": "Cadeira de Escritório",
        "price_current": 300.0,
        "price_original": 500.0,
        "discount_pct": 40,
        "store": "",
        "original_link": "https://desconhecido.com/p/123",
    }
    approved, reason, status = evaluate_rules(parsed_no_store, db_session)
    assert approved is False
    assert status == "rejected"
    assert "Loja não identificada" in reason


def test_evaluate_rules_unauthorized_source(db_session):
    """Rejeita mensagens vindas de grupos/canais de origem não autorizados."""
    parsed = {
        "title": "Notebook Dell Inspiron",
        "price_current": 2500.0,
        "price_original": 4000.0,
        "discount_pct": 37,
        "store": "Amazon",
        "original_link": "https://amazon.com.br/dp/123",
    }
    approved, reason, status = evaluate_rules(parsed, db_session, source_name="@canal_estranho_spam")
    assert approved is False
    assert status == "rejected"
    assert "não autorizada" in reason


def test_evaluate_rules_missing_source_name(db_session):
    """Rejeita mensagens sem source_name no fluxo real."""
    parsed = {
        "title": "Smartwatch Amazfit",
        "price_current": 299.0,
        "price_original": 500.0,
        "discount_pct": 40,
        "store": "Amazon",
        "category": "eletronicos",
        "original_link": "https://amazon.com.br/dp/123",
    }
    # Sem passar source_name (None)
    approved, reason, status = evaluate_rules(parsed, db_session, source_name=None)
    assert approved is False
    assert status == "rejected"
    assert "Origem (source_name) ausente" in reason

    # Com source_name em branco
    approved, reason, status = evaluate_rules(parsed, db_session, source_name="   ")
    assert approved is False
    assert status == "rejected"
    assert "Origem (source_name) ausente" in reason


def test_evaluate_rules_allow_internal_test_exception(db_session):
    """Permite ausência de source_name apenas quando explicitamente marcado como teste interno."""
    parsed = {
        "title": "Smartwatch Amazfit",
        "price_current": 299.0,
        "price_original": 500.0,
        "discount_pct": 40,
        "store": "Amazon",
        "category": "eletronicos",
        "original_link": "https://amazon.com.br/dp/123",
    }
    approved, reason, status = evaluate_rules(parsed, db_session, source_name=None, allow_internal_test=True)
    assert approved is True
    assert status == "pending"  # Curadoria humana padrão (AUTO_APPROVE_ENABLED=False)


def test_calculate_quality_score():
    from processor.rules import calculate_quality_score
    top_offer = {
        "title": "Smartphone Samsung Galaxy S24 Ultra 512GB Titanium Gray",
        "price_current": 4899.0,
        "price_original": 7999.0,
        "discount_pct": 38,
        "store": "Samsung",
        "coupon_code": "GALAXY10",
        "image_url": "https://images.samsung.com/galaxy.jpg",
    }
    score = calculate_quality_score(top_offer)
    assert score >= 70

    weak_offer = {
        "title": "Cabo",
        "price_current": 5.0,
        "discount_pct": 0,
        "store": "desconhecida",
        "coupon_code": None,
        "image_url": None,
    }
    assert calculate_quality_score(weak_offer) <= 30


def test_evaluate_rules_price_limits(db_session):
    """Rejeita ofertas com preço abaixo do mínimo ou acima do máximo configurado."""
    # Abaixo do mínimo (ex: R$ 0.20 quando mínimo é R$ 0.50)
    low_offer = {
        "title": "Caneta Esferográfica",
        "price_current": 0.20,
        "price_original": 1.0,
        "discount_pct": 80,
        "store": "Amazon",
        "original_link": "https://amazon.com.br/dp/123",
    }
    approved, reason, status = evaluate_rules(low_offer, db_session, allow_internal_test=True)
    assert approved is False
    assert "abaixo do valor mínimo" in reason

    # Acima do máximo (ex: R$ 60.000,00 quando máximo é R$ 50.000,00)
    high_offer = {
        "title": "Supercomputador Industrial Especial",
        "price_current": 60000.0,
        "price_original": 75000.0,
        "discount_pct": 20,
        "store": "Amazon",
        "original_link": "https://amazon.com.br/dp/123",
    }
    approved, reason, status = evaluate_rules(high_offer, db_session, allow_internal_test=True)
    assert approved is False
    assert "acima do limite máximo" in reason


def test_evaluate_rules_perfume_cassino_exemption(db_session):
    """Garante que perfumes legítimos como Eudora Club 6 Cassino não sejam rejeitados por falso positivo de cassino."""
    perfume_offer = {
        "title": "Eudora Club 6 Cassino Desodorante Colônia 95ml",
        "price_current": 86.90,
        "price_original": 135.90,
        "discount_pct": 36,
        "store": "Mercado Livre",
        "category": "moda",
        "original_link": "https://mercadolivre.com.br/p/123",
    }
    approved, reason, status = evaluate_rules(perfume_offer, db_session, source_name="TEST_SOURCE")
    assert approved is True
    assert status == "pending"


def test_evaluate_rules_blocked_keywords_and_categories(db_session):
    """Rejeita ofertas com produtos proibidos, réplicas, apostas ou categorias bloqueadas."""
    # Réplica / Falso
    replica_offer = {
        "title": "Tênis Nike Air Jordan Réplica Primeira Linha",
        "price_current": 199.0,
        "price_original": 400.0,
        "discount_pct": 50,
        "store": "Shopee",
        "original_link": "https://shopee.com.br/p/123",
    }
    approved, reason, status = evaluate_rules(replica_offer, db_session, allow_internal_test=True)
    assert approved is False
    assert "palavra-chave bloqueada" in reason

    # Categoria bloqueada
    adult_offer = {
        "title": "Item Especial Adulto Proibido",
        "price_current": 120.0,
        "price_original": 200.0,
        "discount_pct": 40,
        "store": "Shopee",
        "category": "adulto",
        "original_link": "https://shopee.com.br/p/456",
    }
    approved, reason, status = evaluate_rules(adult_offer, db_session, allow_internal_test=True)
    assert approved is False
    assert "Categoria bloqueada" in reason


def test_evaluate_rules_suspicious_links(db_session):
    """Rejeita links que utilizam encurtadores não autorizados ou suspeitos."""
    susp_offer = {
        "title": "Fone Bluetooth TWS Barato",
        "price_current": 80.0,
        "price_original": 150.0,
        "discount_pct": 46,
        "store": "Amazon",
        "original_link": "https://iplogger.org/2abcde",
    }
    approved, reason, status = evaluate_rules(susp_offer, db_session, allow_internal_test=True)
    assert approved is False
    assert "encurtador não autorizado ou suspeito" in reason


def test_evaluate_rules_expired_coupon(db_session):
    """Rejeita oferta quando o cupom explícito já expirou no calendário."""
    expired_offer = {
        "title": "Mochila Executiva Antifurto",
        "price_current": 120.0,
        "price_original": 200.0,
        "discount_pct": 40,
        "store": "Amazon",
        "coupon_code": "ANTIGO50",
        "coupon_validity": "01/01/2020",
        "original_link": "https://amazon.com.br/dp/mochila",
    }
    approved, reason, status = evaluate_rules(expired_offer, db_session, allow_internal_test=True)
    assert approved is False
    assert "Cupom expirado" in reason
