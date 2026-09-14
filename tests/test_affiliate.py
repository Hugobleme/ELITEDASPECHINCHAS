import pytest
from processor.affiliate import (
    extract_amazon_asin,
    extract_mercadolivre_id,
    replace_amazon_link,
    replace_mercadolivre_link,
    replace_magalu_link,
    replace_generic_link,
    copy_preserved_params,
    generate_affiliate_link,
)


def test_extract_amazon_asin():
    assert extract_amazon_asin("https://www.amazon.com.br/dp/B0CX8R1234") == "B0CX8R1234"
    assert extract_amazon_asin("https://www.amazon.com.br/gp/product/B0CX8R9999?ref=xyz") == "B0CX8R9999"
    assert extract_amazon_asin("https://www.google.com") is None


def test_extract_mercadolivre_id():
    assert extract_mercadolivre_id("https://produto.mercadolivre.com.br/MLB-1234567890-item") == "MLB-1234567890"
    assert extract_mercadolivre_id("https://www.mercadolivre.com.br/p/MLB99887766") == "MLB-99887766"
    assert extract_mercadolivre_id("https://www.amazon.com") is None


def test_replace_amazon_link():
    url = "https://www.amazon.com.br/dp/B0CX8R1234?tag=antigo_afiliado-20"
    new_url = replace_amazon_link(url, "minhatag-20")
    assert "tag=minhatag-20" in new_url
    assert "antigo_afiliado" not in new_url
    assert "B0CX8R1234" in new_url


def test_replace_amazon_link_preserves_utm():
    url = "https://www.amazon.com.br/dp/B0CX8R1234?utm_source=telegram&utm_campaign=promo_inverno"
    new_url = replace_amazon_link(url, "tag_elite-20")
    assert "tag=tag_elite-20" in new_url
    assert "utm_source=telegram" in new_url
    assert "utm_campaign=promo_inverno" in new_url


def test_replace_mercadolivre_link():
    url = "https://www.mercadolivre.com.br/produto/p/MLB123456?matt_tool=999&p=antigo"
    new_url = replace_mercadolivre_link(url, "meu_afiliado_ml")
    assert "tag=meu_afiliado_ml" in new_url
    assert "matt_tool" not in new_url


def test_replace_magalu_link():
    url = "https://www.magazinevoce.com.br/magazineantigo/celular-xyz/p/12345"
    new_url = replace_magalu_link(url, "elitedaspechinchas")
    assert "magazinevoce.com.br/elitedaspechinchas/celular-xyz/p/12345" in new_url


def test_replace_magalu_link_direct():
    url = "https://www.magazineluiza.com.br/notebook-gamer/p/2345678"
    new_url = replace_magalu_link(url, "elite_magalu")
    assert "magazinevoce.com.br/elite_magalu/notebook-gamer/p/2345678" in new_url


def test_generate_affiliate_link_with_env(monkeypatch):
    """Quando a tag estiver configurada no ambiente, deve injetar a tag corretamente."""
    import config
    monkeypatch.setitem(config.DEFAULT_AFFILIATE_TAGS, "Amazon", "minhatag-20")
    monkeypatch.setitem(config.DEFAULT_AFFILIATE_TAGS, "Shopee", "shopee_tag_123")
    monkeypatch.setitem(config.DEFAULT_AFFILIATE_TAGS, "AliExpress", "ali_tag_999")

    # Amazon
    amazon_res = generate_affiliate_link("https://www.amazon.com.br/dp/B08N5WRWNW", "Amazon")
    assert "tag=minhatag-20" in amazon_res

    # Shopee
    shopee_res = generate_affiliate_link("https://shopee.com.br/product/123/456", "Shopee")
    assert "af_siteid=shopee_tag_123" in shopee_res

    # AliExpress
    ali_res = generate_affiliate_link("https://pt.aliexpress.com/item/100500.html", "AliExpress")
    assert "aff_fcid=ali_tag_999" in ali_res


def test_generate_affiliate_link_fallback_when_no_tag(monkeypatch):
    """Quando a tag NÃO estiver configurada, deve manter o link original sem quebrar."""
    import config
    monkeypatch.setitem(config.DEFAULT_AFFILIATE_TAGS, "Kabum", "")

    kabum_link = "https://www.kabum.com.br/produto/999888"
    result = generate_affiliate_link(kabum_link, "Kabum")
    assert result == kabum_link


def test_generate_affiliate_link_unmapped_store():
    """Loja sem mapeamento de afiliado deve retornar o link original sem modificações."""
    random_link = "https://www.lojaexoticaqualquer.com.br/produto/12345"
    result = generate_affiliate_link(random_link, "Loja Exótica")
    assert result == random_link


def test_generate_affiliate_link_empty_link():
    assert generate_affiliate_link("", "Amazon") == ""
    assert generate_affiliate_link(None, "Amazon") == ""


def test_generate_affiliate_link_from_db_rule(db_session):
    """Deve priorizar a tag cadastrada no banco de dados se disponível."""
    from database.models import AffiliateRule
    rule = AffiliateRule(store="Kabum", tag_param="tag", affiliate_tag="kabum_db_tag")
    db_session.add(rule)
    db_session.commit()

    kabum_link = "https://www.kabum.com.br/produto/777"
    result = generate_affiliate_link(kabum_link, "Kabum", db=db_session)
    assert "tag=kabum_db_tag" in result
