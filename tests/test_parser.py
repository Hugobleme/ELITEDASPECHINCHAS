import pytest
from processor.parser import (
    clean_text_title,
    extract_prices_and_discount,
    parse_price,
    detect_store,
    detect_category,
    extract_coupon,
    extract_coupon_validity,
    extract_first_url,
    extract_image_url,
    parse_telegram_message,
    parse_multi_product_message,
    ParsedOffer,
)


def test_parse_price_formats():
    """Valida conversão de múltiplos formatos numéricos e monetários do Brasil."""
    assert parse_price("R$ 1.299,90") == 1299.90
    assert parse_price("1.299,90") == 1299.90
    assert parse_price("R$ 99,90") == 99.90
    assert parse_price("99.90") == 99.90
    assert parse_price("R$99.90") == 99.90
    assert parse_price("1299") == 1299.0
    assert parse_price("invalid") is None
    assert parse_price("") is None


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


def test_extract_prices_with_shipping_frete():
    """Garante que o valor do frete não substitui o preço do produto."""
    text = "Cabo USB-C 100W Baseus por R$ 39,90 com Frete R$ 12,50 para todo Brasil https://shopee.com.br/p/123"
    price_curr, price_orig, _ = extract_prices_and_discount(text)
    assert price_curr == 39.90


def test_extract_prices_sai_por():
    text = "Carregador 20W Anker original de R$ 120,00 sai por R$ 69,90 https://amzn.to/3xyz"
    price_curr, price_orig, discount = extract_prices_and_discount(text)
    assert price_curr == 69.90
    assert price_orig == 120.0
    assert discount >= 40


def test_detect_store_by_url():
    assert detect_store("https://www.amazon.com.br/dp/B0BT25Q5QG") == "Amazon"
    assert detect_store("https://produto.mercadolivre.com.br/MLB-123") == "Mercado Livre"
    assert detect_store("https://www.magazineluiza.com.br/p/12345") == "Magazine Luiza"
    assert detect_store("https://www.kabum.com.br/produto/999") == "Kabum"
    assert detect_store("https://shopee.com.br/product/123/456") == "Shopee"
    assert detect_store("https://pt.aliexpress.com/item/100500.html") == "AliExpress"
    assert detect_store("https://www.casasbahia.com.br/produto/555") == "Casas Bahia"
    assert detect_store("https://www.samsung.com/br/smartphones/galaxy-s24") == "Samsung"
    assert detect_store("https://www.fastshop.com.br/web/p/d/123") == "Fast Shop"


def test_detect_store_by_text():
    assert detect_store(None, "Confira essa super oferta no Mercado Livre com envio Full") == "Mercado Livre"
    assert detect_store(None, "Oferta exclusiva Magalu pelo aplicativo") == "Magazine Luiza"
    assert detect_store(None, "Achado na Shopee com frete grátis") == "Shopee"
    assert detect_store(None, "Drop do Ninja KaBuM imperdível") == "Kabum"


def test_detect_category():
    assert detect_category("Playstation 5 Sony 825GB", "") == "games"
    assert detect_category("Smart TV 55 Polegadas 4K LG", "") == "tv-e-audio"
    assert detect_category("Air Fryer Fritadeira Sem Óleo Mondial", "") == "casa-e-cozinha"
    assert detect_category("Tênis Nike Revolution 6 Masculino", "") == "moda"
    assert detect_category("iPhone 15 Pro Max Apple", "") == "smartphones"
    assert detect_category("Monitor Gamer 144Hz IPS 1ms", "") == "informatica"
    assert detect_category("Smartwatch Amazfit Bip 5", "") == "eletronicos"


def test_detect_category_accent_insensitive():
    """Palavras com acentos em PT-BR como 'fogão', 'tênis' e 'cafeteira'."""
    assert detect_category("Fogão 4 Bocas com Acendimento Automático", "") == "casa-e-cozinha"
    assert detect_category("Tênis Esportivo Adidas Ultraboost", "") == "moda"


def test_extract_coupon():
    assert extract_coupon("Use o cupom VALE20 para garantir o desconto") == "VALE20"
    assert extract_coupon("CUPOM: OFERTA100OFF") == "OFERTA100OFF"
    assert extract_coupon("Aplique o cupom `TECH50` na finalização") == "TECH50"
    assert extract_coupon("Sem cupom hoje") is None
    assert extract_coupon("Não precisa de cupom") is None


