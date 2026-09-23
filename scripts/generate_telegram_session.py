"""
Script utilitário para gerar uma sessão persistente (StringSession) do Telethon.
Permite autenticar sua conta uma única vez e rodar o Userbot em servidores na nuvem
(Railway, Docker, Render, etc.) sem precisar de terminal interativo no deploy.

Execução:
    python scripts/generate_telegram_session.py
"""

import sys
import asyncio

# Garante suporte a UTF-8 em terminais Windows (cp1252) sem quebrar com emojis
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from telethon import TelegramClient
from telethon.sessions import StringSession

# Credenciais pré-definidas (obtidas no my.telegram.org)
DEFAULT_API_ID = 34621401
DEFAULT_API_HASH = "fb4c324821a9411620e725fe085cd123"


async def generate():
    print("=" * 65)
    print("GERADOR DE TELEGRAM STRING SESSION - ELITE DAS PECHINCHAS")
    print("=" * 65)

    api_id_input = input(f"Digite o TELEGRAM_API_ID [{DEFAULT_API_ID}]: ").strip()
    api_id = int(api_id_input) if api_id_input else DEFAULT_API_ID

    api_hash_input = input(f"Digite o TELEGRAM_API_HASH [{DEFAULT_API_HASH}]: ").strip()
    api_hash = api_hash_input if api_hash_input else DEFAULT_API_HASH

    print(f"\nConectando à infraestrutura do Telegram (API_ID: {api_id})...")
    print("O Telegram solicitará seu telefone (ex: +5511999998888) e código de confirmação:\n")

    client = TelegramClient(StringSession(), api_id, api_hash)
    await client.start()

    session_string = client.session.save()
    me = await client.get_me()

    # Salva em arquivo limpo para evitar problemas de quebra de linha do terminal
    with open("session.txt", "w", encoding="utf-8") as f:
        f.write(session_string.strip())

    username = f"@{me.username}" if getattr(me, "username", None) else (me.phone or "sem_username")
    print("\n" + "=" * 65)
    print(f"[OK] SUCESSO! Conectado como: {me.first_name} ({username})")
    print("=" * 65)
    print("O codigo foi salvo no arquivo 'session.txt' (sem quebras de linha)!")
    print("Abra o arquivo 'session.txt', copie todo o conteudo e cole no Railway.")
    print("-" * 65)
    print(session_string)
    print("-" * 65 + "\n")
    await client.disconnect()


if __name__ == "__main__":
    try:
        asyncio.run(generate())
    except KeyboardInterrupt:
        print("\nCancelado pelo usuario.")
        sys.exit(0)
    except Exception as e:
        print(f"\n[ERRO] Falha ao gerar sessao: {e}")
        sys.exit(1)
