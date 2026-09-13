import logging
from typing import Optional, Dict, Any
import httpx

from config import TELEGRAM_BOT_TOKEN, TARGET_CHANNEL_ID

logger = logging.getLogger(__name__)


def publish_to_telegram(
    message: str,
    channel_id: Optional[str] = None,
    image_url: Optional[str] = None,
    parse_mode: str = "HTML",
) -> Dict[str, Any]:
    """
    Publica uma mensagem formatada no canal/grupo do Telegram utilizando a Bot API oficial.
    
    Fallback resiliente: se o envio com foto falhar (ex: URL de imagem corrompida ou inacessível),
    tenta enviar automaticamente como mensagem de texto para não perder a promoção.
    """
    target = channel_id or TARGET_CHANNEL_ID
    token = TELEGRAM_BOT_TOKEN

    if not token or token == "SEU_BOT_TOKEN_AQUI":
        logger.warning(
            f"[Publisher SIMULAÇÃO] Token do bot não configurado. Mensagem simulada para {target}:\n{message[:150]}..."
        )
        return {
            "success": True,
            "simulated": True,
            "channel": target,
            "message_preview": message[:100],
        }

    api_url = f"https://api.telegram.org/bot{token}"

    with httpx.Client(timeout=15.0) as client:
        # Tentativa 1: Enviar como Foto com Legenda
        if image_url and image_url.startswith("http"):
            try:
                photo_payload = {
                    "chat_id": target,
                    "photo": image_url,
                    "caption": message[:1024],  # Limite de legenda do Telegram é 1024 chars
                    "parse_mode": parse_mode,
                }
                response = client.post(f"{api_url}/sendPhoto", data=photo_payload)
                resp_json = response.json()

                if response.is_success and resp_json.get("ok"):
                    msg_id = resp_json.get("result", {}).get("message_id")
                    logger.info(f"[Publisher] Oferta com foto postada com sucesso em {target} (msg_id: {msg_id})")
                    return {"success": True, "message_id": msg_id, "mode": "photo"}
                else:
                    logger.warning(
                        f"[Publisher] Falha ao enviar foto no Telegram ({resp_json.get('description')}). "
                        f"Tentando fallback para texto puro..."
                    )
            except Exception as e:
                logger.warning(f"[Publisher] Exceção ao enviar foto: {e}. Executando fallback para texto...")

        # Tentativa 2 / Padrão: Enviar como Mensagem de Texto
        try:
            text_payload = {
                "chat_id": target,
                "text": message[:4096],  # Limite de mensagem de texto é 4096 chars
                "parse_mode": parse_mode,
                "disable_web_page_preview": False,
            }
            response = client.post(f"{api_url}/sendMessage", data=text_payload)
            resp_json = response.json()

            if response.is_success and resp_json.get("ok"):
                msg_id = resp_json.get("result", {}).get("message_id")
                logger.info(f"[Publisher] Oferta em texto postada com sucesso em {target} (msg_id: {msg_id})")
                return {"success": True, "message_id": msg_id, "mode": "text"}
            else:
                err_msg = resp_json.get("description", "Erro desconhecido")
                logger.error(f"[Publisher] Erro ao postar mensagem no Telegram: {err_msg}")
                return {"success": False, "error": err_msg}

        except Exception as e:
            logger.error(f"[Publisher] Exceção de rede ao comunicar com a Bot API do Telegram: {e}")
            return {"success": False, "error": str(e)}
