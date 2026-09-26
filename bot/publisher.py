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

import hashlib
import threading
import time

logger = logging.getLogger(__name__)

# Cache de publicações recentes para garantir prevenção total de posts duplicados
_recent_publications: Dict[str, float] = {}
_pub_lock = threading.Lock()
PUB_DEDUPLICATION_WINDOW_SECONDS = 900  # 15 minutos


def clear_publication_cache() -> None:
    """Limpa o cache de publicações recentes (utilizado primariamente em testes)."""
    with _pub_lock:
        _recent_publications.clear()


def _get_message_fingerprint(message: str, image_url: Optional[str]) -> str:
    """Gera um hash único baseado no conteúdo da mensagem e URL da imagem."""
    norm_msg = " ".join((message or "").split())
    norm_img = (image_url or "").strip()
    key = f"{norm_msg}_{norm_img}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def is_duplicate_publication(message: str, image_url: Optional[str]) -> bool:
    """
    Verifica se a mensagem idêntica já foi enviada no intervalo recente de 15 minutos.
    Registra o timestamp atual se for uma mensagem inédita.
    """
    fingerprint = _get_message_fingerprint(message, image_url)
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
    parse_mode: str = "HTML",
    reply_markup: Optional[Dict[str, Any]] = None,
    check_duplicate: bool = True,
) -> Dict[str, Any]:
    """
    Publica uma mensagem formatada no canal/grupo do Telegram utilizando a Bot API oficial.
    Suporta imagens com legenda, botões inline interativos e fallback resiliente.
    Possui proteção integrada contra publicações duplicadas (15 min).
    """
    target = channel_id or TARGET_CHANNEL_ID
    token = TELEGRAM_BOT_TOKEN

    # Proteção de Duplicação Imediata
    if check_duplicate and is_duplicate_publication(message, image_url):
        return {
            "success": True,
            "duplicate_prevented": True,
            "channel": target,
            "message": "Post duplicado bloqueado pelo mecanismo de proteção temporal.",
        }

    is_simulated = (
        not token
        or token in ("SEU_BOT_TOKEN_AQUI", "mock_bot_token")
        or (SIMULATED_BOT_ENABLED and os.getenv("ENVIRONMENT") != "production")
    )

    if is_simulated:
        logger.info(
            f"[Publisher SIMULAÇÃO] Publicação simulada para canal '{target}':\n{message[:200]}..."
        )
        sim_result = {
            "success": True,
            "simulated": True,
            "channel": target,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "has_image": bool(image_url),
            "has_button": bool(reply_markup),
            "message_length": len(message),
            "message_preview": message[:150],
        }
        _record_simulated_publication(sim_result)
        return sim_result

    api_url = f"https://api.telegram.org/bot{token}"
    timeout_config = httpx.Timeout(30.0, connect=15.0)
    with httpx.Client(timeout=timeout_config) as client:
        # Tentativa 1: Enviar como Foto com Legenda (limite 1024 caracteres)
        if image_url and image_url.startswith("http"):
            try:
                photo_payload = {
                    "chat_id": target,
                    "photo": image_url,
                    "caption": message[:1024],
                    "parse_mode": parse_mode,
                }
                if reply_markup:
                    photo_payload["reply_markup"] = json.dumps(reply_markup)

                response = client.post(f"{api_url}/sendPhoto", data=photo_payload)
                resp_json = response.json()

                if response.is_success and resp_json.get("ok"):
                    msg_id = resp_json.get("result", {}).get("message_id")
                    logger.info(f"[Publisher] Oferta com foto postada em {target} (msg_id: {msg_id})")
                    return {"success": True, "message_id": msg_id, "mode": "photo"}
                else:
                    logger.warning(
                        f"[Publisher] Falha ao enviar foto no Telegram ({resp_json.get('description')}). "
                        f"Tentando fallback para texto..."
                    )
            except Exception as e:
                logger.warning(f"[Publisher] Exceção ao enviar foto: {e}. Executando fallback...")

        # Tentativa 2: Enviar como Mensagem de Texto (limite 4096 caracteres)
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

            if response.is_success and resp_json.get("ok"):
                msg_id = resp_json.get("result", {}).get("message_id")
                logger.info(f"[Publisher] Oferta em texto postada em {target} (msg_id: {msg_id})")
                return {"success": True, "message_id": msg_id, "mode": "text"}
            else:
                err_msg = resp_json.get("description", "Erro desconhecido")
                logger.error(f"[Publisher] Erro ao postar mensagem no Telegram: {err_msg}")
                return {"success": False, "error": err_msg}

        except Exception as e:
            logger.error(f"[Publisher] Exceção de rede ao comunicar com a Bot API do Telegram: {e}")
            return {"success": False, "error": str(e)}
