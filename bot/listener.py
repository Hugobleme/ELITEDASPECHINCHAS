import os
import sys
import logging
import asyncio
from typing import List, Optional

from telethon import TelegramClient, events
from telethon.tl.types import MessageEntityTextUrl, MessageEntityUrl

from config import (
    TELEGRAM_API_ID,
    TELEGRAM_API_HASH,
    TELEGRAM_SESSION_NAME,
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
    Extrai URLs embutidas nas entidades de texto do Telegram (ex: hyperlinks do tipo [texto](url)).
    """
    urls = []
    if not message.entities:
        return urls

    for entity in message.entities:
        if isinstance(entity, MessageEntityTextUrl):
            urls.append(entity.url)
        elif isinstance(entity, MessageEntityUrl):
            # URL pura presente no texto
            offset = entity.offset
            length = entity.length
            url_str = message.text[offset : offset + length]
            urls.append(url_str)

    return urls


def create_telegram_client() -> TelegramClient:
    """
    Instancia o cliente Telethon (Userbot).
    """
    if not TELEGRAM_API_ID or not TELEGRAM_API_HASH:
        logger.error(
            "TELEGRAM_API_ID ou TELEGRAM_API_HASH não configurados no arquivo .env!\n"
            "Obtenha suas credenciais em https://my.telegram.org/apps"
        )
    session_dir = os.path.dirname(TELEGRAM_SESSION_NAME)
    if session_dir:
        os.makedirs(session_dir, exist_ok=True)

    return TelegramClient(TELEGRAM_SESSION_NAME, TELEGRAM_API_ID, TELEGRAM_API_HASH)




async def setup_event_handlers(client: TelegramClient, channels: List[str]):
    """
    Registra os ouvintes para novos eventos nos canais/grupos configurados.
    """
    logger.info(f"Configurando escuta para os canais-fonte: {channels}")

    @client.on(events.NewMessage(chats=channels))
    async def handle_new_promotion(event):
        msg = event.message
        text = msg.text or msg.message or ""
        
        if not text.strip():
            logger.debug(f"[Listener] Mensagem {msg.id} ignorada: sem conteúdo de texto.")
            return

        chat = await event.get_chat()
        source_name = getattr(chat, "username", None)
        if source_name:
            source_name = f"@{source_name}"
        else:
            source_name = getattr(chat, "title", f"chat_{event.chat_id}")

        logger.info(f"[Listener] 📥 Nova mensagem capturada de {source_name} (ID: {msg.id})")

        # Extrai links de entidades (hyperlinks)
        entities_links = extract_entities_urls(msg)

        payload = {
            "text": text,
            "telegram_msg_id": msg.id,
            "source_name": source_name,
            "entities_links": entities_links,
            "media_url": None,
        }

        # Despacha para a fila assíncrona do Celery
        try:
            task = process_telegram_message.delay(payload)
            logger.info(f"[Listener] 🚀 Mensagem enviada para a task Celery {task.id}")
        except Exception as e:
            logger.error(f"[Listener] Falha ao enviar payload para o Celery: {e}")
            # Em caso de falha de conexão com o Redis, executa processamento direto
            try:
                process_telegram_message(payload)
            except Exception as direct_err:
                logger.error(f"[Listener] Erro no processamento síncrono de fallback: {direct_err}")


async def start_userbot(client: Optional[TelegramClient] = None):
    """
    Inicia e mantém o Userbot Telethon ativo escutando os grupos-fonte.
    """
    if client is None:
        client = create_telegram_client()

    await client.start()
    me = await client.get_me()
    logger.info(f"✅ Userbot conectado com sucesso como: {me.first_name} (@{me.username or me.phone})")

    # Registra canais
    await setup_event_handlers(client, SOURCE_CHANNELS)
    logger.info(f"🎯 Monitoramento ativo em tempo real em: {', '.join(SOURCE_CHANNELS)}")

    await client.run_until_disconnected()


def run_listener():
    """Ponto de entrada síncrono para o listener Telethon."""
    client = create_telegram_client()
    with client:
        client.loop.run_until_complete(start_userbot(client))


if __name__ == "__main__":
    run_listener()
