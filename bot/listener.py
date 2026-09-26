import os
import json
import logging
import asyncio
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


EMBEDDED_PRODUCTION_SESSION = "1AZWarzsBu6bW1_1oVoNmq4uveB3d1zy9mRxyNeJrFLjhFhwhQU5Gx44PYKmwQ2sk9nmwQZ59KO5ctw7cTo2wYDcm1pAuz2qbOGzpcROP_r1if13HdYnj2RaopLZNsv7ls5gLoKEdaD8-qpBYgKVbHegDDLKOM4Ye7HIaEgipiJtOqqekKeIWaQjXhF43twYEXZ4AbfWF_SdOsKo87eQUN96wveKxBet5Vj1asZAyvwA1Vh6ojr5WIr17BqWmwUZeXmI9yZ6bHXWq6p8EpfuaZ-dO3JoesKuYcLYU7M2KxmZcWobJOBpS5nvU-ECtgkP1-vLaP2sbB5d56vqcf_Dcr-nKOnMkgZU="


def get_authenticated_string_session() -> Optional[str]:
    """
    Valida e recupera rigorosamente a StringSession do Telethon.
    Tenta:
    1. Variável de ambiente TELEGRAM_STRING_SESSION (com validação de auth_key)
    2. Arquivo session.txt local
    3. Sessão oficial de produção incorporada
    """
    from telethon.sessions import StringSession

    # 1. Variável de ambiente
    env_sess = os.getenv("TELEGRAM_STRING_SESSION", "").strip()
    if env_sess:
        try:
            clean_env = "".join(env_sess.split())
            s = StringSession(clean_env)
            if s.auth_key:
                logger.info("[Listener] TELEGRAM_STRING_SESSION da variável de ambiente validada com sucesso.")
                return clean_env
            else:
                logger.warning("[Listener] TELEGRAM_STRING_SESSION do ambiente sem auth_key. Usando chave de recuperação.")
        except Exception as e:
            logger.warning(f"[Listener] TELEGRAM_STRING_SESSION do ambiente corrompida ({e}). Usando sessão de recuperação oficial.")

    # 2. Arquivo session.txt local
    if os.path.exists("session.txt"):
        try:
            with open("session.txt", "r", encoding="utf-8") as f:
                file_sess = "".join(f.read().split())
                s = StringSession(file_sess)
                if s.auth_key:
                    logger.info("[Listener] Sessão carregada do arquivo 'session.txt' com sucesso.")
                    return file_sess
        except Exception as e:
            logger.warning(f"[Listener] Não foi possível ler sessão de session.txt: {e}")

    # 3. Chave autenticada incorporada
    try:
        s = StringSession(EMBEDDED_PRODUCTION_SESSION)
        if s.auth_key:
            logger.info("[Listener] Utilizando sessão oficial de produção autenticada.")
            return EMBEDDED_PRODUCTION_SESSION
    except Exception as e:
        logger.error(f"[Listener] Erro ao carregar sessão incorporada: {e}")

    return None


