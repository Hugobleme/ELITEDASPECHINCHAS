"""
Testes abrangentes do pipeline de mídia e imagens do Telegram:
Valida detecção, extração, preservação, persistência, publicação e fallbacks resilientes.
"""
import os
import json
import pytest
import tempfile
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime, timezone

from bot.publisher import publish_to_telegram, clear_publication_cache
from bot.media_handler import (
    extract_source_media,
    download_image_to_temp,
    cleanup_temp_media,
    is_safe_public_url,
    create_safe_temp_media_file,
    MAX_MEDIA_SIZE_BYTES,
)
from processor.parser import parse_telegram_message
from processor.tasks import process_telegram_message, publish_offer_to_channel
from database.models import Offer
from database.connection import Base
from tests.conftest import engine, TestingSessionLocal


from processor.celery_app import celery_app


@pytest.fixture(autouse=True)
def setup_teardown_media_test(monkeypatch):
    clear_publication_cache()
    Base.metadata.create_all(bind=engine)
    monkeypatch.setattr("processor.tasks.SessionLocal", TestingSessionLocal)
    monkeypatch.setattr("database.connection.SessionLocal", TestingSessionLocal)
    monkeypatch.setattr("bot.listener.SessionLocal", TestingSessionLocal)
    monkeypatch.setattr("processor.tasks.match_and_notify.delay", lambda *a, **kw: None)
    
    orig_eager = celery_app.conf.task_always_eager
    celery_app.conf.task_always_eager = True
    yield
    celery_app.conf.task_always_eager = orig_eager
    clear_publication_cache()
    Base.metadata.drop_all(bind=engine)


def make_mock_client_post(captured_calls, return_status=200, return_json=None, side_effect=None):
    """Cria mock compatível com httpx.Client.post recebendo self."""
    def mock_post(self, url, data=None, files=None, **kwargs):
        captured_calls.append({"url": url, "data": data, "files": files})
        if side_effect:
            if callable(side_effect):
                return side_effect(url, data=data, files=files, **kwargs)
            raise side_effect
        resp = MagicMock()
        resp.status_code = return_status
        resp.is_success = (return_status < 400)
        resp.json.return_value = return_json or {"ok": True, "result": {"message_id": 9901}}
        return resp
    return mock_post


# ------------------------------------------------------------------------------
# Teste 1: Mensagem com URL de imagem
# ------------------------------------------------------------------------------
def test_message_with_image_url(monkeypatch):
    """
    Valida que uma URL válida de imagem é preservada no parser e no payload,
    e que o publisher dispara sendPhoto com a URL da foto.
    """
    valid_url = "https://images.unsplash.com/photo-1542291026-7eec264c27ff"
    text = f"Tênis Nike Revolution 6 por R$ 199,90 na Amazon https://amazon.com.br/dp/B08XYZ1234 {valid_url}.jpg"

    parsed = parse_telegram_message(text=text, media_url=f"{valid_url}.jpg")
    assert parsed["image_url"] == f"{valid_url}.jpg"

    captured_calls = []
    mock_fn = make_mock_client_post(captured_calls, return_json={"ok": True, "result": {"message_id": 9901}})
    monkeypatch.setattr("httpx.Client.post", mock_fn)
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11")
    monkeypatch.setenv("TARGET_CHANNEL_ID", "@elitedaspechinchas")
    monkeypatch.setattr("bot.publisher.is_safe_public_url", lambda u: True)

    res = publish_to_telegram(
        message="<b>Tênis Nike</b>",
        image_url=f"{valid_url}.jpg",
    )

    assert res["success"] is True
    assert res["mode"] == "photo"
    assert res["message_id"] == 9901
    assert any("/sendPhoto" in call["url"] for call in captured_calls)
    photo_call = next(c for c in captured_calls if "/sendPhoto" in c["url"])
    assert photo_call["data"]["photo"] == f"{valid_url}.jpg"


