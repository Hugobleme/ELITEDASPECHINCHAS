"""
Testes abrangentes de integração do banco de dados real (Etapa 3):
- Modelos relacionais (Store, Category, Coupon, Offer, ProcessedMessage, User, etc.)
- Resiliência e pooling (check_db_connection)
- Idempotência do script de seed
- Endpoints de CRUD com soft-delete
- Tasks assíncronas de deduplicação e limpeza
"""
import uuid
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from database.models import Store, Category, Coupon, Offer, ProcessedMessage, Source
from database.connection import check_db_connection
from seed import seed_database
from processor.tasks import task_deduplicate, task_cleanup_expired, process_telegram_message


def test_models_creation_and_relations(db_session: Session):
    """Valida integridade estrutural e relacionamentos de Store, Category, Coupon e Offer."""
    store = Store(
        name="Amazon Brasil",
        slug="amazon-br",
        website_url="https://amazon.com.br",
        is_trusted=True,
    )
    cat = Category(
        name="Eletrônicos & Smart TVs",
        slug="eletronicos-tvs",
        description="Aparelhos eletrônicos de ponta",
    )
    db_session.add_all([store, cat])
    db_session.commit()
    db_session.refresh(store)
    db_session.refresh(cat)

    assert store.id is not None
    assert cat.id is not None

    coupon = Coupon(
        id=f"c-test-{uuid.uuid4().hex[:6]}",
        code="AMAZON10",
        store=store.name,
        store_slug=store.slug,
        store_id=store.id,
        discount_text="R$ 10 OFF",
        category=cat.slug,
        is_active=True,
    )
    db_session.add(coupon)
    db_session.commit()
    db_session.refresh(coupon)

    assert coupon.store_id == store.id

    offer = Offer(
        id=f"off-{uuid.uuid4().hex[:6]}",
        title="Kindle Paperwhite 16GB",
        description="Leitor digital com luz quente",
        price_current=699.00,
        price_original=799.00,
        discount_pct=13,
        store=store.name,
        store_id=store.id,
        category=cat.slug,
        category_id=cat.id,
        image_url="https://amazon.com.br/kindle.jpg",
        affiliate_link="https://amazon.com.br/dp/kindle?tag=elite-20",
        status="published",
        is_active=True,
    )
    db_session.add(offer)
    db_session.commit()
    db_session.refresh(offer)

    assert offer.store_id == store.id
    assert offer.category_id == cat.id
    assert offer.is_active is True


def test_check_db_connection_function(db_session: Session):
    """Valida função utilitária de conectividade com retry."""
    # Teste de sucesso com engine ativa do teste
    connected, msg = check_db_connection(max_retries=1, retry_delay=0.01, target_engine=db_session.bind)
    assert connected is True
    assert "sucesso" in msg.lower() or "saudável" in msg.lower()

    # Teste de falha controlada com engine apontando para porta inalcançável
    bogus_engine = create_engine("sqlite:////non_existent_path/bad.db")
    failed_conn, fail_msg = check_db_connection(max_retries=1, retry_delay=0.01, target_engine=bogus_engine)
    assert failed_conn is False
    assert "falha" in fail_msg.lower()


def test_seed_idempotence(db_session: Session):
    """Executar o seeder 2 vezes consecutivas deve ser idempotente e não duplicar registros."""
    # Primeira execução
    res1 = seed_database(session=db_session)
    assert res1["status"] == "success"
    stores_count1 = db_session.query(Store).count()
    cats_count1 = db_session.query(Category).count()
    coupons_count1 = db_session.query(Coupon).count()

    assert stores_count1 >= 11
    assert cats_count1 >= 7
    assert coupons_count1 >= 8

    # Segunda execução imediata
    res2 = seed_database(session=db_session)
    assert res2["status"] == "success"
    stores_count2 = db_session.query(Store).count()
    cats_count2 = db_session.query(Category).count()
    coupons_count2 = db_session.query(Coupon).count()

    assert stores_count2 == stores_count1
    assert cats_count2 == cats_count1
    assert coupons_count2 == coupons_count1


