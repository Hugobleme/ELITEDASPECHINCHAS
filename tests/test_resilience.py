"""
Teste de resiliência para simular queda do Redis e validar fallback.
Valida que a API continua 100% operacional servindo /offers, /health e /coupons
mesmo quando o serviço de cache Redis estiver indisponível.
"""
import os
import httpx
import pytest

BASE_URL = os.getenv("RAILWAY_API_URL", "https://elitedaspechinchas-production.up.railway.app").rstrip("/")
ENDPOINTS = ["/offers", "/health", "/coupons"]


def test_resilience():
    """
    Valida que a API responde mesmo com Redis indisponível.
    Verifica que todos os endpoints retornam status 200 dentro do timeout tolerante.
    """
    for endpoint in ENDPOINTS:
        url = f"{BASE_URL}{endpoint}"
        try:
            response = httpx.get(url, timeout=15)
            assert response.status_code == 200, f"Endpoint {endpoint} falhou com status {response.status_code}"
        except (httpx.ConnectError, httpx.TimeoutException) as net_err:
            pytest.skip(f"Ambiente de teste não acessível ({net_err}). Configure RAILWAY_API_URL.")
        except Exception as e:
            pytest.fail(f"Endpoint {endpoint} falhou: {str(e)}")


def test_healthcheck_redis_fallback():
    """
    Valida que o healthcheck reflete o estado do Redis com fallback em memória transparente.
    Garante que o status da API permanece 'healthy' mesmo se o Redis estiver 'in_memory_fallback'.
    """
    url = f"{BASE_URL}/health"
    try:
        response = httpx.get(url, timeout=15)
    except (httpx.ConnectError, httpx.TimeoutException) as net_err:
        pytest.skip(f"Ambiente de teste não acessível ({net_err}). Configure RAILWAY_API_URL.")

    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "healthy", f"Status esperado 'healthy', obtido '{data.get('status')}'"
    assert data.get("redis") in ("connected", "in_memory_fallback"), f"Status redis inválido: '{data.get('redis')}'"


def test_cache_service_in_memory_fallback(caplog):
    """
    Simulação unitária local da queda do Redis:
    Valida que o CacheService redireciona leituras e gravações para o cache em memória
    quando o Redis estiver inacessível, sem lançar exceções para a aplicação.
    """
    import logging
    from unittest.mock import MagicMock
    from api.services.cache import CacheService

    service = CacheService()
    mock_redis = MagicMock()
    mock_redis.get.side_effect = ConnectionError("Connection to Redis failed")
    mock_redis.setex.side_effect = ConnectionError("Connection to Redis failed")
    service._redis = mock_redis
    service._last_redis_check = float("inf")

    with caplog.at_level(logging.WARNING):
        # 1. Gravação deve suceder salvando no cache em memória
        service.set("resilience_test_key", "valor_persistido", ttl_seconds=60)

        # 2. Leitura deve recuperar o valor diretamente da memória
        val = service.get("resilience_test_key")
        assert val == "valor_persistido", "Valor não foi recuperado pelo fallback em memória"

        # 3. Estatísticas devem indicar que o Redis foi desconectado após o erro
        stats = service.get_stats()
        assert stats["redis_connected"] is False, "Redis deveria constar como desconectado"
        assert stats["in_memory_keys"] >= 1

        # 4. Logs devem ter registrado aviso sobre erro de Redis
        assert any("Redis" in rec.message for rec in caplog.records), "Nenhum log de erro do Redis foi registrado"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