# ------------------------------------------------------------------------------
# Teste 2: Mensagem com foto anexada (multipart upload)
# ------------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_message_with_attached_photo_multipart(monkeypatch):
    """
    Valida que foto anexada no Telegram é detectada, baixada para arquivo temporário,
    e que o publisher utiliza multipart upload com sendPhoto.
    """
    mock_msg = MagicMock()
    mock_msg.id = 1045
    mock_msg.chat_id = -1001234567890
    mock_msg.photo = MagicMock()
    mock_msg.document = None
    mock_msg.web_preview = None
    mock_msg.text = "Oferta imperdível com foto anexada"

    temp_img = create_safe_temp_media_file(suffix=".jpg")
    with open(temp_img, "wb") as f:
        f.write(b"\xFF\xD8\xFF\xE0" + b"\x00" * 1024)

    mock_client = AsyncMock()
    mock_client.download_media.return_value = temp_img

    try:
        media_info = await extract_source_media(mock_msg, client=mock_client)
        assert media_info["source_media_type"] == "photo"
        assert media_info["source_media_path"] == temp_img
        assert media_info["has_public_url"] is False

        captured_calls = []
        mock_fn = make_mock_client_post(captured_calls, return_json={"ok": True, "result": {"message_id": 9902}})
        monkeypatch.setattr("httpx.Client.post", mock_fn)
        monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11")
        monkeypatch.setenv("TARGET_CHANNEL_ID", "@elitedaspechinchas")

        res = publish_to_telegram(
            message="<b>Oferta com Foto</b>",
            media_path=temp_img,
            media_type="photo",
        )

        assert res["success"] is True
        assert res["mode"] == "photo"
        assert any("/sendPhoto" in call["url"] for call in captured_calls)
        photo_call = next(c for c in captured_calls if "/sendPhoto" in c["url"])
        assert "photo" in photo_call["files"]
    finally:
        cleanup_temp_media(temp_img)


# ------------------------------------------------------------------------------
# Teste 3: Mensagem sem mídia
# ------------------------------------------------------------------------------
def test_message_without_media(monkeypatch):
    """
    Valida que mensagem sem mídia é publicada com sendMessage,
    sem considerar a ausência de foto como um erro.
    """
    captured_calls = []
    mock_fn = make_mock_client_post(captured_calls, return_json={"ok": True, "result": {"message_id": 9903}})
    monkeypatch.setattr("httpx.Client.post", mock_fn)
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11")
    monkeypatch.setenv("TARGET_CHANNEL_ID", "@elitedaspechinchas")

    res = publish_to_telegram(
        message="<b>Oferta Somente Texto</b>",
        image_url=None,
        media_path=None,
    )

    assert res["success"] is True
    assert res["mode"] == "text"
    assert res.get("media_publish_failed") is not True
    assert any("/sendMessage" in call["url"] for call in captured_calls)
    assert not any("/sendPhoto" in call["url"] for call in captured_calls)


# ------------------------------------------------------------------------------
# Teste 4: URL de imagem inválida (SSRF / formato incorreto)
# ------------------------------------------------------------------------------
def test_invalid_or_unsafe_image_url_fallback(monkeypatch):
    """
    Valida que URL de imagem perigosa/inválida (ex: localhost, metadados) é bloqueada,
    registra media_publish_failed e publica via fallback textual sendMessage sem quebrar.
    """
    captured_calls = []
    mock_fn = make_mock_client_post(captured_calls, return_json={"ok": True, "result": {"message_id": 9904}})
    monkeypatch.setattr("httpx.Client.post", mock_fn)
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11")
    monkeypatch.setenv("TARGET_CHANNEL_ID", "@elitedaspechinchas")

    res = publish_to_telegram(
        message="<b>Oferta SSRF</b>",
        image_url="http://169.254.169.254/latest/meta-data/",
    )

    assert res["success"] is True
    assert res["mode"] == "text"
    assert res.get("media_publish_failed") is True
    assert any("/sendMessage" in call["url"] for call in captured_calls)
    assert not any("/sendPhoto" in call["url"] for call in captured_calls)


