import pytest
import os
import json
from bot.formatter import (
    format_currency_br,
    format_telegram_card_html,
    format_telegram_coupon_html,
    format_telegram_card_markdown,
    generate_hashtags,
)
from bot.publisher import publish_to_telegram
from bot.listener import (
    simulate_incoming_message,
    load_simulated_messages_from_json,
)


def test_format_currency_br():
    assert format_currency_br(1299.90) == "R$ 1.299,90"
    assert format_currency_br(50.0) == "R$ 50,00"
    assert format_currency_br(0) == "R$ 0,00"


def test_generate_hashtags():
    tags = generate_hashtags("Amazon", "smartphones", is_coupon=True)
    assert "#Oferta" in tags
    assert "#Cupom" in tags
    assert "#Amazon" in tags
    assert "#Smartphones" in tags
    assert "#EliteDasPechinchas" in tags


def test_format_telegram_card_html():
    data = {
        "title": "Smart TV 50 4K UHD",
        "price_current": 1899.00,
        "price_original": 2499.00,
        "discount_pct": 24,
        "store": "Amazon",
        "category": "tv-e-audio",
        "coupon_code": "PROMO200",
        "coupon_validity": "31/12",
        "affiliate_link": "https://www.amazon.com.br/dp/B0CX8R1234?tag=elitedaspechinchas-20",
    }
    html_card = format_telegram_card_html(data)
    assert "<b>AMAZON</b>" in html_card
    assert "Smart TV 50 4K UHD" in html_card
    assert "R$ 1.899,00" in html_card
    assert "<code>PROMO200</code>" in html_card
    assert "31/12" in html_card
    assert "tag=elitedaspechinchas-20" in html_card
    assert "@elitedaspechinchas" in html_card
    assert "#Oferta" in html_card


def test_format_telegram_coupon_html():
    coupon_data = {
        "store": "Mercado Livre",
        "code": "MELI20",
        "discount_text": "20% OFF em Informática",
        "valid_until": "31/10/2026",
        "category": "informatica",
        "affiliate_link": "https://mercadolivre.com.br/cupons",
    }
    html_card = format_telegram_coupon_html(coupon_data)
    assert "<b>MERCADO LIVRE</b>" in html_card
    assert "<code>MELI20</code>" in html_card
    assert "20% OFF em Informática" in html_card
    assert "31/10/2026" in html_card
    assert "#Cupom" in html_card


def test_publish_to_telegram_simulation(tmp_path, monkeypatch):
    test_sim_file = str(tmp_path / "simulated_test.json")
    monkeypatch.setattr("bot.publisher.SIMULATED_PUBLICATIONS_FILE", test_sim_file)

    res = publish_to_telegram(
        message="<b>Teste de Promoção</b>",
        channel_id="@elitedaspechinchas",
        image_url="https://via.placeholder.com/300",
    )
    assert res["success"] is True
    assert res.get("simulated") is True
    assert res.get("has_image") is True

    # Valida que arquivo simulado foi gravado
    assert os.path.exists(test_sim_file)
    with open(test_sim_file, "r", encoding="utf-8") as f:
        history = json.load(f)
        assert len(history) >= 1
        assert history[-1]["channel"] == "@elitedaspechinchas"


def test_simulate_incoming_message(monkeypatch):
    """Garante que a simulação de mensagem do listener funciona sem conexão real do Telegram."""
    received = []

    def mock_process(payload):
        received.append(payload)
        return {"status": "success", "offer_id": "test-123"}

    monkeypatch.setattr("bot.listener.process_incoming_payload", mock_process)

    res = simulate_incoming_message(
        text="Mouse Gamer Logitech R$ 99,00 https://amazon.com.br/dp/123",
        source_name="@promos_tech",
        telegram_msg_id=777888,
    )
    assert res["status"] == "success"
    assert len(received) == 1
    assert received[0]["telegram_msg_id"] == 777888


def test_load_simulated_messages_from_json(tmp_path):
    sample_file = tmp_path / "messages.json"
    data = [
        {"text": "Promoção 1", "telegram_msg_id": 1},
        {"text": "Promoção 2", "telegram_msg_id": 2},
    ]
    sample_file.write_text(json.dumps(data), encoding="utf-8")

    loaded = load_simulated_messages_from_json(str(sample_file))
    assert len(loaded) == 2
    assert loaded[0]["telegram_msg_id"] == 1
