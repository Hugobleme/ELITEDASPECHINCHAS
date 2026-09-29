import os
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import httpx

from config import (
    TELEGRAM_BOT_TOKEN,
    TARGET_CHANNEL_ID,
    SIMULATED_BOT_ENABLED,
    SIMULATED_PUBLICATIONS_FILE,
)
from bot.structured_logger import get_structured_logger, emit_json_log
from bot.media_handler import (
    is_safe_public_url,
    MAX_MEDIA_SIZE_BYTES,
    MAX_MEDIA_SIZE_MB,
    ALLOWED_IMAGE_EXTS,
    ALLOWED_IMAGE_MIMES,
)

import hashlib
import threading
import time

logger = get_structured_logger("elitedaspechinchas.bot.publisher", component="publisher")

# Cache de publicações recentes para garantir prevenção total de posts duplicados
_recent_publications: Dict[str, float] = {}
_pub_lock = threading.Lock()
PUB_DEDUPLICATION_WINDOW_SECONDS = 900  # 15 minutos


def clear_publication_cache() -> None:
    """Limpa o cache de publicações recentes (utilizado primariamente em testes)."""
    with _pub_lock:
        _recent_publications.clear()


def _get_message_fingerprint(
    message: str,
    image_url: Optional[str] = None,
    media_path: Optional[str] = None,
) -> str:
    """Gera um hash único baseado no conteúdo da mensagem e identificador da mídia."""
    norm_msg = " ".join((message or "").split())
    norm_img = (image_url or "").strip()
    norm_path = os.path.basename(media_path) if media_path else ""
    key = f"{norm_msg}_{norm_img}_{norm_path}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def is_duplicate_publication(
    message: str,
    image_url: Optional[str] = None,
    media_path: Optional[str] = None,
) -> bool:
    """
    Verifica se a mensagem idêntica já foi enviada no intervalo recente de 15 minutos.
    Registra o timestamp atual se for uma mensagem inédita.
    """
    fingerprint = _get_message_fingerprint(message, image_url, media_path)
    now = time.time()
    with _pub_lock:
        cutoff = now - PUB_DEDUPLICATION_WINDOW_SECONDS
        expired = [k for k, v in _recent_publications.items() if v < cutoff]
        for k in expired:
            del _recent_publications[k]

        if fingerprint in _recent_publications:
            elapsed = now - _recent_publications[fingerprint]
            logger.warning(
                f"[Publisher] 🛡️ BLOQUEIO DE POST DUPLICADO! Mensagem idêntica enviada há {elapsed:.1f}s. "
                "Cancelando requisição à Telegram Bot API para evitar duplicidade no canal."
            )
            return True

        _recent_publications[fingerprint] = now
        return False


def _record_simulated_publication(payload: Dict[str, Any]) -> None:
    """
    Grava a publicação simulada em arquivo local para inspeção e auditoria.
    """
    try:
        data = []
        if os.path.exists(SIMULATED_PUBLICATIONS_FILE):
            with open(SIMULATED_PUBLICATIONS_FILE, "r", encoding="utf-8") as f:
                try:
                    data = json.load(f)
                except Exception:
                    data = []

        data.append(payload)
        # Mantém apenas os últimos 100 registros simulados
        if len(data) > 100:
            data = data[-100:]

        with open(SIMULATED_PUBLICATIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"[Publisher] Não foi possível persistir publicação simulada: {e}")


