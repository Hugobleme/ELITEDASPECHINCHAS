"""
Teste de validação de links de afiliado (tags corretas).
Garante que todas as ofertas públicas da API (Amazon, Mercado Livre, Shopee)
possuem rigorosamente as tags oficiais de monetização configuradas.
"""
import os
import httpx
import pytest
from urllib.parse import urlparse, parse_qs

BASE_URL = os.getenv("RAILWAY_API_URL", "https://elitedaspechinchas-production.up.railway.app").rstrip("/")
OFFERS_ENDPOINT = f"{BASE_URL}/offers"

AMAZON_TAG = os.getenv("AMAZON_TAG", "elitedaspechi-20")
ML_WORD = os.getenv("MERCADOLIVRE_TAG", "elitedaspechinchas")
ML_TOOL = os.getenv("MERCADOLIVRE_TOOL_ID", "17470999")
SHOPEE_ID = os.getenv("SHOPEE_TAG", "18337121236")


def validate_affiliate_link(url: str, store: str = ""):
    """
    Valida se o link de afiliado tem a tag correta para a loja correspondente.
    Lança AssertionError caso alguma tag esteja ausente ou incorreta.
    """
    assert url, "URL de afiliado não pode ser vazia"
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    netloc = parsed.netloc.lower()
    store_lower = store.lower()

    if "amazon" in netloc or "amzn" in netloc or "amazon" in store_lower:
        tag = params.get("tag", [None])[0]
        assert tag == AMAZON_TAG, f"Amazon tag incorreta: esperada '{AMAZON_TAG}', obtida '{tag}' em {url}"

    elif "mercadolivre" in netloc or "mercado livre" in store_lower:
        matt_word = params.get("matt_word", [None])[0]
        matt_tool = params.get("matt_tool", [None])[0]
        assert matt_word == ML_WORD, f"ML matt_word incorreto: esperado '{ML_WORD}', obtido '{matt_word}' em {url}"
        assert matt_tool == ML_TOOL, f"ML matt_tool incorreto: esperado '{ML_TOOL}', obtido '{matt_tool}' em {url}"

    elif "shopee" in netloc or "shopee" in store_lower:
        af_id = (
            params.get("af_id", [None])[0]
            or params.get("affiliate_id", [None])[0]
            or params.get("af_siteid", [None])[0]
        )
        assert af_id == SHOPEE_ID, f"Shopee ID incorreto: esperado '{SHOPEE_ID}', obtido '{af_id}' em {url}"


def test_affiliate_links():
    """Valida que todos os links de afiliado retornados pela API têm as tags corretas."""
    try:
        response = httpx.get(OFFERS_ENDPOINT, timeout=15)
    except (httpx.ConnectError, httpx.TimeoutException) as net_err:
        pytest.skip(f"Ambiente de teste não acessível ({net_err}). Configure RAILWAY_API_URL.")

    assert response.status_code == 200, f"Erro ao acessar {OFFERS_ENDPOINT}: status {response.status_code}"
    data = response.json()

    offers = data.get("offers") or data.get("items", [])
    assert len(offers) > 0, "Nenhuma oferta encontrada no endpoint para validação."

    validated_count = 0
    for offer in offers:
        link = offer.get("affiliate_link")
        store = offer.get("store", "")
        if link:
            validate_affiliate_link(link, store)
            validated_count += 1

    assert validated_count > 0, "Nenhum link de afiliado válido encontrado nas ofertas."


def test_validate_affiliate_link_unit():
    """Testa unitariamente a validação de tags corretas e a detecção de tags inválidas."""
    # 1. Amazon válido e inválido
    valid_amazon = f"https://www.amazon.com.br/dp/B0FPBQQ4TN?tag={AMAZON_TAG}"
    validate_affiliate_link(valid_amazon, "Amazon")

    with pytest.raises(AssertionError):
        validate_affiliate_link("https://www.amazon.com.br/dp/B0FPBQQ4TN?tag=tag_errada-20", "Amazon")

    # 2. Mercado Livre válido e inválido
    valid_ml = f"https://www.mercadolivre.com.br/item?matt_tool={ML_TOOL}&matt_word={ML_WORD}"
    validate_affiliate_link(valid_ml, "Mercado Livre")

    with pytest.raises(AssertionError):
        validate_affiliate_link(f"https://www.mercadolivre.com.br/item?matt_tool={ML_TOOL}&matt_word=outra_tag", "Mercado Livre")

    # 3. Shopee válido e inválido
    valid_shopee = f"https://shopee.com.br/product/123/456?af_id={SHOPEE_ID}"
    validate_affiliate_link(valid_shopee, "Shopee")

    valid_shopee_siteid = f"https://shopee.com.br/product/123/456?af_siteid={SHOPEE_ID}"
    validate_affiliate_link(valid_shopee_siteid, "Shopee")

    with pytest.raises(AssertionError):
        validate_affiliate_link("https://shopee.com.br/product/123/456?af_id=9999999999", "Shopee")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
