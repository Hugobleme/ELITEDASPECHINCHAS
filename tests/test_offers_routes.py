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
    """Testa bloqueio de segurança: não permite em produção e rejeita chave errada."""
    # 1. Chave errada em dev
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("TEST_INGEST_KEY", "secret_dev_key")
    res_unauth = client.post("/offers/test-ingest", json={"title": "Teste"}, headers={"X-Test-Key": "wrong"})
    assert res_unauth.status_code == 401

    # 2. Bloqueio em produção
    monkeypatch.setenv("ENVIRONMENT", "production")
    res_prod = client.post("/offers/test-ingest", json={"title": "Teste"}, headers={"X-Test-Key": "secret_dev_key"})
    assert res_prod.status_code == 403
