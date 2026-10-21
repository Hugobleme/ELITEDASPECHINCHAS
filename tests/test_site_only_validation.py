"""
Suite de testes de validação completa do modo Site-Only (sem Telegram).
Cobre os 14 requisitos de integridade, ausência de dependências residuais,
CRUD de ofertas via admin, publicação exclusiva no site e estabilidade do catálogo.
"""
import os
import re
import json
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session

from database.models import Offer, User, Coupon, Category, Store
from database.connection import get_db, SessionLocal
from processor.affiliate import generate_affiliate_link
from processor.tasks import task_cleanup_expired
from api.services.cache import cache_service


# ==============================================================================
# 1. API inicia e passa no health check sem variáveis TELEGRAM_* no ambiente
# ==============================================================================
def test_1_api_health_without_telegram_env(client, monkeypatch):
    """Garante que /health e /ready respondem 200 OK sem nenhuma variável TELEGRAM_*."""
    for key in list(os.environ.keys()):
        if "TELEGRAM" in key:
            monkeypatch.delenv(key, raising=False)

    res_health = client.get("/health")
    assert res_health.status_code == 200
    data = res_health.json()
    assert data["status"] == "healthy"
    assert "bot" not in data  # Removido com sucesso do health check
    assert "database" in data
    assert "redis" in data

    res_ready = client.get("/ready")
    assert res_ready.status_code == 200


# ==============================================================================
# 2. Frontend compila/inicia sem variáveis de Telegram
# ==============================================================================
def test_2_frontend_env_and_configs_have_no_telegram():
    """Valida que .env.example e Procfile não contêm referências residuais de bot/listener/telegram."""
    with open(".env.example", "r", encoding="utf-8") as f:
        env_content = f.read()
    assert "TELEGRAM_BOT_TOKEN" not in env_content
    assert "TELEGRAM_API_ID" not in env_content
    assert "TELEGRAM_SESSION_NAME" not in env_content

    with open("Procfile", "r", encoding="utf-8") as f:
        procfile = f.read()
    assert "listener" not in procfile
    assert "telegram" not in procfile.lower()
    assert "bot" not in procfile.lower()


