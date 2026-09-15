"""
Testes de Otimização, Analytics, Cache e Escala (Etapa 4).
Verifica headers X-Cache (HIT/MISS), invalidação em mutações,
rate limiting (429 + Retry-After), endpoint de métricas e Celery tasks.
"""
import pytest
from database.models import Offer, Coupon, PriceAlert, Notification, User
from api.services.cache import cache_service
from processor.tasks import task_check_price_alerts, task_send_weekly_newsletter


def test_cache_hit_and_miss_offers(client, sample_offer):
    """Verifica que a 1a requisição gera MISS e a 2a gera HIT com X-Cache header."""
    cache_service.clear()

    # 1a chamada -> MISS
    res1 = client.get("/offers")
    assert res1.status_code == 200
    assert res1.headers.get("X-Cache") == "MISS"
    data1 = res1.json()
    assert data1["total"] == 1

    # 2a chamada -> HIT
    res2 = client.get("/offers")
    assert res2.status_code == 200
    assert res2.headers.get("X-Cache") == "HIT"
    data2 = res2.json()
    assert data2["total"] == 1
    assert data2["items"][0]["id"] == sample_offer.id


def test_cache_invalidation_on_create_offer(client, sample_offer):
    """Verifica que cadastrar uma nova oferta invalida o cache de /offers."""
    cache_service.clear()

    # Popula cache
    res1 = client.get("/offers")
    assert res1.status_code == 200
    assert res1.headers.get("X-Cache") == "MISS"

    res_cached = client.get("/offers")
    assert res_cached.headers.get("X-Cache") == "HIT"

    # Cria nova oferta
    new_offer_payload = {
        "title": "Nova Oferta Teste Cache",
        "price_current": 199.90,
        "price_original": 299.90,
        "store": "Amazon",
        "category": "eletronicos",
        "original_link": "https://www.amazon.com.br/dp/B0NEWOFFER1",
        "status": "published",
    }
    res_create = client.post("/offers", json=new_offer_payload)
    assert res_create.status_code == 201

    # Nova leitura deve ser MISS devido à invalidação de cache
    res_after = client.get("/offers")
    assert res_after.status_code == 200
    assert res_after.headers.get("X-Cache") == "MISS"
    assert res_after.json()["total"] == 2


def test_cache_hit_and_miss_coupons(client):
    """Verifica comportamento de cache HIT/MISS para cupons."""
    cache_service.clear()

    res1 = client.get("/coupons")
    assert res1.status_code == 200
    assert res1.headers.get("X-Cache") == "MISS"

    res2 = client.get("/coupons")
    assert res2.status_code == 200
    assert res2.headers.get("X-Cache") == "HIT"


def test_cache_categories_and_stores(client):
    """Verifica cache de 1h em categorias e lojas."""
    cache_service.clear()

    # Categories
    rc1 = client.get("/categories")
    assert rc1.status_code == 200
    assert rc1.headers.get("X-Cache") == "MISS"

    rc2 = client.get("/categories")
    assert rc2.status_code == 200
    assert rc2.headers.get("X-Cache") == "HIT"

    # Stores
    rs1 = client.get("/stores")
    assert rs1.status_code == 200
    assert rs1.headers.get("X-Cache") == "MISS"

    rs2 = client.get("/stores")
    assert rs2.status_code == 200
    assert rs2.headers.get("X-Cache") == "HIT"


def test_rate_limiting_auth_endpoints(client):
    """Garante que exceder o limite de 30 requisições/min em /auth gera 429 com Retry-After."""
    from api.main import RATE_LIMIT_AUTH_COUNTS
    RATE_LIMIT_AUTH_COUNTS.clear()

    # Simula 30 tentativas
    for _ in range(30):
        client.post("/auth/login", json={"email": "dummy@test.com", "password": "wrong"})

    # A 31a requisição deve ser bloqueada
    blocked_res = client.post("/auth/login", json={"email": "dummy@test.com", "password": "wrong"})
    assert blocked_res.status_code == 429
    assert blocked_res.headers.get("Retry-After") == "60"
    assert "Muitas tentativas" in blocked_res.json()["detail"]

    RATE_LIMIT_AUTH_COUNTS.clear()


def test_metrics_endpoint(client):
    """Verifica que o endpoint /api/metrics retorna dados de volumetria e estatísticas de cache."""
    res = client.get("/api/metrics")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "operational"
    assert "database" in data
    assert "cache" in data
    assert "hits" in data["cache"]
    assert "misses" in data["cache"]


def test_celery_task_check_price_alerts(db_session, test_user):
    """Testa a lógica da task de verificação de alertas de preço."""
    # Cria alerta para o usuário
    alert = PriceAlert(
        user_id=test_user.id,
        keyword="Notebook",
        max_price=4000.0,
        active=True,
    )
    db_session.add(alert)

    # Cria oferta correspondente
    offer = Offer(
        title="Notebook Gamer Dell G15",
        price_current=3899.0,
        price_original=5000.0,
        discount_pct=22,
        store="Dell",
        category="informatica",
        image_url="https://img.com/notebook.jpg",
        affiliate_link="https://dell.com/notebook",
        status="published",
        is_active=True,
    )
    db_session.add(offer)
    db_session.commit()

    # Executa a task
    result = task_check_price_alerts(db=db_session)
    assert result["status"] == "success"
    assert result["alerts_checked"] >= 1
    assert result["matches_found"] >= 1
    assert result["notifications_created"] >= 1

    # Valida registro de notificação
    notif = db_session.query(Notification).filter(Notification.user_id == test_user.id).first()
    assert notif is not None
    assert notif.offer_id == offer.id


def test_celery_task_send_weekly_newsletter(db_session, sample_offer):
    """Testa a compilação semanal de ofertas de destaque."""
    result = task_send_weekly_newsletter(top_n=5, db=db_session)
    assert result["status"] == "success"
    assert result["top_deals_count"] >= 1
    assert len(result["deals"]) >= 1
    assert result["deals"][0]["title"] == sample_offer.title
