"""
Testes para as rotas modulares de ofertas e curadoria (/offers, /categories, /stores, /admin).
"""
import pytest
from database.models import Offer


def test_list_offers_empty(client):
    response = client.get("/offers")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["has_more"] is False


def test_list_offers_with_data(client, sample_offer):
    response = client.get("/offers")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["id"] == sample_offer.id
    assert data["items"][0]["title"] == sample_offer.title


def test_list_offers_filter_by_category(client, sample_offer):
    # Match
    res_match = client.get("/offers?category=tv-e-audio")
    assert res_match.status_code == 200
    assert res_match.json()["total"] == 1

    # No match
    res_nomatch = client.get("/offers?category=games")
    assert res_nomatch.status_code == 200
    assert res_nomatch.json()["total"] == 0


def test_get_offer_details_success(client, sample_offer):
    response = client.get(f"/offers/{sample_offer.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == sample_offer.id
    assert data["price_current"] == 2199.00


def test_get_offer_details_not_found(client):
    response = client.get("/offers/nonexistent-id")
    assert response.status_code == 404
    assert response.json()["detail"] == "Oferta não encontrada."


def test_get_categories_and_stores(client, sample_offer):
    res_cats = client.get("/categories")
    assert res_cats.status_code == 200
    cats = res_cats.json()
    assert len(cats) >= 1
    assert cats[0]["slug"] == "tv-e-audio"

    res_stores = client.get("/stores")
    assert res_stores.status_code == 200
    stores = res_stores.json()
    assert len(stores) >= 1
    assert stores[0]["name"] == "Amazon"


def test_track_click(client):
    response = client.post("/events/click", json={"offer_id": "test-123"})
    assert response.status_code == 200
    assert response.json() == {"status": "success", "tracked": True}


from unittest.mock import patch


def test_admin_publish_offer(client, db_session):
    pending_offer = Offer(
        id="pending-off-01",
        title="Monitor Gamer 144Hz",
        price_current=899.0,
        price_original=1299.0,
        discount_pct=30,
        store="Kabum",
        category="games",
        image_url="https://img.com/mon.jpg",
        affiliate_link="https://kabum.com/af",
        status="pending",
    )
    db_session.add(pending_offer)
    db_session.commit()

    with patch("processor.notify.match_and_notify.delay") as mock_notify, \
         patch("processor.tasks.publish_offer_to_channel.delay") as mock_publish:
        response = client.post(f"/admin/offers/{pending_offer.id}/publish")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "published"
        assert data["published_at"] is not None
        mock_notify.assert_called_once_with("pending-off-01")
        mock_publish.assert_called_once_with("pending-off-01")


def test_admin_list_and_filter_offers(client, db_session, sample_offer):
    # Default list
    res = client.get("/admin/offers?status=all")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1

    # Filter by specific status
    res_pending = client.get("/admin/offers?status=pending")
    assert res_pending.status_code == 200
    assert "items" in res_pending.json()


def test_admin_patch_offer(client, db_session, sample_offer):
    res = client.patch(
        f"/admin/offers/{sample_offer.id}",
        json={"title": "Smart TV OLED Atualizada", "price_current": 1999.0, "price_original": 3000.0},
    )
    assert res.status_code == 200
    updated = res.json()
    assert updated["title"] == "Smart TV OLED Atualizada"
    assert updated["price_current"] == 1999.0
    assert updated["discount_pct"] == 33


def test_admin_bulk_actions(client, db_session, sample_offer):
    res = client.post(
        "/admin/offers/bulk",
        json={"ids": [sample_offer.id], "action": "approve"},
    )
    assert res.status_code == 200
    assert res.json()["updated"] == 1


def test_admin_metrics(client, db_session, sample_offer):
    res = client.get("/admin/metrics")
    assert res.status_code == 200
    metrics = res.json()
    assert "total_pending" in metrics
    assert "status_distribution" in metrics
    assert "offers_by_store" in metrics


def test_admin_sources_and_toggle(client, db_session):
    res = client.get("/admin/sources")
    assert res.status_code == 200
    sources = res.json()
    assert len(sources) >= 1

    source_id = sources[0]["id"]
    res_toggle = client.patch(f"/admin/sources/{source_id}", json={"is_active": False})
    assert res_toggle.status_code == 200
    assert res_toggle.json()["is_active"] is False


def test_list_offers_only_published(client, db_session):
    """Garante que apenas ofertas com status 'published' aparecem na vitrine pública."""
    pending = Offer(
        id="offer-pending",
        title="Oferta Pendente",
        price_current=100.0,
        price_original=200.0,
        discount_pct=50,
        store="Amazon",
        category="eletronicos",
        image_url="https://img.com/p.jpg",
        affiliate_link="https://amazon.com.br/dp/123",
        status="pending",
    )
    approved = Offer(
        id="offer-approved",
        title="Oferta Aprovada Nao Publicada",
        price_current=150.0,
        price_original=300.0,
        discount_pct=50,
        store="Amazon",
        category="eletronicos",
        image_url="https://img.com/a.jpg",
        affiliate_link="https://amazon.com.br/dp/456",
        status="approved",
    )
    published = Offer(
        id="offer-pub",
        title="Oferta Real Publicada",
        price_current=180.0,
        price_original=360.0,
        discount_pct=50,
        store="Amazon",
        category="eletronicos",
        image_url="https://img.com/pub.jpg",
        affiliate_link="https://amazon.com.br/dp/789",
        coupon_code="VALE10",
        status="published",
    )
    db_session.add_all([pending, approved, published])
    db_session.commit()

    res = client.get("/offers")
    assert res.status_code == 200
    data = res.json()
    items = data["items"]
    ids = [it["id"] for it in items]
    assert "offer-pub" in ids
    assert "offer-pending" not in ids
    assert "offer-approved" not in ids

    # Confirma que coupon_code é serializado na resposta
    pub_item = next(it for it in items if it["id"] == "offer-pub")
    assert pub_item["coupon_code"] == "VALE10"


def test_test_ingest_offer_flow(client, monkeypatch):
    """Testa o endpoint de ingestão controlada de oferta de teste em dev."""
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("TEST_INGEST_KEY", "secret_dev_key")

    payload = {
        "title": "Smartphone Samsung Galaxy S24 Ultra",
        "price_current": 4999.0,
        "price_original": 6999.0,
        "discount_pct": 28,
        "store": "Amazon",
        "category": "smartphones",
        "original_link": "https://www.amazon.com.br/dp/B0CX123456",
        "coupon_code": "SAMSUNG100",
        "source_name": "TEST_SOURCE",
    }
    headers = {"X-Test-Key": "secret_dev_key"}

    res = client.post("/offers/test-ingest", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == payload["title"]
    assert data["status"] == "published"
    assert data["coupon_code"] == "SAMSUNG100"
    assert "amazon" in data["affiliate_link"]

    # Verifica que aparece na vitrine pública
    get_res = client.get(f"/offers/{data['id']}")
    assert get_res.status_code == 200
    assert get_res.json()["title"] == payload["title"]


def test_test_ingest_offer_security(client, monkeypatch):
    """Testa bloqueio de segurança: restrição rigorosa de ENVIRONMENT e X-Test-Key."""
    payload = {
        "title": "Smartphone Teste Security",
        "price_current": 1000.0,
        "price_original": 2000.0,
        "discount_pct": 50,
        "store": "Amazon",
        "category": "smartphones",
        "original_link": "https://www.amazon.com.br/dp/B0CX999999",
        "source_name": "TEST_SOURCE",
    }

    # 1. ENVIRONMENT ausente -> 403
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.setenv("TEST_INGEST_KEY", "secret_dev_key")
    res_no_env = client.post("/offers/test-ingest", json=payload, headers={"X-Test-Key": "secret_dev_key"})
    assert res_no_env.status_code == 403
    assert "ENVIRONMENT não configurada" in res_no_env.json()["detail"]

    # 2. ENVIRONMENT=staging -> 403
    monkeypatch.setenv("ENVIRONMENT", "staging")
    res_staging = client.post("/offers/test-ingest", json=payload, headers={"X-Test-Key": "secret_dev_key"})
    assert res_staging.status_code == 403
    assert "desabilitado no ambiente 'staging'" in res_staging.json()["detail"]

    # 3. ENVIRONMENT=production -> 403
    monkeypatch.setenv("ENVIRONMENT", "production")
    res_prod = client.post("/offers/test-ingest", json=payload, headers={"X-Test-Key": "secret_dev_key"})
    assert res_prod.status_code == 403
    assert "desabilitado no ambiente 'production'" in res_prod.json()["detail"]

    # 4. TEST_INGEST_KEY ausente no servidor -> 403
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.delenv("TEST_INGEST_KEY", raising=False)
    res_no_server_key = client.post("/offers/test-ingest", json=payload, headers={"X-Test-Key": "secret_dev_key"})
    assert res_no_server_key.status_code == 403
    assert "TEST_INGEST_KEY não configurada" in res_no_server_key.json()["detail"]

    # 5. X-Test-Key ausente no cabeçalho da requisição -> 401
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("TEST_INGEST_KEY", "secret_dev_key")
    res_missing_header = client.post("/offers/test-ingest", json=payload)
    assert res_missing_header.status_code == 401
    assert "ausente ou inválida" in res_missing_header.json()["detail"]

    # 6. X-Test-Key com valor incorreto -> 401
    res_wrong_key = client.post("/offers/test-ingest", json=payload, headers={"X-Test-Key": "wrong_value"})
    assert res_wrong_key.status_code == 401
    assert "ausente ou inválida" in res_wrong_key.json()["detail"]

    # 7. Sucesso em ambiente 'test' com chave correta -> 201
    monkeypatch.setenv("ENVIRONMENT", "test")
    monkeypatch.setenv("TEST_INGEST_KEY", "secret_dev_key")
    res_test_env = client.post("/offers/test-ingest", json=payload, headers={"X-Test-Key": "secret_dev_key"})
    assert res_test_env.status_code == 201


def test_coupons_endpoints(client):
    """Testa listagem de cupons com filtros e busca por ID."""
    # Listagem completa
    res = client.get("/coupons")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert "items" in data

    # Filtro por loja
    res_store = client.get("/coupons?store=Amazon")
    assert res_store.status_code == 200
    for c in res_store.json()["items"]:
        assert "amazon" in c["store"].lower() or "amazon" in c.get("store_slug", "").lower()

    # Busca por código
    res_search = client.get("/coupons?search=MELI10")
    assert res_search.status_code == 200
    assert len(res_search.json()["items"]) >= 1

    # Busca por ID existente
    first_id = data["items"][0]["id"]
    res_id = client.get(f"/coupons/{first_id}")
    assert res_id.status_code == 200
    assert res_id.json()["id"] == first_id

    # Busca por ID inexistente
    res_404 = client.get("/coupons/cupom-fantasma-999")
    assert res_404.status_code == 404


def test_categories_and_stores_by_slug(client):
    """Testa busca de categoria e loja por slug."""
    # Categoria existente
    res_cat = client.get("/categories/smartphones")
    assert res_cat.status_code == 200
    assert res_cat.json()["slug"] == "smartphones"

    # Categoria inexistente
    res_cat_404 = client.get("/categories/categoria-que-nao-existe")
    assert res_cat_404.status_code == 404

    # Loja existente
    res_store = client.get("/stores/amazon")
    assert res_store.status_code == 200
    assert res_store.json()["name"] == "Amazon"

    # Loja inexistente
    res_store_404 = client.get("/stores/loja-inexistente-xyz")
    assert res_store_404.status_code == 404


def test_search_offers_endpoint(client, sample_offer):
    """Testa endpoint de busca full-text."""
    # Busca com match no título
    res_match = client.get(f"/search?q={sample_offer.title.split()[0]}")
    assert res_match.status_code == 200
    assert res_match.json()["total"] >= 1

    # Busca sem match
    res_nomatch = client.get("/search?q=TermoAbsurdoNaoExistente999")
    assert res_nomatch.status_code == 200
    assert res_nomatch.json()["total"] == 0


def test_offer_crud_endpoints(client):
    """Testa criação, atualização e exclusão de ofertas."""
    # 1. POST /offers
    create_payload = {
        "title": "Teclado Mecânico Gamer Redragon Kumara",
        "price_current": 180.0,
        "price_original": 250.0,
        "store": "Amazon",
        "category": "informatica",
        "original_link": "https://www.amazon.com.br/dp/B08XYZ1234",
    }
    res_create = client.post("/offers", json=create_payload)
    assert res_create.status_code == 201
    offer_data = res_create.json()
    new_id = offer_data["id"]
    assert offer_data["title"] == create_payload["title"]
    assert offer_data["discount_pct"] == 28
    assert "tag=" in offer_data["affiliate_link"] or "amazon.com.br" in offer_data["affiliate_link"]

    # 2. PUT /offers/{id}
    update_payload = {
        "title": "Teclado Mecânico Gamer Redragon Kumara RGB",
        "price_current": 160.0,
    }
    res_update = client.put(f"/offers/{new_id}", json=update_payload)
    assert res_update.status_code == 200
    assert res_update.json()["title"] == update_payload["title"]
    assert res_update.json()["price_current"] == 160.0

    # 3. DELETE /offers/{id}
    res_delete = client.delete(f"/offers/{new_id}")
    assert res_delete.status_code == 200
    assert res_delete.json()["deleted_id"] == new_id

    # 4. Confirma exclusão com 404
    res_get_deleted = client.get(f"/offers/{new_id}")
    assert res_get_deleted.status_code == 404


def test_api_prefix_routing(client, sample_offer):
    """Garante que tanto /offers quanto /api/offers e /api/coupons respondam 200 OK."""
    res_root = client.get("/offers")
    res_api = client.get("/api/offers")
    assert res_root.status_code == 200
    assert res_api.status_code == 200

    res_root_coupons = client.get("/coupons")
    res_api_coupons = client.get("/api/coupons")
    assert res_root_coupons.status_code == 200
    assert res_api_coupons.status_code == 200
