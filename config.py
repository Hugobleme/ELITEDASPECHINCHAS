import os
from typing import List

# ==============================================================================
# CONFIGURAÇÕES CENTRAIS — ELITE DAS PECHINCHAS (AUTOMAÇÃO & INGESTÃO TELEGRAM)
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Credenciais do Telegram (Userbot Telethon & Bot API)
# ------------------------------------------------------------------------------
# Obtenha API_ID e API_HASH em: https://my.telegram.org/apps
TELEGRAM_API_ID = int(os.getenv("TELEGRAM_API_ID", "0"))
TELEGRAM_API_HASH = os.getenv("TELEGRAM_API_HASH", "")
TELEGRAM_SESSION_NAME = os.getenv("TELEGRAM_SESSION_NAME", "elitedaspechinchas_userbot")

# Bot Oficial para postagem no canal próprio (obtido no @BotFather)
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

# Canal ou grupo oficial de destino das promoções (ex: @elitedaspechinchas ou -100123456789)
TARGET_CHANNEL_ID = os.getenv("TARGET_CHANNEL_ID", "@elitedaspechinchas")

# Grupos/canais de origem autorizados para captura (1 a 3 fontes)
# Exemplo no .env: SOURCE_CHANNELS="@promos_tech,@radar_gamer,@ofertas_vip"
raw_sources = os.getenv("SOURCE_CHANNELS", "@promos_tech,@radar_gamer,@ofertas_vip")
SOURCE_CHANNELS: List[str] = [
    ch.strip() for ch in raw_sources.split(",") if ch.strip()
]

# ------------------------------------------------------------------------------
# 2. Tags e Regras de Afiliados por Loja
# ------------------------------------------------------------------------------
DEFAULT_AFFILIATE_TAGS = {
    "Amazon": os.getenv("AMAZON_TAG", "elitedaspechinchas-20"),
    "Mercado Livre": os.getenv("MERCADOLIVRE_TAG", "elitedaspechinchas"),
    "Magazine Luiza": os.getenv("MAGALU_TAG", "elitedaspechinchas"),
    "Kabum": os.getenv("KABUM_TAG", "elitedaspechinchas-20"),
    "Shopee": os.getenv("SHOPEE_TAG", "elitedaspechinchas"),
    "AliExpress": os.getenv("ALIEXPRESS_TAG", "elitedaspechinchas"),
}

# Parâmetros de URL utilizados por cada loja
AFFILIATE_PARAM_NAMES = {
    "Amazon": "tag",
    "Mercado Livre": "tag",
    "Magazine Luiza": "parceiro",
    "Kabum": "tag",
    "Shopee": "af_siteid",
    "AliExpress": "aff_fcid",
}

# ------------------------------------------------------------------------------
# 3. Motor de Regras e Curadoria
# ------------------------------------------------------------------------------
# Desconto percentual mínimo para aceitar uma promoção
MIN_DISCOUNT_PERCENT = int(os.getenv("MIN_DISCOUNT_PERCENT", "10"))

# Janela de deduplicação temporal (horas)
DEDUPLICATION_HOURS = int(os.getenv("DEDUPLICATION_HOURS", "24"))

# Limite máximo de ofertas aceitas por hora de uma mesma fonte (evita spam)
MAX_OFFERS_PER_HOUR_PER_SOURCE = int(os.getenv("MAX_OFFERS_PER_HOUR_PER_SOURCE", "30"))

# Se ativado, ofertas com super descontos são aprovadas automaticamente
AUTO_APPROVE_ENABLED = os.getenv("AUTO_APPROVE_ENABLED", "false").lower() in ("true", "1", "yes")
AUTO_APPROVE_DISCOUNT_THRESHOLD = int(os.getenv("AUTO_APPROVE_DISCOUNT_THRESHOLD", "40"))

# ------------------------------------------------------------------------------
# 4. Infraestrutura & Banco
# ------------------------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/promoradar")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:3000").rstrip("/")
