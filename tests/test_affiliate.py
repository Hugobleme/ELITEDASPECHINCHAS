import pytest
from processor.affiliate import (
    extract_amazon_asin,
    replace_amazon_link,
    replace_mercadolivre_link,
    replace_magalu_link,
    replace_generic_link,
    generate_affiliate_link,
)


def test_extract_amazon_asin():
    assert extract_amazon_asin("https://www.amazon.com.br/dp/B0CX8R1234") == "B0CX8R1234"
    assert extract_amazon_asin("https://www.amazon.com.br/gp/product/B0CX8R9999?ref=xyz") == "B0CX8R9999"
    assert extract_amazon_asin("https://www.google.com") is None


def test_replace_amazon_link():
    url = "https://www.amazon.com.br/dp/B0CX8R1234?tag=antigo_afiliado-20"
    new_url = replace_amazon_link(url, "minhatag-20")
    assert "tag=minhatag-20" in new_url
    assert "antigo_afiliado" not in new_url
    assert "B0CX8R1234" in new_url


def test_replace_mercadolivre_link():
    url = "https://www.mercadolivre.com.br/produto/p/MLB123456?matt_tool=999&p=antigo"
    new_url = replace_mercadolivre_link(url, "meu_afiliado_ml")
    assert "tag=meu_afiliado_ml" in new_url
    assert "matt_tool" not in new_url


def test_replace_magalu_link():
    url = "https://www.magazinevoce.com.br/magazineantigo/celular-xyz/p/12345"
    new_url = replace_magalu_link(url, "elitedaspechinchas")
    assert "magazinevoce.com.br/elitedaspechinchas/celular-xyz/p/12345" in new_url


def test_generate_affiliate_link_dispatcher():
    amazon_link = "https://www.amazon.com.br/dp/B08N5WRWNW"
    result = generate_affiliate_link(amazon_link, "Amazon")
    assert "tag=" in result

    kabum_link = "https://www.kabum.com.br/produto/123"
    result_kabum = generate_affiliate_link(kabum_link, "Kabum")
    assert "tag=" in result_kabum