# ------------------------------------------------------------------------------
# Teste 5: HTTP 404 na imagem
# ------------------------------------------------------------------------------
def test_http_404_image_fallback(monkeypatch):
    """
    Valida que erro HTTP 404 retornado pela API do Telegram para a foto
    ativa o fallback textual, registra media_publish_failed e publica com sucesso.
    """
    captured_calls = []

    def mock_side_effect(url, data=None, files=None, **kwargs):
        resp = MagicMock()
        if "/sendPhoto" in url:
            resp.is_success = False
            resp.status_code = 400
            resp.json.return_value = {"ok": False, "description": "Bad Request: wrong file identifier/HTTP URL specified (404)"}
        else:
            resp.is_success = True
            resp.status_code = 200
            resp.json.return_value = {"ok": True, "result": {"message_id": 9905}}
        return resp

    mock_fn = make_mock_client_post(captured_calls, side_effect=mock_side_effect)
    monkeypatch.setattr("httpx.Client.post", mock_fn)
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11")
    monkeypatch.setenv("TARGET_CHANNEL_ID", "@elitedaspechinchas")
    monkeypatch.setattr("bot.publisher.is_safe_public_url", lambda u: True)

    res = publish_to_telegram(
        message="<b>Oferta 404</b>",
        image_url="https://example.com/imagem_inexistente_404.jpg",
    )

    assert res["success"] is True
    assert res["mode"] == "text"
    assert res["media_publish_failed"] is True
    assert "404" in res.get("fallback_reason", "") or "Bad Request" in res.get("fallback_reason", "")
    assert any("/sendPhoto" in call["url"] for call in captured_calls)
    assert any("/sendMessage" in call["url"] for call in captured_calls)


# ------------------------------------------------------------------------------
# Teste 6: Timeout na imagem
# ------------------------------------------------------------------------------
def test_image_timeout_fallback(monkeypatch):
    """
    Valida que timeout na requisição sendPhoto não trava a thread
    e aciona o fallback textual com sucesso.
    """
    import httpx

    captured_calls = []

    def mock_side_effect(url, data=None, files=None, **kwargs):
        if "/sendPhoto" in url:
            raise httpx.TimeoutException("Connection timed out after 30s")
        resp = MagicMock()
        resp.is_success = True
        resp.status_code = 200
        resp.json.return_value = {"ok": True, "result": {"message_id": 9906}}
        return resp

    mock_fn = make_mock_client_post(captured_calls, side_effect=mock_side_effect)
    monkeypatch.setattr("httpx.Client.post", mock_fn)
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11")
    monkeypatch.setenv("TARGET_CHANNEL_ID", "@elitedaspechinchas")
    monkeypatch.setattr("bot.publisher.is_safe_public_url", lambda u: True)

    res = publish_to_telegram(
        message="<b>Oferta Timeout</b>",
        image_url="https://slow-server.com/slow_image.jpg",
    )

    assert res["success"] is True
    assert res["mode"] == "text"
    assert res["media_publish_failed"] is True
    assert "timeout" in res.get("fallback_reason", "").lower()
    assert any("/sendMessage" in call["url"] for call in captured_calls)


# ------------------------------------------------------------------------------
# Teste 7: MIME inválido / Arquivo perigoso
# ------------------------------------------------------------------------------
def test_invalid_mime_rejection(monkeypatch):
    """
    Valida que documento de extensão executável ou MIME perigoso (.exe, .sh)
    é rejeitado pelo publisher, que usa fallback textual com segurança.
    """
    fd, temp_dangerous = tempfile.mkstemp(suffix=".exe")
    os.write(fd, b"MZ\x90\x00" + b"\x00" * 50)
    os.close(fd)

    try:
        captured_calls = []
        mock_fn = make_mock_client_post(captured_calls, return_json={"ok": True, "result": {"message_id": 9907}})
        monkeypatch.setattr("httpx.Client.post", mock_fn)
        monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11")
        monkeypatch.setenv("TARGET_CHANNEL_ID", "@elitedaspechinchas")

        res = publish_to_telegram(
            message="<b>Tentativa de Envio de Binário</b>",
            media_path=temp_dangerous,
            media_type="document",
        )

        assert res["success"] is True
        assert res["mode"] == "text"
        assert res["media_publish_failed"] is True
        assert "invalid_mime" in res.get("fallback_reason", "")
        assert not any("/sendPhoto" in call["url"] for call in captured_calls)
        assert any("/sendMessage" in call["url"] for call in captured_calls)
    finally:
        cleanup_temp_media(temp_dangerous)