def publish_to_telegram(
    message: str,
    channel_id: Optional[str] = None,
    image_url: Optional[str] = None,
    media_path: Optional[str] = None,
    parse_mode: str = "HTML",
    reply_markup: Optional[Dict[str, Any]] = None,
    check_duplicate: bool = True,
    offer_id: Optional[str] = None,
    telegram_msg_id: Optional[int] = None,
    media_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Publica uma oferta formatada no canal/grupo do Telegram utilizando a Bot API oficial.
    Suporta:
    1. Upload multipart de foto local (quando capturada do Telegram).
    2. Envio de foto via URL pública validada (com proteção SSRF).
    3. Fallback controlado para sendMessage registrando a causa exata sem mascarar erros.
    4. Envio direto via sendMessage quando a oferta não possui mídia (sem considerar erro).
    5. Proteção integrada contra duplicações temporais (15 min).
    """
    start_time = time.time()
    target = (channel_id or os.getenv("TARGET_CHANNEL_ID") or TARGET_CHANNEL_ID or "").strip()
    if not target:
        emit_json_log(
            logger=logger,
            level="error",
            component="publisher",
            event="publish_aborted",
            message="TARGET_CHANNEL_ID não configurado no ambiente. Publicação abortada.",
            channel=None,
            offer_id=str(offer_id) if offer_id else None,
            telegram_msg_id=telegram_msg_id,
        )
        return {
            "success": False,
            "error": "TARGET_CHANNEL_ID não configurado no ambiente",
            "channel": None,
        }

    token = os.getenv("TELEGRAM_BOT_TOKEN") or TELEGRAM_BOT_TOKEN

    # Proteção de Duplicação Imediata
    if check_duplicate and is_duplicate_publication(message, image_url, media_path):
        emit_json_log(
            logger=logger,
            level="info",
            component="publisher",
            event="duplicate_prevented",
            message="Post duplicado bloqueado pelo mecanismo de proteção temporal.",
            channel=target,
            offer_id=str(offer_id) if offer_id else None,
            telegram_msg_id=telegram_msg_id,
        )
        return {
            "success": True,
            "duplicate_prevented": True,
            "channel": target,
            "message": "Post duplicado bloqueado pelo mecanismo de proteção temporal.",
        }

    has_media_input = bool((media_path and os.path.exists(media_path)) or (image_url and image_url.strip()))

    # Validação estrita de TELEGRAM_BOT_TOKEN
    clean_token = (token or "").strip()
    if not clean_token or clean_token in ("SEU_BOT_TOKEN_AQUI", "mock_bot_token"):
        # Modo simulado permitido exclusivamente se explicitamente ativado e fora de produção
        if SIMULATED_BOT_ENABLED and os.getenv("ENVIRONMENT") != "production":
            emit_json_log(
                logger=logger,
                level="info",
                component="publisher",
                event="publish_simulated",
                message=f"[Publisher SIMULAÇÃO] Publicação simulada para canal '{target}': {message[:200]}...",
                channel=target,
                offer_id=str(offer_id) if offer_id else None,
                telegram_msg_id=telegram_msg_id,
            )
            sim_result = {
                "success": True,
                "simulated": True,
                "channel": target,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "has_image": has_media_input,
                "has_button": bool(reply_markup),
                "message_length": len(message),
                "message_preview": message[:150],
                "mode": "photo" if has_media_input else "text",
            }
            _record_simulated_publication(sim_result)
            return sim_result

        emit_json_log(
            logger=logger,
            level="error",
            component="publisher",
            event="publish_aborted",
            message=f"TELEGRAM_BOT_TOKEN não configurado no ambiente. Publicação no canal '{target}' abortada.",
            channel=target,
            offer_id=str(offer_id) if offer_id else None,
            telegram_msg_id=telegram_msg_id,
        )
        return {
            "success": False,
            "error": "TELEGRAM_BOT_TOKEN não configurado no ambiente",
            "channel": target,
        }

    api_url = f"https://api.telegram.org/bot{clean_token}"
    timeout_config = httpx.Timeout(30.0, connect=15.0)

    media_publish_failed = False
    fallback_reason: Optional[str] = None
    attempted_media = False

    with httpx.Client(timeout=timeout_config) as client:
        # ----------------------------------------------------------------------
        # Prioridade 1: Upload multipart de arquivo local de mídia
        # ----------------------------------------------------------------------
        if media_path and os.path.exists(media_path):
            attempted_media = True
            f_size = os.path.getsize(media_path)
            ext = os.path.splitext(media_path)[1].lower()
            mime = "image/jpeg" if ext in (".jpg", ".jpeg") else ("image/png" if ext == ".png" else ("image/webp" if ext == ".webp" else "application/octet-stream"))

            if f_size > MAX_MEDIA_SIZE_BYTES:
                media_publish_failed = True
                fallback_reason = f"media_too_large: {f_size} > {MAX_MEDIA_SIZE_BYTES}"
                emit_json_log(
                    logger=logger,
                    level="warning",
                    component="publisher",
                    event="media_too_large",
                    message=f"Mídia local excede limite ({f_size} bytes). Executando fallback textual.",
                    offer_id=str(offer_id) if offer_id else None,
                    telegram_msg_id=telegram_msg_id,
                    file_size=f_size,
                    media_type=media_type or "photo",
                    media_publish_failed=True,
                )
            elif ext not in ALLOWED_IMAGE_EXTS:
                media_publish_failed = True
                fallback_reason = f"invalid_mime: {ext}"
                emit_json_log(
                    logger=logger,
                    level="warning",
                    component="publisher",
                    event="media_invalid_mime",
                    message=f"Mídia local com extensão não permitida ({ext}). Executando fallback textual.",
                    offer_id=str(offer_id) if offer_id else None,
                    telegram_msg_id=telegram_msg_id,
                    mime_type=ext,
                    media_type=media_type or "document",
                    media_publish_failed=True,
                )
            else:
                try:
                    with open(media_path, "rb") as mf:
                        files = {"photo": (os.path.basename(media_path), mf, mime)}
                        data = {
                            "chat_id": target,
                            "caption": message[:1024],
                            "parse_mode": parse_mode,
                        }
                        if reply_markup:
                            data["reply_markup"] = json.dumps(reply_markup)

                        response = client.post(f"{api_url}/sendPhoto", data=data, files=files)
                        resp_json = response.json()

                        if response.is_success and resp_json.get("ok"):
                            msg_id = resp_json.get("result", {}).get("message_id")
                            duration_ms = (time.time() - start_time) * 1000
                            emit_json_log(
                                logger=logger,
                                level="info",
                                component="publisher",
                                event="publish_success",
                                message=f"Oferta com foto local postada em {target} (msg_id: {msg_id})",
                                channel=target,
                                duration=round(duration_ms, 2),
                                telegram_msg_id=msg_id,
                                mode="photo",
                                media_source="local_upload",
                            )
                            return {"success": True, "message_id": msg_id, "mode": "photo"}
                        else:
                            media_publish_failed = True
                            err_desc = resp_json.get("description", "sendPhoto falhou")
                            fallback_reason = err_desc
                            duration_ms = (time.time() - start_time) * 1000
                            emit_json_log(
                                logger=logger,
                                level="warning",
                                component="publisher",
                                event="media_publish_failed",
                                message=f"sendPhoto retornou erro para upload local: {err_desc}",
                                media_type=media_type or "photo",
                                file_size=f_size,
                                mime_type=mime,
                                status_code=response.status_code,
                                error_description=err_desc,
                                offer_id=str(offer_id) if offer_id else None,
                                telegram_msg_id=telegram_msg_id,
                                media_publish_failed=True,
                                duration=round(duration_ms, 2),
                            )
                except Exception as ex:
                    media_publish_failed = True
                    fallback_reason = str(ex)
                    duration_ms = (time.time() - start_time) * 1000
                    emit_json_log(
                        logger=logger,
                        level="warning",
                        component="publisher",
                        event="media_publish_failed",
                        message=f"Exceção ao enviar foto local via multipart: {ex}",
                        media_type=media_type or "photo",
                        file_size=f_size,
                        mime_type=mime,
                        error_description=str(ex),
                        offer_id=str(offer_id) if offer_id else None,
                        telegram_msg_id=telegram_msg_id,
                        media_publish_failed=True,
                        duration=round(duration_ms, 2),
                    )

        # ----------------------------------------------------------------------
        # Prioridade 2: Envio de foto via URL pública validada
        # ----------------------------------------------------------------------
        elif image_url and image_url.strip():
            attempted_media = True
            clean_url = image_url.strip()

            if not is_safe_public_url(clean_url):
                media_publish_failed = True
                fallback_reason = "invalid_or_unsafe_url"
                emit_json_log(
                    logger=logger,
                    level="warning",
                    component="publisher",
                    event="media_publish_failed",
                    message=f"URL de imagem insegura ou inválida. Executando fallback textual.",
                    media_type="url",
                    error_description="invalid_or_unsafe_url",
                    offer_id=str(offer_id) if offer_id else None,
                    telegram_msg_id=telegram_msg_id,
                    media_publish_failed=True,
                )
            else:
                try:
                    photo_payload = {
                        "chat_id": target,
                        "photo": clean_url,
                        "caption": message[:1024],
                        "parse_mode": parse_mode,
                    }
                    if reply_markup:
                        photo_payload["reply_markup"] = json.dumps(reply_markup)

                    response = client.post(f"{api_url}/sendPhoto", data=photo_payload)
                    resp_json = response.json()

                    if response.is_success and resp_json.get("ok"):
                        msg_id = resp_json.get("result", {}).get("message_id")
                        duration_ms = (time.time() - start_time) * 1000
                        emit_json_log(
                            logger=logger,
                            level="info",
                            component="publisher",
                            event="publish_success",
                            message=f"Oferta com foto remota postada em {target} (msg_id: {msg_id})",
                            channel=target,
                            duration=round(duration_ms, 2),
                            telegram_msg_id=msg_id,
                            mode="photo",
                            media_source="url",
                        )
                        return {"success": True, "message_id": msg_id, "mode": "photo"}
                    else:
                        media_publish_failed = True
                        err_desc = resp_json.get("description", "sendPhoto falhou")
                        fallback_reason = err_desc
                        duration_ms = (time.time() - start_time) * 1000
                        emit_json_log(
                            logger=logger,
                            level="warning",
                            component="publisher",
                            event="media_publish_failed",
                            message=f"sendPhoto retornou erro para URL remota: {err_desc}",
                            media_type="url",
                            status_code=response.status_code,
                            error_description=err_desc,
                            offer_id=str(offer_id) if offer_id else None,
                            telegram_msg_id=telegram_msg_id,
                            media_publish_failed=True,
                            duration=round(duration_ms, 2),
                        )
                except httpx.TimeoutException:
                    media_publish_failed = True
                    fallback_reason = "image_timeout"
                    duration_ms = (time.time() - start_time) * 1000
                    emit_json_log(
                        logger=logger,
                        level="warning",
                        component="publisher",
                        event="media_publish_failed",
                        message="Timeout excedido ao postar foto via URL. Executando fallback textual.",
                        media_type="url",
                        error_description="image_timeout",
                        offer_id=str(offer_id) if offer_id else None,
                        telegram_msg_id=telegram_msg_id,
                        media_publish_failed=True,
                        duration=round(duration_ms, 2),
                    )
                except Exception as ex:
                    media_publish_failed = True
                    fallback_reason = str(ex)
                    duration_ms = (time.time() - start_time) * 1000
                    emit_json_log(
                        logger=logger,
                        level="warning",
                        component="publisher",
                        event="media_publish_failed",
                        message=f"Exceção ao enviar foto remota: {ex}",
                        media_type="url",
                        error_description=str(ex),
                        offer_id=str(offer_id) if offer_id else None,
                        telegram_msg_id=telegram_msg_id,
                        media_publish_failed=True,
                        duration=round(duration_ms, 2),
                    )

        # ----------------------------------------------------------------------
        # Envio como Mensagem de Texto (direto ou fallback controlado)
        # ----------------------------------------------------------------------
        try:
            text_payload = {
                "chat_id": target,
                "text": message[:4096],
                "parse_mode": parse_mode,
                "disable_web_page_preview": False,
            }
            if reply_markup:
                text_payload["reply_markup"] = json.dumps(reply_markup)

            response = client.post(f"{api_url}/sendMessage", data=text_payload)
            resp_json = response.json()
            duration_ms = (time.time() - start_time) * 1000

            if response.is_success and resp_json.get("ok"):
                msg_id = resp_json.get("result", {}).get("message_id")
                emit_json_log(
                    logger=logger,
                    level="info",
                    component="publisher",
                    event="publish_success",
                    message=f"Oferta em texto postada em {target} (msg_id: {msg_id})",
                    channel=target,
                    duration=round(duration_ms, 2),
                    telegram_msg_id=msg_id,
                    mode="text",
                    fallback_used=media_publish_failed,
                    offer_id=str(offer_id) if offer_id else None,
                )
                res = {
                    "success": True,
                    "message_id": msg_id,
                    "mode": "text",
                }
                if media_publish_failed:
                    res["media_publish_failed"] = True
                    res["fallback_reason"] = fallback_reason
                return res
            else:
                err_msg = resp_json.get("description", "Erro desconhecido")
                emit_json_log(
                    logger=logger,
                    level="error",
                    component="publisher",
                    event="publish_failed",
                    message=f"Erro ao postar mensagem no Telegram: {err_msg}",
                    channel=target,
                    duration=round(duration_ms, 2),
                    offer_id=str(offer_id) if offer_id else None,
                    telegram_msg_id=telegram_msg_id,
                )
                return {
                    "success": False,
                    "error": err_msg,
                    "media_publish_failed": media_publish_failed,
                }

        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            emit_json_log(
                logger=logger,
                level="error",
                component="publisher",
                event="publish_failed",
                message=f"Exceção de rede ao comunicar com a Bot API do Telegram: {e}",
                channel=target,
                duration=round(duration_ms, 2),
                offer_id=str(offer_id) if offer_id else None,
                telegram_msg_id=telegram_msg_id,
            )
            return {
                "success": False,
                "error": str(e),
                "media_publish_failed": media_publish_failed,
            }
