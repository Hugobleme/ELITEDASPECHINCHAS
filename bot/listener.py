import os
import json
import logging
import asyncio
from typing import List, Optional, Dict, Any

from config import (
    TELEGRAM_API_ID,
    TELEGRAM_API_HASH,
    TELEGRAM_SESSION_NAME,
    TELEGRAM_STRING_SESSION,
    SOURCE_CHANNELS,
)
from processor.tasks import process_telegram_message

logger = logging.getLogger("elitedaspechinchas.bot.listener")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


def extract_entities_urls(message) -> List[str]:
    """
    Extrai URLs embutidas nas entidades de texto do Telegram (ex: hyperlinks [texto](url)).
    """
    urls = []
    if not message or not getattr(message, "entities", None):
        return urls

    try:
        from telethon.tl.types import MessageEntityTextUrl, MessageEntityUrl
        for entity in message.entities:
            if isinstance(entity, MessageEntityTextUrl):
                urls.append(entity.url)
            elif isinstance(entity, MessageEntityUrl):
                offset = entity.offset
                length = entity.length
                url_str = message.text[offset : offset + length]
                urls.append(url_str)
    except Exception as e:
        logger.warning(f"[Listener] Falha ao extrair entidades: {e}")

    return urls


def process_incoming_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Encaminha o payload estruturado para a task Celery ou fallback síncrono.
    """
    try:
        task = process_telegram_message.delay(payload)
        logger.info(f"[Listener] 🚀 Mensagem enviada para a task Celery {task.id}")
        return {"status": "dispatched", "task_id": str(task.id)}
    except Exception as e:
        logger.warning(f"[Listener] Celery indisponível ({e}). Executando processamento direto...")
        try:
            result = process_telegram_message(payload)
            logger.info(f"[Listener] Processamento síncrono concluído com status: {result.get('status')}")
            return result
        except Exception as direct_err:
            logger.error(f"[Listener] Erro no processamento síncrono: {direct_err}")
            return {"status": "error", "message": str(direct_err)}


def simulate_incoming_message(
    text: str,
    source_name: str = "@promos_tech",
    telegram_msg_id: Optional[int] = None,
    media_url: Optional[str] = None,
    entities_links: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Função utilitária para simulação de recebimento de mensagens no ambiente de desenvolvimento/teste.
    """
    if not telegram_msg_id:
        import random
        telegram_msg_id = random.randint(100000, 999999)

    payload = {
        "text": text,
        "telegram_msg_id": telegram_msg_id,
        "source_name": source_name,
        "entities_links": entities_links or [],
        "media_url": media_url,
    }

    logger.info(f"[Listener SIMULAÇÃO] 📥 Mensagem simulada recebida de {source_name} (ID: {telegram_msg_id})")
    return process_incoming_payload(payload)


def load_simulated_messages_from_json(file_path: str) -> List[Dict[str, Any]]:
    """
    Carrega mensagens de teste a partir de um arquivo JSON estruturado.
    """
    if not os.path.exists(file_path):
        logger.warning(f"[Listener] Arquivo {file_path} não encontrado.")
        return []

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            return [data]
    except Exception as e:
        logger.error(f"[Listener] Erro ao ler mensagens simuladas de {file_path}: {e}")
        return []


def create_telegram_client():
    """
    Instancia o cliente Telethon (Userbot) com tratamento de credenciais ausentes.
    """
    if not TELEGRAM_API_ID or not TELEGRAM_API_HASH:
        logger.warning(
            "TELEGRAM_API_ID ou TELEGRAM_API_HASH não configurados. "
            "Modo de escuta real inativo. Utilize simulate_incoming_message."
        )
        return None

    try:
        from telethon import TelegramClient
        from telethon.sessions import StringSession

        if TELEGRAM_STRING_SESSION and TELEGRAM_STRING_SESSION.strip():
            logger.info("[Listener] Conectando Telethon via TELEGRAM_STRING_SESSION persistente.")
            return TelegramClient(StringSession(TELEGRAM_STRING_SESSION.strip()), TELEGRAM_API_ID, TELEGRAM_API_HASH)

        session_dir = os.path.dirname(TELEGRAM_SESSION_NAME)
        if session_dir:
            os.makedirs(session_dir, exist_ok=True)
        return TelegramClient(TELEGRAM_SESSION_NAME, TELEGRAM_API_ID, TELEGRAM_API_HASH)
    except Exception as e:
        logger.error(f"[Listener] Erro ao instanciar TelegramClient: {e}")
        return None