def create_telegram_client():
    """
    Instancia o cliente Telethon (Userbot) com tratamento de credenciais resiliente.
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

        session_str = get_authenticated_string_session()
        if session_str:
            logger.info("[Listener] Conectando Telethon via StringSession validada.")
            return TelegramClient(StringSession(session_str), TELEGRAM_API_ID, TELEGRAM_API_HASH)

        session_dir = os.path.dirname(TELEGRAM_SESSION_NAME)
        if session_dir:
            os.makedirs(session_dir, exist_ok=True)
        return TelegramClient(TELEGRAM_SESSION_NAME, TELEGRAM_API_ID, TELEGRAM_API_HASH)
    except Exception as e:
        logger.error(f"[Listener] Erro ao instanciar TelegramClient: {e}")
        return None


last_processed_ids: Dict[int, int] = {}


async def run_channel_poller(client, channels: List[str], interval: float = 8.0):
    """
    Poller ativo concorrente que garante captura em canais broadcast do Telegram.
    Sincroniza os IDs mais recentes na inicialização e monitora continuamente novas postagens.
    """
    logger.info(f"[Poller] Iniciando verificação ativa periódica (intervalo: {interval}s) para: {channels}")

    # Inicializa sincronizando os IDs mais recentes de cada canal para não reprocessar postagens antigas no boot
    for ch in channels:
        clean_ch = ch.strip()
        if not clean_ch:
            continue
        try:
            entity = await client.get_entity(clean_ch)
            latest_id = 0
            async for m in client.iter_messages(entity, limit=1):
                latest_id = m.id
                break

            ent_id = getattr(entity, "id", None)
            if ent_id:
                last_processed_ids[ent_id] = latest_id
                # Telethon channel peer IDs may also be referenced with -100 prefix or signed
                last_processed_ids[-ent_id] = latest_id
                try:
                    last_processed_ids[int(f"-100{ent_id}")] = latest_id
                except Exception:
                    pass
            logger.info(f"[Poller Startup] Canal {clean_ch} sincronizado no último post ID: {latest_id}")
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

                        source_name = getattr(entity, "username", None)
                        if source_name:
                            source_name = f"@{source_name}"
                        else:
                            source_name = getattr(entity, "title", clean_ch)

                        # Evita reprocessamento concorrente entre Poller e NewMessage
                        if not should_process_msg_id(msg.id):
                            continue

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
        source_name = getattr(chat, "username", None)
        if source_name:
            source_name = f"@{source_name}"
        else:
            source_name = getattr(chat, "title", f"chat_{event.chat_id}")

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

        # Evita reprocessamento concorrente entre NewMessage e Poller
        if not should_process_msg_id(msg.id):
            logger.info(f"[Listener] Mensagem ID {msg.id} já capturada pelo Poller. Ignorando evento concorrente.")
            return

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
    Inicia e mantém o Userbot Telethon ativo continuamente com supervisor e reconexão infinita resiliente.
    Nunca encerra o processo no Railway por desconexões temporárias de rede.
    """
    attempts = 0

    while True:
        try:
            if client is None:
                client = create_telegram_client()

            if client is None:
                logger.warning("[Listener] Cliente Telethon não configurado. Aguardando 60s antes de tentar novamente...")
                await asyncio.sleep(60)
                continue

            if not client.is_connected():
                logger.info(f"[Listener] Conectando ao Telegram MTProto (tentativa {attempts + 1})...")
                await client.connect()

            if not await client.is_user_authorized():
                logger.critical(
                    "❌ [Listener] A sessão do Telegram não está autorizada no servidor!\n"
                    "Gere uma nova sessão via 'python scripts/generate_telegram_session.py', "
                    "copie o conteúdo do arquivo 'session.txt' e atualize a variável TELEGRAM_STRING_SESSION no Railway."
                )
                await asyncio.sleep(60)
                continue

            me = await client.get_me()
            username = f"@{me.username}" if getattr(me, "username", None) else (me.phone or "sem_username")
            logger.info(f"✅ Userbot conectado com sucesso como: {me.first_name} ({username})")

            await setup_event_handlers(client, SOURCE_CHANNELS)
            logger.info(f"🎯 Monitoramento ativo em tempo real em: {', '.join(SOURCE_CHANNELS)}")

            # Inicia o poller concorrente contínuo
            poller_task = asyncio.create_task(run_channel_poller(client, SOURCE_CHANNELS, interval=8.0))

            # Task periódica de heartbeat no log a cada 5 minutos
            async def heartbeat_loop():
                while True:
                    await asyncio.sleep(300)
                    if client and client.is_connected():
                        logger.info("[Heartbeat] 💓 Userbot Telethon 100% operacional e conectado aos canais de origem.")

            heartbeat_task = asyncio.create_task(heartbeat_loop())

            # Reseta contador de tentativas após conexão bem-sucedida
            attempts = 0

            try:
                await client.run_until_disconnected()
                logger.warning("[Listener] Conexão MTProto desconectada. Reconectando...")
            finally:
                poller_task.cancel()
                heartbeat_task.cancel()

            # Pausa breve antes de reconectar após desconexão natural
            await asyncio.sleep(3)

        except asyncio.CancelledError:
            logger.info("[Listener] Tarefa cancelada graciosamente.")
            break
        except Exception as e:
            attempts += 1
            delay = min(60, max(5, attempts * 5))
            logger.error(
                f"[Listener] Queda na conexão do Telegram (tentativa {attempts}): {e}. Reconectando em {delay}s...",
                exc_info=True,
            )
            try:
                if client and client.is_connected():
                    await client.disconnect()
            except Exception:
                pass
            client = None
            await asyncio.sleep(delay)


def run_listener():
    """Ponto de entrada síncrono para o listener Telethon com supervisor infinito."""
    while True:
        client = create_telegram_client()
        if client:
            try:
                client.loop.run_until_complete(start_userbot(client))
            except (KeyboardInterrupt, SystemExit):
                logger.info("[Listener] Interrupção recebida. Encerrando listener.")
                break
            except Exception as e:
                logger.error(f"[Listener] Falha no loop do cliente Telethon: {e}. Reiniciando em 5s...", exc_info=True)
                time.sleep(5)
            finally:
                try:
                    if client.is_connected():
                        client.loop.run_until_complete(client.disconnect())
                except Exception:
                    pass
        else:
            logger.info("[Listener] Credenciais do Telegram não configuradas. Aguardando 60s...")
            time.sleep(60)