def test_offers_crud_and_soft_delete(client, db_session: Session):
    """Testa criação, consulta, atualização e soft-delete de ofertas pela API."""
    # 1. Criação
    payload = {
        "title": "Smartphone Samsung Galaxy S24 256GB",
        "price_current": 4299.00,
        "price_original": 5999.00,
        "store": "Samsung",
        "category": "eletronicos",
        "original_link": "https://samsung.com.br/galaxy-s24",
        "status": "published",
    }
    create_resp = client.post("/offers", json=payload)
    assert create_resp.status_code == 201
    created_data = create_resp.json()
    offer_id = created_data["id"]
    assert created_data["title"] == payload["title"]
    assert created_data["discount_pct"] == 28

    # 2. Leitura
    get_resp = client.get(f"/offers/{offer_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == offer_id

    # 3. Atualização
    update_resp = client.put(f"/offers/{offer_id}", json={"price_current": 3999.00})
    assert update_resp.status_code == 200
    assert update_resp.json()["price_current"] == 3999.00

    # 4. Soft Delete
    del_resp = client.delete(f"/offers/{offer_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "success"

    # Confirma que GET /offers/{id} agora retorna 404 (oculta excluídas)
    get_del_resp = client.get(f"/offers/{offer_id}")
    assert get_del_resp.status_code == 404

    # Confirma que no banco o registro ainda existe com is_active=False
    db_record = db_session.query(Offer).filter(Offer.id == offer_id).first()
    assert db_record is not None
    assert db_record.is_active is False
    assert db_record.status == "deleted"


def test_coupons_crud_api(client, db_session: Session):
    """Testa criação, listagem e soft delete de cupons via API."""
    payload = {
        "code": "PROMO2026",
        "store": "Kabum",
        "store_slug": "kabum",
        "discount_text": "15% OFF",
        "description": "Desconto em hardware selecionado",
        "category": "informatica",
        "valid_until": "31/12/2026",
        "is_active": True,
    }
    post_res = client.post("/coupons", json=payload)
    assert post_res.status_code == 201
    coupon_data = post_res.json()
    c_id = coupon_data["id"]
    assert coupon_data["code"] == "PROMO2026"

    # Listagem de cupons
    list_res = client.get("/coupons")
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    assert any(c["id"] == c_id for c in items)

    # Soft delete do cupom
    del_res = client.delete(f"/coupons/{c_id}")
    assert del_res.status_code == 200

    # Consulta individual
    get_res = client.get(f"/coupons/{c_id}")
    assert get_res.status_code == 404


def test_categories_and_stores_crud_api(client):
    """Testa cadastro e consulta de categorias e lojas."""
    cat_payload = {
        "name": "Ferramentas & Jardim",
        "slug": "ferramentas-jardim",
        "description": "Equipamentos manuais e elétricos",
    }
    cat_res = client.post("/categories", json=cat_payload)
    assert cat_res.status_code == 201
    assert cat_res.json()["slug"] == "ferramentas-jardim"

    store_payload = {
        "name": "Leroy Merlin",
        "slug": "leroy-merlin",
        "website_url": "https://leroymerlin.com.br",
        "is_trusted": True,
    }
    store_res = client.post("/stores", json=store_payload)
    assert store_res.status_code == 201
    assert store_res.json()["slug"] == "leroy-merlin"


def test_task_deduplicate(db_session: Session, monkeypatch):
    """Testa detecção de ofertas duplicadas por URL e por hash título/preço."""
    monkeypatch.setattr("processor.tasks.SessionLocal", lambda: db_session)
    url = "https://www.kabum.com.br/produto/12345/teclado-gamer"
    off = Offer(
        id=f"off-dedup-{uuid.uuid4().hex[:6]}",
        title="Teclado Mecânico Gamer RGB Switch Blue",
        price_current=199.90,
        price_original=299.90,
        discount_pct=33,
        store="Kabum",
        category="games",
        image_url="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
        original_link=url,
        affiliate_link="https://kabum.com.br?tag=elite",
        status="published",
        is_active=True,
    )
    db_session.add(off)
    db_session.commit()

    # Checagem por URL exata
    check1 = task_deduplicate(original_link=url)
    assert check1["is_duplicate"] is True
    assert check1["existing_id"] == off.id

    # Checagem por URL não cadastrada
    check2 = task_deduplicate(original_link="https://www.kabum.com.br/produto/99999/mouse")
    assert check2["is_duplicate"] is False


def test_task_cleanup_expired(db_session: Session, monkeypatch):
    """Testa expiração periódica de ofertas antigas marcando status='expired' e is_active=False."""
    class NoCloseSession:
        def __init__(self, session):
            self._session = session
        def __getattr__(self, name):
            if name == "close":
                return lambda: None
            return getattr(self._session, name)

    monkeypatch.setattr("processor.tasks.SessionLocal", lambda: NoCloseSession(db_session))
    old_time = datetime.now(timezone.utc) - timedelta(days=45)
    old_off = Offer(
        id=f"off-old-{uuid.uuid4().hex[:6]}",
        title="Oferta Antiga Black Friday",
        price_current=50.00,
        price_original=100.00,
        discount_pct=50,
        store="Amazon",
        category="eletronicos",
        image_url="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
        original_link="https://amazon.com.br/item-old",
        affiliate_link="https://amazon.com.br?tag=elite",
        status="published",
        published_at=old_time,
        is_active=True,
    )
    db_session.add(old_off)
    db_session.commit()

    res = task_cleanup_expired(max_age_days=30)
    assert res["status"] == "success"
    assert res["expired_count"] >= 1

    updated_off = db_session.query(Offer).filter(Offer.id == old_off.id).first()
    assert updated_off is not None
    assert updated_off.status == "expired"
    assert updated_off.is_active is False


def test_processed_message_audit_trail(db_session: Session, monkeypatch):
    """Testa que process_telegram_message registra auditoria em ProcessedMessage."""
    class NoCloseSession:
        def __init__(self, session):
            self._session = session
        def __getattr__(self, name):
            if name == "close":
                return lambda: None
            return getattr(self._session, name)

    monkeypatch.setattr("processor.tasks.SessionLocal", lambda: NoCloseSession(db_session))

    src = Source(
        id="src-audit-1",
        name="Canal Teste Ingest",
        channel_username="canal_teste_audit",
        is_active=True,
    )
    db_session.add(src)
    db_session.commit()

    # 1. Mensagem Aprovada
    raw_msg_ok = {
        "text": (
            "🔥 Mouse Gamer Logitech G203\n"
            "De R$ 169,90 por R$ 89,90\n"
            "Link: https://www.amazon.com.br/dp/B08MKB1234"
        ),
        "telegram_msg_id": 112233,
        "source_name": "@canal_teste_audit",
        "media_url": "https://example.com/mouse.jpg",
        "entities_links": [],
    }
    res_ok = process_telegram_message(raw_msg_ok)
    assert res_ok["status"] == "success"

    # Confirma que ProcessedMessage com status 'success' foi gravado
    audit_ok = db_session.query(ProcessedMessage).filter(ProcessedMessage.telegram_message_id == 112233).first()
    assert audit_ok is not None
    assert audit_ok.status == "success"
    assert audit_ok.offer_id is not None

    # 2. Mensagem Rejeitada (desconto abaixo do mínimo)
    raw_msg_bad = {
        "text": (
            "Oferta fraca: Livro de receitas\n"
            "De R$ 50,00 por R$ 49,00\n"
            "Link: https://www.amazon.com.br/dp/B08BOOK1234"
        ),
        "telegram_msg_id": 445566,
        "source_name": "@canal_teste_audit",
        "media_url": None,
        "entities_links": [],
    }
    res_bad = process_telegram_message(raw_msg_bad)
    assert res_bad["status"] == "rejected"

    audit_bad = db_session.query(ProcessedMessage).filter(ProcessedMessage.telegram_message_id == 445566).first()
    assert audit_bad is not None
    assert audit_bad.status == "rejected"
    assert "desconto" in audit_bad.reason.lower()
