"""
Teste de Integração Ponta a Ponta:
Fluxo completo: Captura/Mensagem -> Parser -> Validações/Regras -> Afiliados -> Banco de Dados -> API /offers -> Tracking de Clique.
"""
import pytest
from database.models import Offer, Source
from processor.parser import parse_telegram_message
from processor.rules import evaluate_rules
from processor.affiliate import generate_affiliate_link


def test_full_promotion_lifecycle(client, db_session, monkeypatch):
    # 1. Configura ambiente com fonte autorizada e tag oficial de afiliado
    monkeypatch.setenv("AMAZON_TAG", "minhatagoficial-20")
    import config
    monkeypatch.setitem(config.DEFAULT_AFFILIATE_TAGS, "Amazon", "minhatagoficial-20")

    source = Source(
        name="Canal de Promos VIP",
        channel_username="@promos_vip",
        is_active=True,
    )
    db_session.add(source)
    db_session.commit()

    # 2. Simula mensagem de captura do Telegram
    telegram_raw_text = """
    🔥 SUPER DESCONTO NA AMAZON!
    Notebook Gamer Dell G15 Core i7 16GB RTX 3050 512GB SSD
    De: R$ 6.499,00
    Por apenas: R$ 4.549,30 à vista
    Cupom: DELL300OFF
    https://www.amazon.com.br/dp/B0CX8R9999?tag=tag_antiga_de_terceiro-20
    """
    telegram_msg_id = 1234567

    # 3. Executa o Parser
    parsed = parse_telegram_message(telegram_raw_text)
    assert "Notebook Gamer Dell G15" in parsed["title"]
    assert parsed["price_current"] == 4549.30
    assert parsed["price_original"] == 6499.00
    assert parsed["discount_pct"] == 30
    assert parsed["store"] == "Amazon"
    assert parsed["category"] == "informatica"
    assert parsed["coupon_code"] == "DELL300OFF"
    assert parsed["original_link"] == "https://www.amazon.com.br/dp/B0CX8R9999?tag=tag_antiga_de_terceiro-20"

    # 4. Avalia com o Motor de Regras
    is_approved, reason, initial_status = evaluate_rules(
        parsed_data=parsed,
        db=db_session,
        telegram_msg_id=telegram_msg_id,
        source_name="@promos_vip",
    )
    assert is_approved is True
    assert reason == "Oferta aprovada pelas regras de curadoria"

    # 5. Gera Link de Afiliado Seguro
    affiliate_link = generate_affiliate_link(
        original_link=parsed["original_link"],
        store=parsed["store"],
        db=db_session,
    )
    assert "tag=minhatagoficial-20" in affiliate_link
    assert "tag_antiga_de_terceiro" not in affiliate_link
    assert "B0CX8R9999" in affiliate_link

    # 6. Persiste a Oferta no Banco com status 'published'
    new_offer = Offer(
        id="offer-dell-g15",
        title=parsed["title"],
        price_current=parsed["price_current"],
        price_original=parsed["price_original"],
        discount_pct=parsed["discount_pct"],
        store=parsed["store"],
        category=parsed["category"],
        image_url=parsed["image_url"],
        original_link=parsed["original_link"],
        affiliate_link=affiliate_link,
        coupon_code=parsed["coupon_code"],
        telegram_msg_id=telegram_msg_id,
        source_name="@promos_vip",
        status="published",
    )
    db_session.add(new_offer)
    db_session.commit()

    # 7. Consulta a Vitrine Pública via API FastAPI (GET /offers)
    response = client.get("/offers")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    found_item = next((item for item in data["items"] if item["id"] == "offer-dell-g15"), None)
    assert found_item is not None
    assert found_item["title"] == new_offer.title
    assert found_item["price_current"] == 4549.30
    assert found_item["coupon_code"] == "DELL300OFF"
    assert found_item["affiliate_link"] == affiliate_link

    # 8. Consulta detalhes (GET /offers/{id})
    detail_res = client.get(f"/offers/{new_offer.id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["coupon_code"] == "DELL300OFF"

    # 9. Registra Clique no Link de Afiliado (POST /events/click)
    click_res = client.post("/events/click", json={"offer_id": new_offer.id})
    assert click_res.status_code == 200
    assert click_res.json()["tracked"] is True

    # 10. Valida Rejeição de Duplicatas (mesmo telegram_msg_id)
    dup_approved, dup_reason, _ = evaluate_rules(
        parsed_data=parsed,
        db=db_session,
        telegram_msg_id=telegram_msg_id,
        source_name="@promos_vip",
    )
    assert dup_approved is False
    assert "duplicada" in dup_reason.lower()
