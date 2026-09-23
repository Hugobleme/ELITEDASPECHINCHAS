"""
Script utilitário para gerar uma sessão persistente (StringSession) do Telethon.
Permite autenticar sua conta uma única vez e rodar o Userbot em servidores na nuvem
(Railway, Docker, Render, etc.) sem precisar de terminal interativo no deploy.

Execução:
    python scripts/generate_telegram_session.py
"""

import sys
import asyncio
from telethon import TelegramClient
from telethon.sessions import StringSession

# Tenta carregar credenciais do config ou solicita via input
try:
    from config import TELEGRAM_API_ID, TELEGRAM_API_HASH
except ImportError:
    TELEGRAM_API_ID = 0
    TELEGRAM_API_HASH = ""


async def generate():
    print("=" * 65)
    print("🔐 GERADOR DE TELEGRAM STRING SESSION — ELITE DAS PECHINCHAS")
    print("=" * 65)

    api_id = TELEGRAM_API_ID
    if not api_id:
        val = input("Digite o seu TELEGRAM_API_ID (ex: 34621401): ").strip()
        api_id = int(val)

    api_hash = TELEGRAM_API_HASH
    if not api_hash:
        api_hash = input("Digite o seu TELEGRAM_API_HASH: ").strip()

    print(f"\nConectando à infraestrutura do Telegram (API_ID: {api_id})...")
    client = TelegramClient(StringSession(), api_id, api_hash)
    await client.start()

    session_string = client.session.save()
    me = await client.get_me()

    print("\n" + "=" * 65)
    print(f"✅ SUCESSO! Conectado como: {me.first_name} (@{me.username or 'sem_username'})")
    print("=" * 65)
    print("Copie o valor abaixo e cole na variável TELEGRAM_STRING_SESSION no Railway:")
    print("-" * 65)
    print(session_string)
    print("-" * 65 + "\n")
    await client.disconnect()


if __name__ == "__main__":
    try:
        asyncio.run(generate())
    except KeyboardInterrupt:
        print("\nCancelado pelo usuário.")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Erro ao gerar sessão: {e}")
        sys.exit(1)
