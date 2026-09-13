import pytest
from bot.formatter import (
    format_currency_br,
    format_telegram_card_html,
    format_telegram_card_markdown,
)
from bot.publisher import publish_to_telegram


def test_format_currency_br():
    assert format_currency_br(1299.90) == "R$ 1.299,90"
    assert format_currency_br(50.0) == "R$ 50,00"


def test_format_telegram_card_html():
    data = {
        "title": "Smart TV 50 4K UHD",
        "price_current": 1899.00,
        "price_original": 2499.00,
        "discount_pct": 24,
        "store": "Amazon",
        "coupon_code": "PROMO200",
        "affiliate_link": "https://www.amazon.com.br/dp/B0CX8R1234?tag=elitedaspechinchas-20",
    }
    html_card = format_telegram_card_html(data)
    assert "<b>AMAZON</b>" in html_card
    assert "Smart TV 50 4K UHD" in html_card
    assert "R$ 1.899,00" in html_card
    assert "<code>PROMO200</code>" in html_card
    assert "tag=elitedaspechinchas-20" in html_card
    assert "@elitedaspechinchas" in html_card


def test_publish_to_telegram_simulation():
    # Sem token real configurado, deve executar modo simulação com sucesso
    res = publish_to_telegram(
        message="<b>Teste de Promoção</b>",
        channel_id="@elitedaspechinchas",
        image_url="https://via.placeholder.com/300",
    )
    assert res["success"] is True
    assert res.get("simulated") is True
