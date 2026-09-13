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


def test_parse_message_without_url():
    """Garante que mensagem sem URL não ganha link falso e retorna original_link None."""
    text = "Super promoção de notebook por R$ 2.000,00 na Amazon mas esqueceram o link"
    result = parse_telegram_message(text)
    assert result["original_link"] is None


def test_parse_message_without_title():
    """Mensagem vazia deve retornar título vazio, sem inventar nome fictício."""
    result = parse_telegram_message("")
    assert result["title"] == ""


def test_parse_message_without_price():
    """Mensagem sem valor monetário deve indicar preço zerado."""
    text = "Olha esse produto top no link https://www.amazon.com.br/dp/B123"
    result = parse_telegram_message(text)
    assert result["price_current"] == 0.0


def test_parse_message_unrecognized_store():
    """Mensagem sem loja cadastrada deve retornar store vazia."""
    text = "Produto https://lojaestranhaqualquer.com.br/p/123 por R$ 99,00"
    result = parse_telegram_message(text)
    assert result["store"] == ""


def test_parse_message_with_entities_links():
    """Hyperlinks passados via entidades do Telegram devem ser priorizados e validados."""
    text = "Clique aqui para ver a oferta por R$ 500,00"
    entities = ["https://www.kabum.com.br/produto/1234"]
    result = parse_telegram_message(text, entities_links=entities)
    assert result["original_link"] == "https://www.kabum.com.br/produto/1234"
    assert result["store"] == "Kabum"