# ------------------------------------------------------------------------------
# Teste 8: Tamanho acima do limite (MAX_MEDIA_SIZE_MB)
# ------------------------------------------------------------------------------
def test_media_too_large_rejection(monkeypatch):
    """
    Valida que arquivo com tamanho superior a MAX_MEDIA_SIZE_MB
    é rejeitado, aciona fallback textual e registra media_too_large.
    """
    temp_large = create_safe_temp_media_file(suffix=".jpg")
    monkeypatch.setattr("os.path.getsize", lambda path: MAX_MEDIA_SIZE_BYTES + 1024)

    try:
        captured_calls = []
        mock_fn = make_mock_client_post(captured_calls, return_json={"ok": True, "result": {"message_id": 9908}})
        monkeypatch.setattr("httpx.Client.post", mock_fn)
        monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11")
        monkeypatch.setenv("TARGET_CHANNEL_ID", "@elitedaspechinchas")

        res = publish_to_telegram(
            message="<b>Oferta Arquivo Gigante</b>",
            media_path=temp_large,
            media_type="photo",
        )

        assert res["success"] is True
        assert res["mode"] == "text"
        assert res["media_publish_failed"] is True
        assert "media_too_large" in res.get("fallback_reason", "")
        assert not any("/sendPhoto" in call["url"] for call in captured_calls)
        assert any("/sendMessage" in call["url"] for call in captured_calls)
    finally:
        cleanup_temp_media(temp_large)


# ------------------------------------------------------------------------------
# Teste 9: Limpeza de temporários após sucesso e após exceção
# ------------------------------------------------------------------------------
def test_temp_file_cleanup_on_success_and_exception(monkeypatch):
    """
    Valida que arquivos temporários são incondicionalmente removidos
    após sucesso ou após lançamento de exceção durante a publicação.
    """
    db = TestingSessionLocal()
    # 1. Caso Sucesso
    temp_succ = create_safe_temp_media_file(suffix=".jpg")
    assert os.path.exists(temp_succ)

    offer = Offer(
        title="Oferta Teste Limpeza Sucesso",
        price_current=99.90,
        price_original=199.90,
        discount_pct=50,
        store="Amazon",
        category="eletronicos",
        image_url=None,
        affiliate_link="https://amazon.com.br/dp/B08XYZ?tag=elitedaspechi-20",
        telegram_msg_id=888801,
        source_name="@pechinchou",
        status="pending",
        source_media_type="photo",
        media_status="downloaded",
    )
    db.add(offer)
    db.commit()
    offer_id = str(offer.id)
    db.close()

    monkeypatch.setattr(
        "processor.tasks.publish_to_telegram",
        lambda **kwargs: {"success": True, "message_id": 9909, "mode": "photo"},
    )
    monkeypatch.setenv("TARGET_CHANNEL_ID", "@elitedaspechinchas")

    publish_offer_to_channel(offer_id, media_path=temp_succ)
    assert not os.path.exists(temp_succ), "Arquivo temporário não foi removido após publicação bem-sucedida"

    # 2. Caso Exceção
    db2 = TestingSessionLocal()
    temp_fail = create_safe_temp_media_file(suffix=".jpg")
    assert os.path.exists(temp_fail)

    offer_fail = Offer(
        title="Oferta Teste Limpeza Falha",
        price_current=99.90,
        price_original=199.90,
        discount_pct=50,
        store="Amazon",
        category="eletronicos",
        image_url=None,
        affiliate_link="https://amazon.com.br/dp/B08XYZ?tag=elitedaspechi-20",
        telegram_msg_id=888802,
        source_name="@pechinchou",
        status="pending",
        source_media_type="photo",
        media_status="downloaded",
    )
    db2.add(offer_fail)
    db2.commit()
    fail_id = str(offer_fail.id)
    db2.close()

    def raise_error(**kwargs):
        raise RuntimeError("Falha simulada na Bot API")

    monkeypatch.setattr("processor.tasks.publish_to_telegram", raise_error)
    monkeypatch.setattr(publish_offer_to_channel, "retry", MagicMock(side_effect=RuntimeError("retry-now")))

    with pytest.raises(Exception):
        publish_offer_to_channel(fail_id, media_path=temp_fail)

    assert not os.path.exists(temp_fail), "Arquivo temporário não foi removido após exceção no publisher"