def test_extract_coupon_validity():
    assert extract_coupon_validity("Cupom TECH10 válido até 31/12") == "31/12"
    assert extract_coupon_validity("Cupom expira em 25/10/2026") == "25/10/2026"
    assert extract_coupon_validity("Desconto válido hoje!") == "hoje"
    assert extract_coupon_validity("Sem prazo informado") is None


def test_extract_first_url_markdown_and_plain():
    text_md = "Acesse [aqui a oferta](https://www.amazon.com.br/dp/B0BT25Q5QG) imperdível"
    assert extract_first_url(text_md) == "https://www.amazon.com.br/dp/B0BT25Q5QG"

    text_plain = "Confira em https://shopee.com.br/product/123/456 e aproveite"
    assert extract_first_url(text_plain) == "https://shopee.com.br/product/123/456"


def test_extract_image_url_direct_and_markdown():
    text_img = "Foto do produto: https://m.media-amazon.com/images/I/71xyz.jpg confira!"
    assert extract_image_url(text_img) == "https://m.media-amazon.com/images/I/71xyz.jpg"

    text_md_img = "![Produto](https://images.kabum.com.br/produtos/foto.png)"
    assert extract_image_url(text_md_img) == "https://images.kabum.com.br/produtos/foto.png"


def test_clean_text_title():
    raw = "🚨 CORRE QUE TÁ BARATO! 🔥 Smart TV 55 4K Samsung Crystal UHD 💥"
    cleaned = clean_text_title(raw)
    assert "Smart TV 55 4K Samsung Crystal UHD" in cleaned
    assert not cleaned.startswith("🚨")


def test_parse_telegram_message_complete():
    raw_text = """
    🚨 MENOR PREÇO HISTÓRICO!
    Notebook Dell Inspiron 15 Core i5 8GB 512GB SSD
    De R$ 3.800,00 por R$ 2.660,00
    Cupom: DELL300
    Válido até 31/12
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
    assert result["coupon_validity"] == "31/12"
    assert "amazon.com.br" in result["original_link"]


def test_parse_message_without_url():
    text = "Super promoção de notebook por R$ 2.000,00 na Amazon mas esqueceram o link"
    result = parse_telegram_message(text)
    assert result["original_link"] is None


def test_parse_message_without_title():
    result = parse_telegram_message("")
    assert result["title"] == ""


def test_parse_message_without_price():
    text = "Olha esse produto top no link https://www.amazon.com.br/dp/B123"
    result = parse_telegram_message(text)
    assert result["price_current"] == 0.0


def test_parse_message_unrecognized_store():
    text = "Produto https://lojaestranhaqualquer.com.br/p/123 por R$ 99,00"
    result = parse_telegram_message(text)
    assert result["store"] == ""


def test_parse_message_with_entities_links():
    text = "Clique aqui para ver a oferta por R$ 500,00"
    entities = ["https://www.kabum.com.br/produto/1234"]
    result = parse_telegram_message(text, entities_links=entities)
    assert result["original_link"] == "https://www.kabum.com.br/produto/1234"
    assert result["store"] == "Kabum"


def test_parse_multi_product_message():
    """Valida particionamento de mensagens com múltiplos itens."""
    multi_text = """
    🔥 ACHADOS DO DIA 🔥
    1. Mouse Gamer Logitech G203 por R$ 99,90: https://www.amazon.com.br/dp/B087
    2. Teclado Mecânico Redragon por R$ 189,90: https://www.kabum.com.br/p/999
    """
    offers = parse_multi_product_message(multi_text)
    assert len(offers) == 2
    assert "Logitech" in offers[0].title or "Mouse" in offers[0].title
    assert offers[0].price_current == 99.90
    assert offers[1].price_current == 189.90


def test_parsed_offer_pydantic_model():
    """Valida integridade do modelo Pydantic ParsedOffer."""
    offer = ParsedOffer(
        title="Kindle 11ª Geração",
        price_current=449.0,
        price_original=499.0,
        discount_pct=10,
        store="Amazon",
        original_link="https://www.amazon.com.br/dp/B09SWW583J",
    )
    assert offer.is_valid() is True
    d = offer.to_dict()
    assert d["title"] == "Kindle 11ª Geração"
    assert d["price_current"] == 449.0