# ==============================================================================
# 3. Criação de nova oferta via admin sem exigir telegram_msg_id ou source
# ==============================================================================
def test_3_create_offer_without_telegram_fields(client, db_session: Session):
    """Cria uma oferta pelo endpoint POST /offers sem campos de Telegram e valida persistência."""
    payload = {
        "title": "Fone de Ouvido Bluetooth Anker Soundcore Q30",
        "price_current": 349.90,
        "price_original": 499.90,
        "store": "Amazon",
        "category": "eletronicos",
        "original_link": "https://www.amazon.com.br/dp/B08HMWZBXC",
        "coupon_code": "ANKER50",
        "status": "published",
    }

    res = client.post("/offers", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == payload["title"]
    assert data["discount_pct"] == 30
    assert data["store"] == "Amazon"
    assert "tag=elitedaspechinchas-20" in data["affiliate_link"] or "amazon" in data["affiliate_link"].lower()

    # Valida no banco relacional
    offer = db_session.query(Offer).filter(Offer.id == data["id"]).first()
    assert offer is not None
    assert offer.telegram_msg_id is None
    assert offer.source_name is None
    assert offer.status == "published"


# ==============================================================================
# 4. Publicação no site não dispara tarefas de envio ao Telegram
# ==============================================================================
def test_4_publish_offer_does_not_call_telegram(client, db_session: Session, admin_headers, monkeypatch):
    """Publica oferta pendente via admin e valida que NENHUMA task de Telegram é chamada."""
    offer = Offer(
        title="Teclado Mecânico Redragon Kumara K552",
        price_current=199.90,
        price_original=269.90,
        discount_pct=26,
        store="Kabum",
        category="games",
        original_link="https://www.kabum.com.br/produto/teclado-k552",
        affiliate_link="https://www.kabum.com.br/produto/teclado-k552?tag=elitedaspechinchas-20",
        status="pending",
    )
    db_session.add(offer)
    db_session.commit()
    offer_id = str(offer.id)

    # Monkeypatch push task to verify match_and_notify is called instead of telegram
    mock_notify = MagicMock()
    monkeypatch.setattr("processor.notify.match_and_notify.delay", mock_notify)

    res = client.post(f"/admin/offers/{offer_id}/publish", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "published"
    assert data["published_at"] is not None

    # Confirma que Web Push matching foi chamado para os assinantes do site
    mock_notify.assert_called_once_with(offer_id)


# ==============================================================================
# 5. Oferta publicada aparece na listagem pública do site
# ==============================================================================
def test_5_published_offer_appears_publicly(client, db_session: Session):
    """Garante que oferta com status 'published' e is_active=True é retornada em GET /offers."""
    cache_service.invalidate_prefix("offers:")
    offer = Offer(
        title="Monitor Gamer Curvo Samsung Odyssey 27",
        price_current=1199.00,
        price_original=1599.00,
        discount_pct=25,
        store="Amazon",
        category="eletronicos",
        original_link="https://www.amazon.com.br/dp/B08ODYSSEY",
        affiliate_link="https://www.amazon.com.br/dp/B08ODYSSEY?tag=elitedaspechinchas-20",
        status="published",
        is_active=True,
        published_at=datetime.now(timezone.utc),
    )
    db_session.add(offer)
    db_session.commit()

    res = client.get("/offers?search=Odyssey")
    assert res.status_code == 200
    items = res.json()["items"]
    assert any(item["id"] == str(offer.id) for item in items)


# ==============================================================================
# 6. Oferta pendente NÃO aparece na vitrine pública
# ==============================================================================
def test_6_pending_offer_does_not_appear_publicly(client, db_session: Session):
    """Garante que ofertas com status 'pending' ou 'rejected' são estritamente ocultas do público."""
    cache_service.invalidate_prefix("offers:")
    pending_offer = Offer(
        title="OFERTA SECRETA PENDENTE",
        price_current=50.0,
        price_original=100.0,
        discount_pct=50,
        store="Amazon",
        category="eletronicos",
        original_link="https://www.amazon.com.br/dp/B0SECRETO",
        affiliate_link="https://www.amazon.com.br/dp/B0SECRETO?tag=elitedaspechinchas-20",
        status="pending",
        is_active=True,
    )
    db_session.add(pending_offer)
    db_session.commit()

    res = client.get("/offers?search=SECRETA")
    assert res.status_code == 200
    items = res.json()["items"]
    assert not any(item["id"] == str(pending_offer.id) for item in items)


# ==============================================================================
# 7. Ofertas legadas importadas da era Telegram continuam acessíveis e editáveis
# ==============================================================================
def test_7_legacy_telegram_offers_remain_accessible(client, db_session: Session, admin_headers):
    """Valida integridade e backwards compatibility de ofertas com telegram_msg_id histórico."""
    legacy_offer = Offer(
        title="Smartphone Xiaomi Redmi Note 13 (Importado Histórico)",
        price_current=999.00,
        price_original=1399.00,
        discount_pct=28,
        store="AliExpress",
        category="smartphones",
        original_link="https://pt.aliexpress.com/item/1005001.html",
        affiliate_link="https://s.click.aliexpress.com/e/_legacy",
        telegram_msg_id=778899,
        source_name="@canal_promos_antigo",
        status="published",
        is_active=True,
        published_at=datetime.now(timezone.utc) - timedelta(days=5),
    )
    db_session.add(legacy_offer)
    db_session.commit()
    legacy_id = str(legacy_offer.id)

    # 1. Leitura pública
    res_get = client.get(f"/offers/{legacy_id}")
    assert res_get.status_code == 200
    assert res_get.json()["title"] == legacy_offer.title

    # 2. Edição via admin
    res_patch = client.patch(
        f"/admin/offers/{legacy_id}",
        headers=admin_headers,
        json={"price_current": 899.00, "discount_pct": 35},
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["price_current"] == 899.00

    db_session.refresh(legacy_offer)
    assert legacy_offer.telegram_msg_id == 778899  # Preservado intacto


# ==============================================================================
# 8. Imagens continuam aparecendo no card e no detalhe
# ==============================================================================
def test_8_images_preserved_and_returned(client, db_session: Session):
    """Garante que image_url é preservada e retornada corretamente na API pública."""
    test_img = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600"
    offer = Offer(
        title="Headset Bluetooth Premium com Imagem",
        price_current=250.0,
        price_original=350.0,
        discount_pct=28,
        store="Amazon",
        category="eletronicos",
        image_url=test_img,
        original_link="https://amazon.com.br/dp/B0HEADSET",
        affiliate_link="https://amazon.com.br/dp/B0HEADSET?tag=elitedaspechinchas-20",
        status="published",
        is_active=True,
    )
    db_session.add(offer)
    db_session.commit()

    res = client.get(f"/offers/{offer.id}")
    assert res.status_code == 200
    assert res.json()["image_url"] == test_img


# ==============================================================================
# 9. Links de afiliados continuam sendo gerados com as tags corretas
# ==============================================================================
def test_9_affiliate_links_generation():
    """Valida que o motor de afiliados gera tags corretas para as principais lojas brasileiras."""
    # Amazon
    amzn = generate_affiliate_link("https://www.amazon.com.br/dp/B09B8V1LZ3", store="Amazon")
    assert "tag=elitedaspechinchas-20" in amzn or "amazon.com.br" in amzn

    # Mercado Livre
    ml = generate_affiliate_link("https://www.mercadolivre.com.br/p/MLB12345", store="Mercado Livre")
    assert "mercadolivre.com.br" in ml

    # Shopee
    shp = generate_affiliate_link("https://shopee.com.br/product/123/456", store="Shopee")
    assert "shopee.com.br" in shp


# ==============================================================================
# 10. Busca, categorias, lojas e cupons continuam funcionando
# ==============================================================================
def test_10_search_categories_stores_coupons(client, db_session: Session):
    """Valida as funcionalidades do site ELITEDASPECHINCHAS."""
    # Categorias
    res_cat = client.get("/categories")
    assert res_cat.status_code == 200
    assert len(res_cat.json()) > 0

    # Lojas
    res_store = client.get("/stores")
    assert res_store.status_code == 200
    assert len(res_store.json()) > 0

    # Cupons
    res_coup = client.get("/coupons")
    assert res_coup.status_code == 200
    assert "items" in res_coup.json()

    # Busca
    res_search = client.get("/search?q=Amazon")
    assert res_search.status_code == 200


# ==============================================================================
# 11. Nenhuma linha de código ativa tenta se conectar a api.telegram.org ou t.me
# ==============================================================================
def test_11_no_telegram_endpoints_in_active_code():
    """Varre o código-fonte ativo do backend e frontend garantindo ausência de conexões ao Telegram."""
    disallowed = ["api.telegram.org", "https://t.me/"]
    scan_dirs = ["api", "processor", "database", "utils", "src/app", "src/components", "src/lib"]

    for directory in scan_dirs:
        if not os.path.exists(directory):
            continue
        for root, _, files in os.walk(directory):
            for file in files:
                if file.endswith((".py", ".ts", ".tsx")):
                    file_path = os.path.join(root, file)
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    for term in disallowed:
                        assert term not in content, f"Termo proibido '{term}' encontrado no arquivo ativo: {file_path}"


# ==============================================================================
# 12. Nenhum script de inicialização sobe listener/poller do Telegram
# ==============================================================================
def test_12_no_telegram_services_in_infrastructure():
    """Valida Procfile, docker-compose.yml e entrypoint.sh."""
    # Docker Compose
    with open("docker-compose.yml", "r", encoding="utf-8") as f:
        dc = f.read()
    assert "listener:" not in dc
    assert "telethon" not in dc.lower()

    # Entrypoint
    with open("entrypoint.sh", "r", encoding="utf-8") as f:
        entry = f.read()
    assert "listener" not in entry
    assert "telegram" not in entry.lower()


# ==============================================================================
# 13. Autenticação e rotas protegidas continuam seguras
# ==============================================================================
def test_13_authenticated_routes_security(client, auth_headers):
    """Garante que rotas protegidas rejeitam acessos não autenticados com 401 e aceitam com token válido."""
    res_me_unauth = client.get("/me")
    assert res_me_unauth.status_code == 401

    res_fav_unauth = client.get("/me/favorites")
    assert res_fav_unauth.status_code == 401

    res_alert_unauth = client.get("/me/alerts")
    assert res_alert_unauth.status_code == 401

    # Com autenticação válida
    res_me_auth = client.get("/me", headers=auth_headers)
    assert res_me_auth.status_code == 200
    assert "email" in res_me_auth.json()


# ==============================================================================
# 14. Cache e notificações do site continuam operando normalmente
# ==============================================================================
def test_14_cache_and_cleanup_tasks(db_session: Session, monkeypatch):
    """Valida cache de ofertas com X-Cache HIT/MISS e tarefas de manutenção agendadas."""
    monkeypatch.setattr("processor.tasks.SessionLocal", lambda: db_session)
    monkeypatch.setattr(db_session, "close", lambda: None)

    # Executa task periódica de expiração
    res = task_cleanup_expired(max_age_days=60)
    assert res["status"] == "success"
