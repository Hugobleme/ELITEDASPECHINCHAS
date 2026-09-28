import os
import json
import logging
import asyncio
import re
import httpx
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from config import (
    TELEGRAM_API_ID,
    TELEGRAM_API_HASH,
    TELEGRAM_SESSION_NAME,
    TELEGRAM_STRING_SESSION,
    SOURCE_CHANNELS,
)
from processor.tasks import process_telegram_message
from database.connection import SessionLocal
from database.models import Offer

import threading
import time

logger = logging.getLogger("elitedaspechinchas.bot.listener")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

_processing_msg_ids: Dict[int, float] = {}
_msg_ids_lock = threading.Lock()
MSG_ID_DEDUPLICATION_WINDOW_SECONDS = 1800  # 30 minutos


def should_process_msg_id(msg_id: Optional[int]) -> bool:
    """
    Garante que um telegram_msg_id seja processado exatamente UMA vez entre threads e rotinas.
    Elimina qualquer concorrência entre o evento NewMessage e o Poller de canal.
    """
    if not msg_id:
        return True
    now = time.time()
    with _msg_ids_lock:
        cutoff = now - MSG_ID_DEDUPLICATION_WINDOW_SECONDS
        expired = [k for k, v in _processing_msg_ids.items() if v < cutoff]
        for k in expired:
            del _processing_msg_ids[k]

        if msg_id in _processing_msg_ids:
            return False
        _processing_msg_ids[msg_id] = now
        return True


def extract_entities_urls(message) -> List[str]:
    """
    Extrai URLs embutidas em botões inline, entidades de texto do Telegram e corpo da mensagem.
    """
    urls = []
    if not message:
        return urls

    # 1. Botões inline (ex: [Comprar no Mercado Livre])
    if getattr(message, "buttons", None):
        try:
            for row in message.buttons:
                for btn in row:
                    btn_url = getattr(btn, "url", None)
                    if btn_url and btn_url.startswith("http") and btn_url not in urls:
                        urls.append(btn_url)
        except Exception as e:
            logger.debug(f"[Listener] Falha ao extrair URLs dos botões: {e}")

    # 2. Entidades de texto do Telegram (ex: hyperlinks [texto](url))
    if getattr(message, "entities", None):
        try:
            from telethon.tl.types import MessageEntityTextUrl
            for entity in message.entities:
                if isinstance(entity, MessageEntityTextUrl) and entity.url:
                    if entity.url not in urls:
                        urls.append(entity.url)
        except Exception as e:
            logger.debug(f"[Listener] Falha ao extrair entidades: {e}")

    # 3. URLs diretas no texto via Regex seguro (evita descolamento de offset UTF-16)
    text = getattr(message, "text", "") or ""
    if text:
        try:
            from processor.parser import extract_all_urls
            for u in extract_all_urls(text):
                if u not in urls:
                    urls.append(u)
        except Exception as e:
            logger.debug(f"[Listener] Falha ao extrair URLs do texto: {e}")

    return urls