# ------------------------------------------------------------------------------
# Teste 10: Oferta duplicada continua sendo bloqueada com imagem
# ------------------------------------------------------------------------------
def test_duplicate_offer_blocked_even_with_image(monkeypatch):
    """
    Garante que a presença de imagem não burla as regras de deduplicação temporal.
    """
    raw_payload = {
        "text": "Notebook Dell Inspiron 15 por R$ 2.500,00 na Amazon https://amazon.com.br/dp/B08C12345",
        "telegram_msg_id": 999901,
        "source_name": "@pechinchou",
        "media_url": "https://assets.pechinchou.com.br/media/img/products/dell_inspiron.jpg",
        "source_media_type": "url",
    }

    monkeypatch.setenv("AUTO_APPROVE_ENABLED", "false")
    monkeypatch.setattr("bot.media_handler.is_safe_public_url", lambda u: True)
    monkeypatch.setattr("bot.publisher.is_safe_public_url", lambda u: True)

    res1 = process_telegram_message(raw_payload)
    assert res1["status"] in ("success", "dispatched")

    res2 = process_telegram_message(raw_payload)
    assert res2["status"] in ("rejected", "skipped")
    assert "duplicad" in res2.get("reason", "").lower() or "já persistida" in res2.get("reason", "").lower()


# ------------------------------------------------------------------------------
# Teste 11: Link de afiliado preservado e não substituído por imagem
# ------------------------------------------------------------------------------
def test_affiliate_link_preserved_and_not_substituted():
    """
    Valida que a URL de imagem não interfere nem sobrescreve o link de afiliado oficial.
    """
    img_url = "https://assets.pechinchou.com.br/media/img/products/produto123.jpg"
    text = (
        f"Smart TV LG 50 4K por R$ 1.999,00 na Amazon\n"
        f"https://www.amazon.com.br/dp/B0CX8R1234?tag=concorrente-20\n"
        f"{img_url}"
    )

    parsed = parse_telegram_message(text=text, media_url=img_url)
    assert parsed["image_url"] == img_url
    assert "amazon.com.br/dp/B0CX8R1234" in parsed["original_link"]

    from processor.affiliate import generate_affiliate_link
    db = TestingSessionLocal()
    try:
        aff_link = generate_affiliate_link(parsed["original_link"], "Amazon", db=db)
        assert aff_link != img_url
        assert "elitedaspechi-20" in aff_link
        assert "amazon.com.br" in aff_link
    finally:
        db.close()


# ------------------------------------------------------------------------------
# Teste 12: Atualização do media_status no banco após publicação
# ------------------------------------------------------------------------------
def test_media_status_lifecycle_in_database(monkeypatch):
    """
    Valida a transição de media_status no ciclo de vida da oferta:
    detected -> published (ou fallback_text).
    """
    db = TestingSessionLocal()
    offer = Offer(
        title="Oferta Ciclo de Mídia",
        price_current=49.99,
        price_original=99.90,
        discount_pct=50,
        store="Nike",
        category="moda",
        image_url="https://assets.pechinchou.com.br/media/img/products/nike_shirt.png",
        affiliate_link="https://www.nike.com.br/camiseta",
        telegram_msg_id=777010,
        source_name="@pechinchou",
        status="pending",
        source_media_type="url",
        media_status="detected",
    )
    db.add(offer)
    db.commit()
    oid = str(offer.id)
    db.close()

    # Publicação bem-sucedida com foto
    monkeypatch.setattr(
        "processor.tasks.publish_to_telegram",
        lambda **kwargs: {"success": True, "message_id": 1008, "mode": "photo"},
    )
    monkeypatch.setenv("TARGET_CHANNEL_ID", "@elitedaspechinchas")

    res = publish_offer_to_channel(oid)
    assert res["status"] == "success"
    assert res["media_status"] == "published"

    db2 = TestingSessionLocal()
    updated = db2.query(Offer).filter(Offer.id == oid).first()
    assert updated.media_status == "published"
    assert updated.status == "published"
    db2.close()