async def setup_event_handlers(client, channels: List[str]):
    """
    Registra os ouvintes para novos eventos nos canais/grupos configurados.
    Garante que a conta do Telegram esteja inscrita nos canais para receber atualizações via MTProto.
    """
    from telethon import events
    from telethon.tl.functions.channels import JoinChannelRequest

    logger.info(f"Configurando escuta para os canais-fonte: {channels}")

    for ch in channels:
        clean_ch = ch.strip()
        if not clean_ch:
            continue
        try:
            entity = await client.get_entity(clean_ch)
            await client(JoinChannelRequest(entity))
            logger.info(f"[Listener] ✅ Inscrito com sucesso no canal-fonte: {clean_ch}")
        except Exception as join_err:
            logger.info(f"[Listener] Canal {clean_ch} verificado/acessível: {join_err}")

    @client.on(events.NewMessage(chats=channels))
    async def handle_new_promotion(event):
        msg = event.message
        text = msg.text or msg.message or ""

        if not text.strip():
            logger.debug(f"[Listener] Mensagem {msg.id} ignorada: sem texto.")
            return

        chat = await event.get_chat()
        source_name = getattr(chat, "username", None)
        if source_name:
            source_name = f"@{source_name}"
        else:
            source_name = getattr(chat, "title", f"chat_{event.chat_id}")

        logger.info(f"[Listener] 📥 Nova mensagem capturada de {source_name} (ID: {msg.id})")

        entities_links = extract_entities_urls(msg)

        payload = {
            "text": text,
            "telegram_msg_id": msg.id,
            "source_name": source_name,
            "entities_links": entities_links,
            "media_url": None,
        }

        process_incoming_payload(payload)


async def start_userbot(client=None):
    """
    Inicia e mantém o Userbot Telethon ativo escutando os grupos-fonte com reconexão resiliente.
    """
    if client is None:
        client = create_telegram_client()

    if client is None:
        logger.warning("[Listener] Cliente Telethon não pôde ser iniciado. Operando em modo simulado.")
        return

    max_reconnects = 5
    attempts = 0

    while attempts < max_reconnects:
        try:
            await client.connect()
            if not await client.is_user_authorized():
                logger.critical(
                    "❌ [Listener] A sessão do Telegram não está autorizada no servidor!\n"
                    "Gere uma nova sessão via 'python scripts/generate_telegram_session.py', "
                    "copie o conteúdo do arquivo 'session.txt' e atualize a variável TELEGRAM_STRING_SESSION no Railway."
                )
                return

            me = await client.get_me()
            username = f"@{me.username}" if getattr(me, "username", None) else (me.phone or "sem_username")
            logger.info(f"✅ Userbot conectado com sucesso como: {me.first_name} ({username})")

            await setup_event_handlers(client, SOURCE_CHANNELS)
            logger.info(f"🎯 Monitoramento ativo em tempo real em: {', '.join(SOURCE_CHANNELS)}")

            await client.run_until_disconnected()
            break
        except Exception as e:
            attempts += 1
            logger.error(f"[Listener] Queda na conexão do Telegram (tentativa {attempts}/{max_reconnects}): {e}")
            await asyncio.sleep(min(30, attempts * 5))


def run_listener():
    """Ponto de entrada síncrono para o listener Telethon."""
    client = create_telegram_client()
    if client:
        try:
            client.loop.run_until_complete(start_userbot(client))
        finally:
            if client.is_connected():
                client.loop.run_until_complete(client.disconnect())
    else:
        logger.info("[Listener] Execução síncrona encerrada: credenciais não configuradas para modo real.")


if __name__ == "__main__":
    run_listener()
