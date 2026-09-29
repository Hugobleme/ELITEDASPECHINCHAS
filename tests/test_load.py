"""
Teste de carga para validar latência p95 < 100ms sob concorrência.
Dispara requisições simultâneas contra os endpoints /offers, /health e /coupons.
Mede a latência de processamento da API (p50, p95, p99) e a taxa de erro.
"""
import os
import time
import asyncio
import statistics
import httpx
import pytest

BASE_URL = os.getenv("RAILWAY_API_URL", "https://elitedaspechinchas-production.up.railway.app").rstrip("/")
ENDPOINTS = ["/offers", "/health", "/coupons"]
CONCURRENCY = int(os.getenv("LOAD_TEST_CONCURRENCY", "50"))
DEFAULT_DURATION = "5" if os.getenv("CI", "").lower() in ("true", "1") else "30"
DURATION_SECONDS = int(os.getenv("LOAD_TEST_DURATION", DEFAULT_DURATION))
MAX_P95_MS = float(os.getenv("LOAD_TEST_MAX_P95_MS", "100.0"))
MAX_ERROR_RATE = float(os.getenv("LOAD_TEST_MAX_ERROR_RATE", "1.0"))
METRIC_MODE = os.getenv("LOAD_TEST_METRIC", "auto").lower()  # "auto", "server", "network"


async def fetch_endpoint(
    client: httpx.AsyncClient,
    endpoint: str,
    server_latencies: list,
    network_latencies: list,
    errors: list,
    headers: dict | None = None,
):
    url = f"{BASE_URL}{endpoint}"
    t0 = time.perf_counter()
    try:
        response = await client.get(url, headers=headers)
        rtt_ms = (time.perf_counter() - t0) * 1000.0

        if response.status_code in (200, 304):
            network_latencies.append(rtt_ms)

            # Extrai tempo de processamento interno da API a partir do header X-Response-Time (ex: '4.50ms')
            x_resp = response.headers.get("x-response-time")
            if x_resp and x_resp.endswith("ms"):
                try:
                    server_latencies.append(float(x_resp[:-2]))
                except ValueError:
                    server_latencies.append(rtt_ms)
            else:
                server_latencies.append(rtt_ms)
        else:
            errors.append((endpoint, response.status_code))
    except Exception as exc:
        errors.append((endpoint, str(exc)))


async def run_load_test():
    # 1. Pré-checagem de conectividade com skip gracioso se a URL não estiver acessível
    try:
        async with httpx.AsyncClient(timeout=10) as check_client:
            res = await check_client.get(f"{BASE_URL}/health")
            if res.status_code != 200:
                pytest.skip(f"Healthcheck retornou {res.status_code}. Ambiente de teste indisponível.")
    except (httpx.ConnectError, httpx.TimeoutException) as net_err:
        pytest.skip(f"Ambiente de teste não acessível ({net_err}). Configure RAILWAY_API_URL.")

    server_latencies: list[float] = []
    network_latencies: list[float] = []
    errors: list = []

    limits = httpx.Limits(
        max_connections=CONCURRENCY * 2,
        max_keepalive_connections=CONCURRENCY,
    )
    headers = {
        "Accept": "application/json",
        "User-Agent": "EliteDasPechinchas-LoadTest/1.0",
        "Authorization": f"Bearer {os.getenv('LOAD_TEST_AUTH_TOKEN', 'loadtest-bench-token')}",
    }

    async with httpx.AsyncClient(timeout=15.0, limits=limits) as client:
        loop = asyncio.get_running_loop()
        end_time = loop.time() + DURATION_SECONDS

        while loop.time() < end_time:
            tasks = [
                fetch_endpoint(
                    client,
                    ENDPOINTS[i % len(ENDPOINTS)],
                    server_latencies,
                    network_latencies,
                    errors,
                    headers=headers,
                )
                for i in range(CONCURRENCY)
            ]
            await asyncio.gather(*tasks)
            await asyncio.sleep(0.05)

    total_requests = len(network_latencies) + len(errors)
    if total_requests == 0:
        pytest.fail("Nenhuma requisição foi executada durante o teste de carga.")

    error_rate = (len(errors) / total_requests) * 100.0

    # Seleção da métrica a ser avaliada no assert (server, network ou auto)
    if METRIC_MODE == "network":
        eval_latencies = network_latencies
        metric_name = "Network RTT"
    elif METRIC_MODE == "server" or (METRIC_MODE == "auto" and server_latencies):
        eval_latencies = server_latencies
        metric_name = "API Server Latency (X-Response-Time)"
    else:
        eval_latencies = network_latencies
        metric_name = "Network RTT"

    if len(eval_latencies) < 10:
        pytest.fail(f"Poucas respostas válidas ({len(eval_latencies)}) para calcular percentis de latência.")

    eval_latencies.sort()
    n = len(eval_latencies)
    p50 = statistics.median(eval_latencies)
    p95 = eval_latencies[int(n * 0.95)]
    p99 = eval_latencies[int(n * 0.99)]

    net_p50 = statistics.median(network_latencies) if network_latencies else 0.0
    network_latencies.sort()
    net_p95 = network_latencies[int(len(network_latencies) * 0.95)] if network_latencies else 0.0
    net_p99 = network_latencies[int(len(network_latencies) * 0.99)] if network_latencies else 0.0

    print("\n" + "=" * 65)
    print(" RELATORIO DO TESTE DE CARGA (LOAD TEST)")
    print("=" * 65)
    print(f" URL Alvo:          {BASE_URL}")
    print(f" Endpoints:         {', '.join(ENDPOINTS)}")
    print(f" Duracao:           {DURATION_SECONDS}s")
    print(f" Concorrencia:      {CONCURRENCY} workers")
    print(f" Total Requisicoes: {total_requests}")
    print(f" Sucessos (200):    {len(eval_latencies)}")
    print(f" Erros:             {len(errors)} ({error_rate:.2f}%)")
    print("-" * 65)
    print(f" Metrica Avaliada:  {metric_name}")
    print(f"    p50: {p50:.2f}ms")
    print(f"    p95: {p95:.2f}ms (Limite max: {MAX_P95_MS:.2f}ms)")
    print(f"    p99: {p99:.2f}ms")
    if metric_name != "Network RTT" and network_latencies:
        print(f" Network RTT (Transito WAN/Internet):")
        print(f"    p50: {net_p50:.2f}ms | p95: {net_p95:.2f}ms | p99: {net_p99:.2f}ms")
    print("=" * 65)

    assert p95 < MAX_P95_MS, f"p95 ({p95:.2f}ms) > {MAX_P95_MS:.2f}ms na métrica '{metric_name}'"
    assert error_rate <= MAX_ERROR_RATE, f"Taxa de erro ({error_rate:.2f}%) > {MAX_ERROR_RATE:.2f}%"


def test_load():
    """Valida latência p95 < 100ms e taxa de erros < 1% sob concorrência."""
    asyncio.run(run_load_test())


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
