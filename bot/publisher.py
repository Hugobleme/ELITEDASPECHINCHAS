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

logger = logging.getLogger(__name__)


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
) -> Dict[str, Any]:
    """
    Publica uma mensagem formatada no canal/grupo do Telegram utilizando a Bot API oficial.
    Suporta imagens com legenda, botões inline interativos e fallback resiliente.
    """
    target = channel_id or TARGET_CHANNEL_ID
    token = TELEGRAM_BOT_TOKEN

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

    with httpx.Client(timeout=15.0) as client:
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
