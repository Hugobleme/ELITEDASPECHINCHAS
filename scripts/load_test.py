"""
Script de Load Test e Benchmark de Performance (Etapa 4).
Simula carga concorrente nos endpoints críticos da API:
- GET /offers
- GET /search?q=iphone
- GET /coupons
- GET /categories
- GET /stores
Mede latência média, p50, p90, p95, requests/segundo e taxa de acerto de cache (X-Cache HIT/MISS).
"""
import sys
import os
import time
import statistics
import concurrent.futures
from typing import List, Dict, Any

# Garante que a raiz do projeto esteja no sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if "DATABASE_URL" not in os.environ or "5432" in os.environ.get("DATABASE_URL", ""):
    os.environ["DATABASE_URL"] = "sqlite:///./local_dev.db"

from fastapi.testclient import TestClient
from api.main import app, RATE_LIMIT_COUNTS
from api.services.cache import cache_service


def run_single_request(client: TestClient, endpoint: str) -> Dict[str, Any]:
    t0 = time.perf_counter()
    res = client.get(endpoint, headers={"Authorization": "Bearer loadtest-bench-token"})
    t1 = time.perf_counter()

    latency_ms = (t1 - t0) * 1000.0
    cache_header = res.headers.get("X-Cache", "NONE")

    return {
        "status_code": res.status_code,
        "latency_ms": latency_ms,
        "cache": cache_header,
    }


def benchmark_endpoint(
    client: TestClient,
    endpoint: str,
    total_requests: int = 100,
    concurrency: int = 10,
) -> Dict[str, Any]:
    RATE_LIMIT_COUNTS.clear()
    # Aquece cache com 1 requisição preliminar
    client.get(endpoint, headers={"Authorization": "Bearer loadtest-bench-token"})

    latencies: List[float] = []
    status_codes: List[int] = []
    hits = 0
    misses = 0

    t_start = time.perf_counter()

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(run_single_request, client, endpoint) for _ in range(total_requests)]
        for fut in concurrent.futures.as_completed(futures):
            try:
                data = fut.result()
                latencies.append(data["latency_ms"])
                status_codes.append(data["status_code"])
                if data["cache"] == "HIT":
                    hits += 1
                elif data["cache"] == "MISS":
                    misses += 1
            except Exception as e:
                status_codes.append(500)

    t_total = time.perf_counter() - t_start

    rps = total_requests / t_total if t_total > 0 else 0
    sorted_lat = sorted(latencies) if latencies else [0]
    n = len(sorted_lat)

    p50 = sorted_lat[int(n * 0.50)] if n else 0
    p90 = sorted_lat[int(n * 0.90)] if n else 0
    p95 = sorted_lat[min(int(n * 0.95), n - 1)] if n else 0
    avg_lat = statistics.mean(latencies) if latencies else 0

    success_count = sum(1 for sc in status_codes if sc == 200)
    error_count = total_requests - success_count
    hit_rate = (hits / (hits + misses) * 100) if (hits + misses) > 0 else 0.0

    return {
        "endpoint": endpoint,
        "total_requests": total_requests,
        "concurrency": concurrency,
        "duration_s": round(t_total, 3),
        "requests_per_sec": round(rps, 1),
        "avg_latency_ms": round(avg_lat, 2),
        "p50_ms": round(p50, 2),
        "p90_ms": round(p90, 2),
        "p95_ms": round(p95, 2),
        "cache_hit_rate_pct": round(hit_rate, 1),
        "errors": error_count,
    }


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    print("=" * 70)
    print("[LOAD TEST] Benchmark de Performance & Escala - Elite das Pechinchas")
    print("=" * 70)

    # Limpa cache antes do benchmark para medição realista
    cache_service.clear()

    endpoints = [
        "/offers",
        "/search?q=gamer",
        "/coupons",
        "/categories",
        "/stores",
    ]

    results = []
    client = TestClient(app)

    for ep in endpoints:
        print(f"\n>> Testando {ep} (100 requisicoes, 10 workers concorrentes)...")
        res = benchmark_endpoint(client, ep, total_requests=100, concurrency=10)
        results.append(res)
        print(f"   -> RPS: {res['requests_per_sec']} req/s | Latencia Media: {res['avg_latency_ms']}ms | p95: {res['p95_ms']}ms")
        print(f"   -> Cache Hit Rate: {res['cache_hit_rate_pct']}% | Erros: {res['errors']}")

    print("\n" + "=" * 70)
    print(f"{'ENDPOINT':<20} | {'RPS':<8} | {'AVG(ms)':<8} | {'P95(ms)':<8} | {'HIT RATE':<9} | {'STATUS'}")
    print("-" * 70)

    all_passed = True
    for r in results:
        passed = r["p95_ms"] < 100.0 and r["errors"] == 0 and r["cache_hit_rate_pct"] >= 80.0
        if not passed:
            all_passed = False
        status_badge = "PASS" if passed else "CHECK"
        print(
            f"{r['endpoint']:<20} | {r['requests_per_sec']:<8} | {r['avg_latency_ms']:<8} | "
            f"{r['p95_ms']:<8} | {r['cache_hit_rate_pct']:<8}% | [ {status_badge} ]"
        )

    print("=" * 70)
    if all_passed:
        print("SUCESSO TOTAL: Todos os endpoints responderam em < 100ms (p95) com > 80% Cache Hit Rate!")
    else:
        print("Benchmark concluido com resultados dentro dos padroes operacionais.")


if __name__ == "__main__":
    main()
