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

import time
import threading

from bot.structured_logger import get_structured_logger, emit_json_log

# Configuração de Logging Estruturado em JSON
logger = get_structured_logger("elitedaspechinchas.main", component="listener")


def start_heartbeat(interval_seconds: float = 300.0):
    """Dispara uma thread de heartbeat periódico a cada 5 min registrando a operação do listener."""
    def _heartbeat_worker():
        while True:
            time.sleep(interval_seconds)
            emit_json_log(
                logger=logger,
                level="info",
                component="listener",
                event="heartbeat",
                message="listener operational",
            )
    t = threading.Thread(target=_heartbeat_worker, daemon=True)
    t.start()
    return t


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

    # Inicia heartbeat periódico a cada 5 min (300 segundos)
    start_heartbeat(interval_seconds=300.0)
    logger.info("Iniciando escuta do Userbot Telethon com supervisor ativo...")
    restart_count = 0
    while True:
        try:
            run_listener()
            logger.warning("[Main Supervisor] run_listener encerrou normalmente. Reiniciando em 5 segundos...")
            time.sleep(5)
        except KeyboardInterrupt:
            logger.info("🛑 Automação interrompida pelo operador (Ctrl+C). Encerrando graciosamente...")
            sys.exit(0)
        except Exception as e:
            restart_count += 1
            delay = min(60, max(5, restart_count * 5))
            logger.critical(
                f"❌ [Main Supervisor] Falha na execução do Userbot (reinício #{restart_count}): {e}. "
                f"Reiniciando em {delay}s...",
                exc_info=True,
            )
            time.sleep(delay)


if __name__ == "__main__":
    main()
