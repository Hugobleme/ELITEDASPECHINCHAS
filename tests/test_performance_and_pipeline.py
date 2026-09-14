"""
Validação de Performance e Pipeline End-to-End para a Etapa 2.
Verifica:
1. Ingestão de 100 mensagens em batch em menos de 10 segundos.
2. Pipeline completo: Mensagem -> Parser -> Regras -> Afiliado -> Publicação -> API.
3. Processamento individual em menos de 2 segundos.
"""
import time
import pytest
from sqlalchemy.orm import Session

from database.models import Offer, Source
from processor.tasks import task_batch_process, process_telegram_message
from bot.formatter import format_telegram_card_html
from bot.publisher import publish_to_telegram


def test_batch_performance_100_messages(db_session: Session, monkeypatch):
    """
    Critério de Aceite: Processar 100 mensagens em < 10 segundos (batch).
    Distribui 100 mensagens entre 10 fontes para respeitar o rate-limit anti-spam por fonte.
    """
    monkeypatch.setattr("processor.tasks.SessionLocal", lambda: db_session)
    monkeypatch.setattr(db_session, "close", lambda: None)

    # Cadastra as 10 fontes de teste autorizadas
    sources = []
    for s_idx in range(10):
        src = Source(
            name=f"Fonte Canal #{s_idx}",
            channel_username=f"canal_fonte_{s_idx}",
            is_active=True,
        )
        sources.append(src)
    db_session.add_all(sources)
    db_session.commit()

    stores = ["Amazon", "Shopee", "Mercado Livre", "Kabum", "Magazine Luiza"]
    urls = [
        "https://www.amazon.com.br/dp/B08N5WRWNW",
        "https://shopee.com.br/product/123/456",
        "https://produto.mercadolivre.com.br/MLB-12345678",
        "https://www.kabum.com.br/produto/100200",
        "https://www.magazineluiza.com.br/item/999",
    ]

    batch = []
    for i in range(100):
        store_idx = i % len(stores)
        source_idx = i % 10
        price_orig = 100.0 + (i * 5)
        price_curr = price_orig * 0.75  # 25% de desconto
        msg = {
            "text": (
                f"🔥 OFERTA EXCLUSIVA #{i}\n"
                f"Produto Gamer Teste #{i}\n"
                f"De R$ {price_orig:.2f} por apenas R$ {price_curr:.2f}\n"
                f"25% de desconto na loja {stores[store_idx]}\n"
                f"Link: {urls[store_idx]}"
            ),
            "telegram_msg_id": 600000 + i,
            "source_name": f"@canal_fonte_{source_idx}",
        }
        batch.append(msg)

    start_time = time.time()
    result = task_batch_process(batch)
    elapsed = time.time() - start_time

    print(f"\n[Performance Benchmark] 100 mensagens processadas em {elapsed:.2f}s")

    assert result["total"] == 100
    assert result["approved"] == 100
    assert elapsed < 10.0, f"Tempo de processamento de 100 mensagens excedeu 10s: {elapsed:.2f}s"


def test_end_to_end_simulated_pipeline(db_session: Session, monkeypatch, client):
    """
    Critério de Aceite: Pipeline completo:
    Mensagem simulada → parse → regras → afiliado → publicação → API → consulta
    """
    monkeypatch.setattr("processor.tasks.SessionLocal", lambda: db_session)
    monkeypatch.setattr(db_session, "close", lambda: None)

    import config
    monkeypatch.setitem(config.DEFAULT_AFFILIATE_TAGS, "Amazon", "elitedaspechinchas-20")

    # 1. Mensagem capturada de canal simulado
    raw_message = {
        "text": (
            "🔥 SUPER OFERTA!\n"
            "Monitor Gamer LG UltraGear 27 144Hz IPS 1ms\n"
            "De R$ 1.699,00 por apenas R$ 1.189,30 à vista\n"
            "30% OFF no PIX com Cupom: LG100\n"
            "Válido até 31/12\n"
            "Link: https://www.amazon.com.br/dp/B0B00LG144"
        ),
        "telegram_msg_id": 888123,
        "source_name": "TEST_SOURCE",
    }

    start_t = time.time()
    # 2. Processamento via Celery / tasks
    result = process_telegram_message(raw_message)
    pipeline_duration = time.time() - start_t

    # Processamento individual < 2s
    assert pipeline_duration < 2.0
    assert result["status"] == "success"
    assert "offer_id" in result

    offer_id = result["offer_id"]

    # 3. Verifica persistência no banco
    offer = db_session.query(Offer).filter(Offer.id == offer_id).first()
    assert offer is not None
    assert offer.coupon_code == "LG100"
    assert offer.discount_pct == 30
    assert "tag=elitedaspechinchas-20" in offer.affiliate_link

    # 4. Formata e publica no canal (simulado)
    card_html = format_telegram_card_html({
        "title": offer.title,
        "price_current": offer.price_current,
        "price_original": offer.price_original,
        "discount_pct": offer.discount_pct,
        "store": offer.store,
        "category": offer.category,
        "coupon_code": offer.coupon_code,
        "coupon_validity": "31/12",
        "affiliate_link": offer.affiliate_link,
    })
    pub_res = publish_to_telegram(card_html, channel_id="@elitedaspechinchas")
    assert pub_res["success"] is True

    # 5. Publica no banco e valida via API REST
    offer.status = "published"
    db_session.commit()

    api_res = client.get(f"/api/offers/{offer_id}")
    assert api_res.status_code == 200
    data = api_res.json()
    assert data["id"] == offer_id
    assert "UltraGear" in data["title"]
    assert data["price_current"] == 1189.30
    assert data["coupon_code"] == "LG100"
