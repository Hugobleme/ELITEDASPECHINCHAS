import pytest
from processor.parser import (
    clean_text_title,
    extract_prices_and_discount,
    detect_store,
    detect_category,
    extract_coupon,
    parse_telegram_message,
)


def test_extract_prices_and_discount_standard():
    text = """
    🔥 Super Oferta!
    Smartphone Samsung Galaxy S23 Ultra 256GB
    De R$ 5.999,00 por apenas R$ 3.899,00 à vista
    35% OFF no PIX
    https://www.amazon.com.br/dp/B0BT25Q5QG
    """
    price_curr, price_orig, discount = extract_prices_and_discount(text)
    assert price_curr == 3899.0
    assert price_orig == 5999.0
    assert discount == 35


def test_extract_prices_single_price():
    text = "Fone de Ouvido Bluetooth JBL Wave Buds por apenas R$ 199,90 no boleto"
    price_curr, price_orig, discount = extract_prices_and_discount(text)
    assert price_curr == 199.90
    assert price_orig == 199.90
    assert discount == 0


def test_detect_store_by_url():
    assert detect_store("https://www.amazon.com.br/dp/B0BT25Q5QG") == "Amazon"
    assert detect_store("https://produto.mercadolivre.com.br/MLB-123") == "Mercado Livre"
    assert detect_store("https://www.magazineluiza.com.br/p/12345") == "Magazine Luiza"
    assert detect_store("https://www.kabum.com.br/produto/999") == "Kabum"
    assert detect_store("https://shopee.com.br/product/123/456") == "Shopee"


def test_detect_category():
    assert detect_category("Playstation 5 Sony 825GB", "") == "games"
    assert detect_category("Smart TV 55 Polegadas 4K LG", "") == "tv-e-audio"
    assert detect_category("Air Fryer Fritadeira Sem Óleo Mondial", "") == "casa-e-cozinha"
    assert detect_category("Tênis Nike Revolution 6 Masculino", "") == "moda"
    assert detect_category("iPhone 15 Pro Max Apple", "") == "smartphones"


def test_extract_coupon():
    assert extract_coupon("Use o cupom VALE20 para garantir o desconto") == "VALE20"
    assert extract_coupon("CUPOM: OFERTA100OFF") == "OFERTA100OFF"
    assert extract_coupon("Sem cupom hoje") is None


def test_parse_telegram_message_complete():
    raw_text = """
    🚨 MENOR PREÇO HISTÓRICO!
    Notebook Dell Inspiron 15 Core i5 8GB 512GB SSD
    De R$ 3.800,00 por R$ 2.660,00
    Cupom: DELL300
    Link: https://www.amazon.com.br/dp/B0C1234567
    """
    result = parse_telegram_message(raw_text)
    assert "Notebook Dell Inspiron 15" in result["title"]
    assert result["price_current"] == 2660.0
    assert result["price_original"] == 3800.0
    assert result["discount_pct"] == 30
    assert result["store"] == "Amazon"
    assert result["category"] == "informatica"
    assert result["coupon_code"] == "DELL300"
    assert "amazon.com.br" in result["original_link"]
