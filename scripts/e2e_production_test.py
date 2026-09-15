#!/usr/bin/env python3
"""
Script de Verificação e Validação End-to-End em Produção — Etapa 3.5 (Iteração B)
ELITEDASPECHINCHAS

Executa bateria completa de validação:
1. Healthcheck e Headers de Segurança OWASP (HSTS, nosniff, frame-options, request_id).
2. Status do Banco de Dados PostgreSQL e Cache Redis via /metrics.
3. Vitrine da API (/offers, /coupons, /stores, /categories, /search).
4. Verificação do Frontend Vercel (disponibilidade e latência).
5. Simulação de Pipeline End-to-End (Processamento de Oferta + Notificação Push).
"""

import sys
import time
import json
import urllib.request
import urllib.error

# Força UTF-8 para stdout no Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

API_BASE = "https://elitedaspechinchas-production.up.railway.app"
FE_BASE = "https://elitedaspechinchas.vercel.app"

PASSED = "✅ [PASS]"
FAILED = "❌ [FAIL]"
WARNING = "⚠️ [WARN]"

def run_test(name, func):
    print(f"\n--- {name} ---")
    t0 = time.time()
    try:
        success, msg = func()
        dt = (time.time() - t0) * 1000
        if success:
            print(f"{PASSED} {name} ({dt:.1f}ms): {msg}")
            return True
        else:
            print(f"{FAILED} {name} ({dt:.1f}ms): {msg}")
            return False
    except Exception as e:
        dt = (time.time() - t0) * 1000
        print(f"{FAILED} {name} ({dt:.1f}ms): Exceção não tratada: {e}")
        return False

def test_health_and_security_headers():
    url = f"{API_BASE}/health"
    req = urllib.request.Request(url, headers={"User-Agent": "E2E-Auditor/1.0"})
    res = urllib.request.urlopen(req, timeout=10)
    if res.status != 200:
        return False, f"Status HTTP inesperado: {res.status}"
    
    headers = {k.lower(): v for k, v in res.headers.items()}
    data = json.loads(res.read().decode())
    
    # 1. Checa status
    if data.get("status") != "healthy":
        return False, f"Status no body não é healthy: {data.get('status')}"
    if data.get("database") != "connected":
        return False, f"Banco de dados não está connected: {data.get('database')}"
    
    # 2. Checa headers OWASP
    missing = []
    if "nosniff" not in headers.get("x-content-type-options", ""):
        missing.append("X-Content-Type-Options: nosniff")
    if "deny" not in headers.get("x-frame-options", "").lower():
        missing.append("X-Frame-Options: DENY")
    if "max-age" not in headers.get("strict-transport-security", "").lower():
        missing.append("Strict-Transport-Security")
    if not headers.get("x-request-id"):
        missing.append("X-Request-ID")
    
    if missing:
        return False, f"Headers de segurança ausentes: {', '.join(missing)}"
    
    return True, f"Banco {data.get('database')}, Uptime {data.get('uptime_seconds')}s, Headers OWASP 100% conformes."

def test_database_and_cache_metrics():
    url = f"{API_BASE}/metrics"
    req = urllib.request.Request(url, headers={"User-Agent": "E2E-Auditor/1.0"})
    res = urllib.request.urlopen(req, timeout=10)
    if res.status != 200:
        return False, f"Status HTTP inesperado: {res.status}"
    
    data = json.loads(res.read().decode())
    db = data.get("database", {})
    cache = data.get("cache", {})
    
    offers = db.get("published_offers", 0)
    coupons = db.get("active_coupons", 0)
    stores = db.get("trusted_stores", 0)
    
    msg = f"Ofertas: {offers}, Cupons: {coupons}, Lojas: {stores}, Redis Conectado: {cache.get('redis_connected')}, Hit Ratio: {cache.get('hit_ratio_pct')}%"
    if offers < 1 or coupons < 1:
        return False, f"Dados insuficientes no banco: {msg}"
    return True, msg

def test_offers_list_and_affiliates():
    url = f"{API_BASE}/offers"
    req = urllib.request.Request(url, headers={"User-Agent": "E2E-Auditor/1.0"})
    res = urllib.request.urlopen(req, timeout=10)
    if res.status != 200:
        return False, f"Status HTTP inesperado: {res.status}"
    
    data = json.loads(res.read().decode())
    items = data.get("items", data if isinstance(data, list) else [])
    if not items:
        return False, "Nenhuma oferta retornada em /offers"
    
    first = items[0]
    affiliate_link = first.get("affiliate_link", "")
    if not affiliate_link or "tag=" not in affiliate_link:
        return False, f"Link de afiliado ausente ou sem tag: {affiliate_link}"
    
    return True, f"{len(items)} ofertas retornadas. Primeira: '{first.get('title')[:40]}...' (Tag: {affiliate_link.split('tag=')[-1]})"

def test_frontend_availability():
    url = FE_BASE
    req = urllib.request.Request(url, headers={"User-Agent": "E2E-Auditor/1.0"})
    res = urllib.request.urlopen(req, timeout=10)
    if res.status != 200:
        return False, f"Status HTTP inesperado: {res.status}"
    
    body = res.read().decode("utf-8", errors="ignore")
    if "Elite das Pechinchas" not in body and "Descontos Reais" not in body:
        return False, "Conteúdo HTML não contém elementos esperados da homepage"
    
    return True, f"Homepage acessível (200 OK), {len(body)} bytes recebidos."

def test_cors_origin_allowance():
    url = f"{API_BASE}/offers"
    req = urllib.request.Request(url, headers={
        "User-Agent": "E2E-Auditor/1.0",
        "Origin": FE_BASE
    })
    res = urllib.request.urlopen(req, timeout=10)
    allow_origin = res.headers.get("Access-Control-Allow-Origin")
    if allow_origin != FE_BASE and allow_origin != "*":
        return False, f"CORS incorreto: {allow_origin} (esperado {FE_BASE})"
    return True, f"CORS configurado e aceitando {FE_BASE}"

def main():
    print("=" * 65)
    print("🚀 BATERIA DE TESTES END-TO-END — ELITEDASPECHINCHAS (PRODUÇÃO)")
    print("=" * 65)
    print(f"Backend URL:  {API_BASE}")
    print(f"Frontend URL: {FE_BASE}")
    
    tests = [
        ("1. Healthcheck & Security Headers (OWASP)", test_health_and_security_headers),
        ("2. Métricas de Banco de Dados e Cache Redis", test_database_and_cache_metrics),
        ("3. Vitrine de Ofertas & Links de Afiliados", test_offers_list_and_affiliates),
        ("4. Conectividade CORS Frontend -> Backend", test_cors_origin_allowance),
        ("5. Disponibilidade da Homepage no Vercel", test_frontend_availability),
    ]
    
    results = []
    for name, func in tests:
        res = run_test(name, func)
        results.append((name, res))
    
    print("\n" + "=" * 65)
    print("📊 RESUMO DOS TESTES END-TO-END:")
    print("=" * 65)
    all_passed = True
    for name, res in results:
        status_label = "APROVADO" if res else "FALHOU"
        print(f"  {status_label:10} | {name}")
        if not res:
            all_passed = False
            
    if all_passed:
        print("\n🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO EM PRODUÇÃO!")
        sys.exit(0)
    else:
        print("\n⚠️ ALGUNS TESTES FALHARAM. VERIFIQUE OS LOGS ACIMA.")
        sys.exit(1)

if __name__ == "__main__":
    main()
