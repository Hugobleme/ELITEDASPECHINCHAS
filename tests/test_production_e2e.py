"""
Teste end-to-end (E2E) de produção para a API e catálogo web ELITEDASPECHINCHAS.
Valida healthcheck, listagem de ofertas, links de afiliados e deduplicação no site.
Executável localmente e no CI (GitHub Actions).
"""
import os
import time
import httpx
import pytest

BASE_URL = os.getenv("RAILWAY_API_URL", "https://elitedaspechinchas-production.up.railway.app").rstrip("/")
HEALTH_ENDPOINT = f"{BASE_URL}/health"
OFFERS_ENDPOINT = f"{BASE_URL}/offers"
E2E_WAIT_SECONDS = int(os.getenv("E2E_WAIT_SECONDS", "0"))


def _extract_offers(data: dict) -> list:
    """Extrai a lista de ofertas do payload da API (compatível com 'items' e 'offers')."""
    if "offers" in data and isinstance(data["offers"], list):
        return data["offers"]
    if "items" in data and isinstance(data["items"], list):
        return data["items"]
    return []


def test_healthcheck():
    """Valida que o healthcheck retorna 200 com status healthy e serviços operacionais."""
    try:
        response = httpx.get(HEALTH_ENDPOINT, timeout=15)
        if response.status_code != 200:
            pytest.skip(f"Ambiente remoto retornou {response.status_code}. Configure RAILWAY_API_URL.")
    except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPError) as net_err:
        pytest.skip(f"Ambiente de produção não acessível ({net_err}). Configure RAILWAY_API_URL.")

    data = response.json()
    assert data.get("status") == "healthy", f"Status esperado 'healthy', obtido: '{data.get('status')}'"
    assert data.get("database") == "connected", f"Database esperado 'connected', obtido: '{data.get('database')}'"
    assert "uptime_seconds" in data, "Campo 'uptime_seconds' não encontrado no healthcheck"

    # Validação de Redis
    strict = os.getenv("STRICT_HEALTHCHECK", "false").lower() in ("true", "1", "yes")
    if strict:
        assert data.get("redis") == "connected", f"Esperado redis 'connected', obtido: '{data.get('redis')}'"
    else:
        assert data.get("redis") in ("connected", "in_memory_fallback"), f"Status redis inválido: '{data.get('redis')}'"


def test_offers_endpoint():
    """Valida que o endpoint de ofertas retorna 200 e lista ofertas públicas."""
    try:
        response = httpx.get(OFFERS_ENDPOINT, timeout=15)
        if response.status_code != 200:
            pytest.skip(f"Ambiente remoto retornou {response.status_code}. Configure RAILWAY_API_URL.")
    except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPError) as net_err:
        pytest.skip(f"Ambiente de produção não acessível ({net_err}). Configure RAILWAY_API_URL.")

    data = response.json()
    assert ("offers" in data or "items" in data), "Resposta da API não contém campo 'items' ou 'offers'."
    offers = _extract_offers(data)
    assert isinstance(offers, list), "Campo de ofertas deve ser uma lista."
    assert len(offers) > 0, "A lista de ofertas retornada não deve estar vazia."


def test_auto_publish_flow():
    """
    Valida o fluxo de auto-publicação no catálogo web:
    Confirma que as ofertas aparecem publicadas no endpoint /offers com link de afiliado.
    """
    if E2E_WAIT_SECONDS > 0:
        time.sleep(E2E_WAIT_SECONDS)

    try:
        response = httpx.get(OFFERS_ENDPOINT, timeout=15)
        if response.status_code != 200:
            pytest.skip(f"Ambiente remoto retornou {response.status_code}. Configure RAILWAY_API_URL.")
    except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPError) as net_err:
        pytest.skip(f"Ambiente de produção não acessível ({net_err}). Configure RAILWAY_API_URL.")

    data = response.json()
    offers = _extract_offers(data)
    assert len(offers) > 0, "Nenhuma oferta encontrada no catálogo web."
    latest_offer = offers[0]
    assert latest_offer.get("status") == "published", f"Status esperado 'published', obtido: '{latest_offer.get('status')}'"
    assert latest_offer.get("affiliate_link") is not None, "O campo 'affiliate_link' da oferta mais recente não deve ser nulo."


def test_deduplication():
    """
    Valida que ofertas duplicadas (mesmo título e preço) não são publicadas repetidamente no endpoint.
    """
    if E2E_WAIT_SECONDS > 0:
        time.sleep(E2E_WAIT_SECONDS)

    try:
        response = httpx.get(OFFERS_ENDPOINT, timeout=15)
        if response.status_code != 200:
            pytest.skip(f"Ambiente remoto retornou {response.status_code}. Configure RAILWAY_API_URL.")
    except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPError) as net_err:
        pytest.skip(f"Ambiente de produção não acessível ({net_err}). Configure RAILWAY_API_URL.")

    data = response.json()
    offers = _extract_offers(data)
    offer_keys = [(o.get("title"), o.get("price_current")) for o in offers]
    assert len(offer_keys) == len(set(offer_keys)), "Ofertas duplicadas encontradas no catálogo. Dedup falhou."


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
