"""
Ponto de Entrada da Automação de Captura — Elite das Pechinchas
Inicializa o Userbot Telethon que escuta os grupos-fonte e ingere as promoções em tempo real.
Execução: python main.py
"""

import os
import sys
import logging
from config import (
    TELEGRAM_API_ID,
    TELEGRAM_API_HASH,
    TELEGRAM_SESSION_NAME,
    SOURCE_CHANNELS,
    TARGET_CHANNEL_ID,
    MIN_DISCOUNT_PERCENT,
)
from bot.listener import run_listener

# Configuração de Logging com formato limpo
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("elitedaspechinchas.main")


def print_banner():
    banner = f"""
===================================================================
   🔥 ELITE DAS PECHINCHAS — AUTOMAÇÃO DE CAPTURA & AFILIADOS 🔥
===================================================================
  • API_ID: {TELEGRAM_API_ID or 'NÃO CONFIGURADO'}
  • Sessão: {TELEGRAM_SESSION_NAME}
  • Fontes Monitoradas: {', '.join(SOURCE_CHANNELS)}
  • Canal de Destino: {TARGET_CHANNEL_ID}
  • Filtro Mínimo: {MIN_DISCOUNT_PERCENT}% OFF
===================================================================
    """
    print(banner)


def main():
    print_banner()

    if not TELEGRAM_API_ID or not TELEGRAM_API_HASH:
        logger.warning(
            "⚠️ AVISO: TELEGRAM_API_ID ou TELEGRAM_API_HASH não estão definidos no arquivo .env!\n"
            "Preencha suas credenciais do Telegram (https://my.telegram.org/apps) para conectar o Userbot real."
        )

    logger.info("Iniciando escuta do Userbot Telethon...")
    try:
        run_listener()
    except KeyboardInterrupt:
        logger.info("🛑 Automação interrompida pelo operador (Ctrl+C). Encerrando graciosamente...")
        sys.exit(0)
    except Exception as e:
        logger.critical(f"❌ Falha fatal na execução do Userbot: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