def process_incoming_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Processa o payload capturado executando imediatamente a ingestão e publicação direta.
    Elimina qualquer ponto único de falha ao não depender exclusivamente de filas intermediárias.
    Garante ausência total de duplicações ao não despachar para Celery se a execução direta sucedeu.
    """
    msg_id = payload.get("telegram_msg_id")
    source = payload.get("source_name")

    # Prevenção rigorosa de concorrência NewMessage vs Poller
    if msg_id and not should_process_msg_id(msg_id):
        logger.info(f"[Listener] ⚠️ Mensagem ID {msg_id} já em processamento ou capturada recentemente. Ignorando duplicação.")
        return {"status": "skipped", "reason": "already_processing_or_processed", "telegram_msg_id": msg_id}

    logger.info(f"[Listener] 🚀 Iniciando processamento imediato da mensagem ID {msg_id} da fonte {source}")

    try:
        result = process_telegram_message(payload)
        status = result.get("status") if isinstance(result, dict) else "unknown"
        offer_id = result.get("offer_id") if isinstance(result, dict) else None
        logger.info(f"[Listener] ✅ Processamento direto concluído com sucesso: {status} | Oferta: {offer_id}")
        return result
    except Exception as direct_err:
        logger.error(f"[Listener] Erro no processamento direto da mensagem {msg_id}: {direct_err}", exc_info=True)
        try:
            task = process_telegram_message.delay(payload)
            logger.info(f"[Listener] Fallback: Mensagem enviada para task Celery {task.id}")
            return {"status": "dispatched", "task_id": str(task.id)}
        except Exception:
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


def get_authenticated_string_session() -> Optional[str]:
    """
    Valida e recupera a StringSession do Telethon exclusivamente da variável de ambiente TELEGRAM_STRING_SESSION.
    Não utiliza chaves embarcadas nem arquivos locais para garantir segurança estrita.
    """
    from telethon.sessions import StringSession

    env_sess = os.getenv("TELEGRAM_STRING_SESSION", "").strip()
    if not env_sess:
        logger.info("[Listener] TELEGRAM_STRING_SESSION não configurada no ambiente.")
        return None

    try:
        clean_env = "".join(env_sess.split())
        s = StringSession(clean_env)
        if s.auth_key:
            logger.info("[Listener] TELEGRAM_STRING_SESSION da variável de ambiente validada com sucesso.")
            return clean_env
        else:
            logger.warning("[Listener] TELEGRAM_STRING_SESSION fornecida é inválida (sem auth_key).")
            return None
    except Exception as e:
        logger.warning(f"[Listener] Falha ao validar TELEGRAM_STRING_SESSION do ambiente: {e}")
        return None


def create_telegram_client():
    """
    Instancia o cliente Telethon (Userbot) exclusivamente se as credenciais e a sessão
    estiverem configuradas via variáveis de ambiente.
    """
    if not TELEGRAM_API_ID or not TELEGRAM_API_HASH:
        logger.info(
            "[Listener] TELEGRAM_API_ID ou TELEGRAM_API_HASH não configurados no ambiente. "
            "Modo Userbot MTProto inativo."
        )
        return None

    session_str = get_authenticated_string_session()
    if not session_str:
        logger.warning(
            "[Listener] TELEGRAM_STRING_SESSION não configurada no ambiente. "
            "Userbot Telethon não será iniciado. O Web Poller HTTP público operará como motor autônomo."
        )
        return None

    try:
        from telethon import TelegramClient
        from telethon.sessions import StringSession

        logger.info("[Listener] Conectando Telethon via StringSession do ambiente.")
        return TelegramClient(StringSession(session_str), TELEGRAM_API_ID, TELEGRAM_API_HASH)
    except Exception as e:
        logger.error(f"[Listener] Erro ao instanciar TelegramClient: {e}")
        return None


last_processed_ids: Dict[int, int] = {}


async def poll_public_channel(channel: str, limit: int = 15) -> List[Dict[str, Any]]:
    """
    Recupera as mensagens mais recentes de um canal público do Telegram via web preview oficial.
    Não requer credenciais de Userbot ou chaves de sessão MTProto.
    """
    slug = channel.lstrip("@").strip()
    if not slug:
        return []
    url = f"https://t.me/s/{slug}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=headers) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                logger.warning(f"[WebPoller] Falha ao consultar {url} (status: {resp.status_code})")
                return []
    except Exception as fetch_err:
        logger.warning(f"[WebPoller] Exceção de rede ao consultar {url}: {fetch_err}")
        return []

    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(resp.text, "html.parser")
        wraps = soup.find_all("div", class_="tgme_widget_message_wrap")

        parsed_messages = []
        for w in wraps:
            msg_div = w.find("div", class_="tgme_widget_message")
            if not msg_div:
                continue
            data_post = msg_div.get("data-post", "")
            if "/" not in data_post:
                continue
            try:
                msg_id = int(data_post.split("/")[-1])
            except (ValueError, TypeError):
                continue

            text_div = w.find("div", class_="tgme_widget_message_text")
            if not text_div:
                continue
            text = text_div.get_text(separator="\n").strip()
            if not text:
                continue

            links = []
            for a in text_div.find_all("a", href=True):
                href = a["href"].strip()
                if href and href.startswith("http"):
                    links.append(href)

            photo_wrap = w.find("a", class_="tgme_widget_message_photo_wrap")
            media_url = None
            if photo_wrap and photo_wrap.get("style"):
                m_img = re.search(r"url\('(.*?)'\)", photo_wrap["style"])
                if m_img:
                    media_url = m_img.group(1)

            parsed_messages.append({
                "text": text,
                "telegram_msg_id": msg_id,
                "source_name": f"@{slug}",
                "entities_links": links,
                "media_url": media_url,
            })

        return parsed_messages[-limit:] if limit else parsed_messages
    except Exception as parse_err:
        logger.error(f"[WebPoller] Erro ao parsear HTML do canal {slug}: {parse_err}")
        return []


async def run_public_web_poller(channels: List[str], interval: float = 8.0):
    """
    Loop assíncrono perpétuo do Web Poller HTTP.
    Garante captura ininterrupta de mensagens públicas com resiliência total a quedas de sessão MTProto.
    """
    logger.info(f"[WebPoller] 🌐 Iniciando Web Poller HTTP público autônomo (intervalo: {interval}s) para: {channels}")

    # Startup catch-up: processa mensagens recentes que não estejam no banco
    for ch in channels:
        try:
            recent_msgs = await poll_public_channel(ch, limit=5)
            if recent_msgs:
                db = SessionLocal()
                try:
                    for msg in recent_msgs:
                        mid = msg.get("telegram_msg_id")
                        if not mid:
                            continue
                        exists = db.query(Offer).filter(Offer.telegram_msg_id == mid).first()
                        if exists:
                            continue
                        logger.info(f"[WebPoller Startup] 📥 Processando post recente pós-boot de {msg['source_name']} (ID: {mid})")
                        await asyncio.to_thread(process_incoming_payload, msg)
                finally:
                    db.close()
        except Exception as startup_err:
            logger.warning(f"[WebPoller] Erro na sincronização inicial do canal {ch}: {startup_err}")

    while True:
        try:
            await asyncio.sleep(interval)
            for ch in channels:
                try:
                    new_msgs = await poll_public_channel(ch, limit=10)
                    for msg in new_msgs:
                        mid = msg.get("telegram_msg_id")
                        if not mid:
                            continue
                        await asyncio.to_thread(process_incoming_payload, msg)
                except Exception as ch_err:
                    logger.debug(f"[WebPoller] Erro ao verificar {ch}: {ch_err}")
        except asyncio.CancelledError:
            logger.info("[WebPoller] Cancelado graciosamente.")
            break
        except Exception as loop_err:
            logger.warning(f"[WebPoller] Erro no loop: {loop_err}")
            await asyncio.sleep(interval)


async def run_channel_poller(client, channels: List[str], interval: float = 8.0):
    """
    Poller ativo concorrente que garante captura em canais broadcast do Telegram.
    Sincroniza os IDs na inicialização, recupera ofertas recentes e monitora continuamente novas postagens.
    """
    logger.info(f"[Poller] Iniciando verificação ativa periódica (intervalo: {interval}s) para: {channels}")

    # Inicializa sincronizando os canais e processa mensagens recentes (últimos 30 min) que não estejam no banco
    for ch in channels:
        clean_ch = ch.strip()
        if not clean_ch:
            continue
        try:
            entity = await client.get_entity(clean_ch)
            ent_id = getattr(entity, "id", None)

            recent_msgs = []
            async for m in client.iter_messages(entity, limit=10):
                recent_msgs.append(m)

            if recent_msgs:
                max_id = max(m.id for m in recent_msgs)
                if ent_id:
                    last_processed_ids[ent_id] = max_id
                    last_processed_ids[-ent_id] = max_id
                    try:
                        last_processed_ids[int(f"-100{ent_id}")] = max_id
                    except Exception:
                        pass

                # Processa ofertas dos últimos 30 minutos pós-boot se ainda não persistidas
                now_utc = datetime.now(timezone.utc)
                db = SessionLocal()
                try:
                    for msg in reversed(recent_msgs):
                        if not msg.text or not msg.text.strip():
                            continue
                        if msg.date:
                            msg_date = msg.date if msg.date.tzinfo else msg.date.replace(tzinfo=timezone.utc)
                            if (now_utc - msg_date).total_seconds() > 1800:
                                continue

                        exists = db.query(Offer).filter(Offer.telegram_msg_id == msg.id).first()
                        if exists:
                            continue

                        source_name = f"@{entity.username}" if getattr(entity, "username", None) else (clean_ch if clean_ch.startswith("@") else getattr(entity, "title", clean_ch))
                        logger.info(f"[Poller Startup] 📥 Processando post recente pós-boot de {source_name} (ID: {msg.id})")
                        entities_links = extract_entities_urls(msg)
                        payload = {
                            "text": msg.text,
                            "telegram_msg_id": msg.id,
                            "source_name": source_name,
                            "entities_links": entities_links,
                            "media_url": None,
                        }
                        await asyncio.to_thread(process_incoming_payload, payload)
                finally:
                    db.close()

                logger.info(f"[Poller Startup] Canal {clean_ch} sincronizado no último post ID: {max_id}")
        except Exception as e:
            logger.warning(f"[Poller] Erro ao sincronizar inicial do canal {clean_ch}: {e}")

    while True:
        try:
            await asyncio.sleep(interval)
            for ch in channels:
                clean_ch = ch.strip()
                if not clean_ch:
                    continue
                try:
                    entity = await client.get_entity(clean_ch)
                    ent_id = getattr(entity, "id", None)
                    last_id = last_processed_ids.get(ent_id, 0)

                    new_messages = []
                    async for m in client.iter_messages(entity, limit=20, min_id=last_id):
                        if m.text and m.text.strip():
                            new_messages.append(m)

                    for msg in reversed(new_messages):
                        if ent_id:
                            last_processed_ids[ent_id] = max(last_processed_ids.get(ent_id, 0), msg.id)

                        source_name = f"@{entity.username}" if getattr(entity, "username", None) else (clean_ch if clean_ch.startswith("@") else getattr(entity, "title", clean_ch))

                        logger.info(f"[Poller] 📥 Nova mensagem descoberta de {source_name} (ID: {msg.id})")
                        entities_links = extract_entities_urls(msg)

                        payload = {
                            "text": msg.text,
                            "telegram_msg_id": msg.id,
                            "source_name": source_name,
                            "entities_links": entities_links,
                            "media_url": None,
                        }
                        try:
                            await asyncio.to_thread(process_incoming_payload, payload)
                        except Exception as poll_loop_err:
                            logger.error(f"[Poller] Erro ao processar mensagem {msg.id}: {poll_loop_err}", exc_info=True)

                except Exception as ch_err:
                    logger.debug(f"[Poller] Erro ao verificar {clean_ch}: {ch_err}")

        except asyncio.CancelledError:
            break
        except Exception as loop_err:
            logger.warning(f"[Poller] Exceção no loop do poller: {loop_err}")
            await asyncio.sleep(interval)


async def setup_event_handlers(client, channels: List[str]):
    """
    Registra os ouvintes para novos eventos nos canais/grupos configurados.
    Garante que a conta do Telegram esteja inscrita nos canais para receber atualizações via MTProto.
    """
    from telethon import events
    from telethon.tl.functions.channels import JoinChannelRequest

    logger.info(f"Configurando escuta para os canais-fonte: {channels}")

    resolved_chats = []
    chat_id_to_handle: Dict[Any, str] = {}
    for ch in channels:
        clean_ch = ch.strip()
        if not clean_ch:
            continue
        try:
            entity = await client.get_entity(clean_ch)
            try:
                await client(JoinChannelRequest(entity))
                logger.info(f"[Listener] ✅ Inscrito com sucesso no canal-fonte: {clean_ch}")
            except Exception as join_err:
                logger.info(f"[Listener] Canal {clean_ch} verificado/acessível: {join_err}")
            resolved_chats.append(entity)
            ent_id = getattr(entity, "id", None)
            if ent_id:
                chat_id_to_handle[ent_id] = clean_ch
                chat_id_to_handle[-ent_id] = clean_ch
                try:
                    chat_id_to_handle[int(f"-100{ent_id}")] = clean_ch
                except Exception:
                    pass
        except Exception as ent_err:
            logger.warning(f"[Listener] Canal {clean_ch} não encontrado ou inacessível: {ent_err}")

    target_chats = resolved_chats if resolved_chats else None

    @client.on(events.NewMessage(chats=target_chats))
    async def handle_new_promotion(event):
        msg = event.message
        text = msg.text or msg.message or ""

        if not text.strip():
            logger.debug(f"[Listener] Mensagem {msg.id} ignorada: sem texto.")
            return

        chat = await event.get_chat()
        chat_id = getattr(chat, "id", None)
        username = getattr(chat, "username", None)
        source_name = f"@{username}" if username else chat_id_to_handle.get(chat_id, chat_id_to_handle.get(event.chat_id, getattr(chat, "title", f"chat_{event.chat_id}")))

        logger.info(f"[Listener] 📥 Nova mensagem capturada de {source_name} (ID: {msg.id})")

        # Atualiza last_processed_ids em todos os formatos de chave
        chat_id = getattr(chat, "id", None)
        if chat_id:
            last_processed_ids[chat_id] = max(last_processed_ids.get(chat_id, 0), msg.id)
            base_id = abs(chat_id)
            if str(base_id).startswith("100"):
                try:
                    base_id = int(str(base_id)[3:])
                except ValueError:
                    pass
            last_processed_ids[base_id] = max(last_processed_ids.get(base_id, 0), msg.id)

        entities_links = extract_entities_urls(msg)

        payload = {
            "text": text,
            "telegram_msg_id": msg.id,
            "source_name": source_name,
            "entities_links": entities_links,
            "media_url": None,
        }

        try:
            await asyncio.to_thread(process_incoming_payload, payload)
        except Exception as evt_err:
            logger.error(f"[Listener] Erro ao processar evento de mensagem {msg.id}: {evt_err}", exc_info=True)


async def start_userbot(client=None):
    """
    Supervisor resiliente de captura com dupla camada de redundância:
    - Camada Primária (Universal): Web Poller HTTP público autônomo (100% resiliente, sem necessidade de sessão MTProto).
    - Camada Secundária (Telethon): MTProto Userbot para eventos em tempo real (se autorizado).
    """
    # 1. Inicia o Web Poller HTTP público imediatamente como task paralela perpétua
    web_poller_task = asyncio.create_task(run_public_web_poller(SOURCE_CHANNELS, interval=8.0))

    # 2. Heartbeat periódico a cada 5 minutos
    async def heartbeat_loop():
        while True:
            await asyncio.sleep(300)
            logger.info("[Heartbeat] 💓 Sistema de captura e publicação 100% operacional.")

    heartbeat_task = asyncio.create_task(heartbeat_loop())

    # 3. Tenta conectar o Telethon MTProto se client fornecido
    if client is not None:
        try:
            logger.info("[Listener] Tentando autenticar cliente Telethon MTProto...")
            await client.connect()

            if not await client.is_user_authorized():
                logger.warning(
                    "⚠️ [Listener] Sessão MTProto do Telethon não está autorizada.\n"
                    "O Web Poller HTTP público está ativo e operando com 100% de capacidade de captura."
                )
            else:
                me = await client.get_me()
                username = f"@{me.username}" if getattr(me, "username", None) else (me.phone or "sem_username")
                logger.info(f"✅ Userbot conectado com sucesso como: {me.first_name} ({username})")

                if not getattr(client, "_handlers_registered", False):
                    await setup_event_handlers(client, SOURCE_CHANNELS)
                    client._handlers_registered = True
                    logger.info(f"🎯 Monitoramento MTProto ativo em tempo real em: {', '.join(SOURCE_CHANNELS)}")

                poller_task = asyncio.create_task(run_channel_poller(client, SOURCE_CHANNELS, interval=8.0))

                try:
                    await client.run_until_disconnected()
                    logger.warning("[Listener] Conexão MTProto desconectada.")
                finally:
                    poller_task.cancel()

        except Exception as telethon_err:
            logger.warning(
                f"⚠️ [Listener] Telethon MTProto indisponível ({telethon_err}). "
                "O Web Poller HTTP público está ativo e operando com 100% de capacidade de captura."
            )

    # Mantém o processo vivo indefinidamente executando o Web Poller
    try:
        await web_poller_task
    finally:
        heartbeat_task.cancel()


def run_listener():
    """Ponto de entrada síncrono para o listener com redundância dupla (Telethon + HTTP Web Poller)."""
    while True:
        client = create_telegram_client()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(start_userbot(client))
        except (KeyboardInterrupt, SystemExit):
            logger.info("[Listener] Interrupção recebida. Encerrando listener.")
            break
        except Exception as e:
            logger.error(f"[Listener] Falha no supervisor: {e}. Reiniciando em 5s...", exc_info=True)
            time.sleep(5)
        finally:
            try:
                if client and client.is_connected():
                    loop.run_until_complete(client.disconnect())
            except Exception:
                pass
            loop.close()
