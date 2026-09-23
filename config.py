import os
from typing import List
from dotenv import load_dotenv

# Carrega variáveis locais do .env caso exista
load_dotenv()

def _get_int(key: str, default: int) -> int:
    val = os.getenv(key, "").strip()
    if not val:
        return default
    try:
        return int(val)
    except ValueError:
        return default

def _get_float(key: str, default: float) -> float:
    val = os.getenv(key, "").strip()
    if not val:
        return default
    try:
        return float(val)
    except ValueError:
        return default

# ==============================================================================
# CONFIGURAÇÕES CENTRAIS — ELITE DAS PECHINCHAS (AUTOMAÇÃO & INGESTÃO TELEGRAM)
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Credenciais do Telegram (Userbot Telethon & Bot API)
# ------------------------------------------------------------------------------
# Obtenha API_ID e API_HASH em: https://my.telegram.org/apps
TELEGRAM_API_ID = _get_int("TELEGRAM_API_ID", 34621401)
TELEGRAM_API_HASH = os.getenv("TELEGRAM_API_HASH", "fb4c324821a9411620e725fe085cd123")
TELEGRAM_SESSION_NAME = os.getenv("TELEGRAM_SESSION_NAME", "elitedaspechinchas_userbot")
TELEGRAM_STRING_SESSION = os.getenv("TELEGRAM_STRING_SESSION", "")

# Bot Oficial para postagem no canal próprio (obtido no @BotFather)
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "7835051187:AAH5yVihJzEmTYorqOCHRQtFJ3JrZNbzg-g")

# Canal ou grupo oficial de destino das promoções (ex: @ElitedasPechinchas ou -100123456789)
TARGET_CHANNEL_ID = os.getenv("TARGET_CHANNEL_ID", "@ElitedasPechinchas")

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
    "Amazon": os.getenv("AMAZON_TAG", ""),
    "Mercado Livre": os.getenv("MERCADOLIVRE_TAG", ""),
    "Magazine Luiza": os.getenv("MAGALU_TAG", ""),
    "Kabum": os.getenv("KABUM_TAG", ""),
    "Shopee": os.getenv("SHOPEE_TAG", ""),
    "AliExpress": os.getenv("ALIEXPRESS_TAG", ""),
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
# Faixas de preço aceitáveis
MIN_PRICE = _get_float("MIN_PRICE", 10.0)
MAX_PRICE = _get_float("MAX_PRICE", 5000.0)

# Desconto percentual mínimo para aceitar uma promoção
MIN_DISCOUNT_PERCENT = _get_int("MIN_DISCOUNT_PERCENT", 10)

# Score mínimo de qualidade para aprovação (0-100)
MIN_QUALITY_SCORE = _get_int("MIN_QUALITY_SCORE", 40)

# Exigir imagem válida
REQUIRE_VALID_IMAGE = os.getenv("REQUIRE_VALID_IMAGE", "false").lower() in ("true", "1", "yes")

# Categorias, lojas e palavras-chave bloqueadas
raw_blocked_cats = os.getenv("BLOCKED_CATEGORIES", "adulto,jogos de azar,armas,tabaco,drogas,pirataria,apostas,cassino")
BLOCKED_CATEGORIES: List[str] = [c.strip().lower() for c in raw_blocked_cats.split(",") if c.strip()]

raw_blocked_stores = os.getenv("BLOCKED_STORES", "loja_duvidosa,golpe_shop,fake_store")
BLOCKED_STORES: List[str] = [s.strip().lower() for s in raw_blocked_stores.split(",") if s.strip()]

raw_blocked_kws = os.getenv(
    "BLOCKED_KEYWORDS",
    "réplica,replica,falso,pirata,cassino,aposta,bet365,blaze,tigrinho,fortune tiger,18+",
)
BLOCKED_KEYWORDS: List[str] = [k.strip().lower() for k in raw_blocked_kws.split(",") if k.strip()]

# Janela de deduplicação temporal (horas)
DEDUPLICATION_HOURS = _get_int("DEDUPLICATION_HOURS", 24)

# Limite máximo de ofertas aceitas por hora de uma mesma fonte (evita spam)
MAX_OFFERS_PER_HOUR_PER_SOURCE = _get_int("MAX_OFFERS_PER_HOUR_PER_SOURCE", 30)

# Se ativado, ofertas com super descontos são aprovadas automaticamente
AUTO_APPROVE_ENABLED = os.getenv("AUTO_APPROVE_ENABLED", "false").lower() in ("true", "1", "yes")
AUTO_APPROVE_DISCOUNT_THRESHOLD = _get_int("AUTO_APPROVE_DISCOUNT_THRESHOLD", 40)

# Configuração de modo simulado do Bot e Mocks
SIMULATED_BOT_ENABLED = os.getenv("SIMULATED_BOT_ENABLED", "true").lower() in ("true", "1", "yes")
SIMULATED_PUBLICATIONS_FILE = os.getenv("SIMULATED_PUBLICATIONS_FILE", "simulated_publications.json")
USE_MOCK_DATA = os.getenv("USE_MOCK_DATA", "false").lower() in ("true", "1", "yes")

# ------------------------------------------------------------------------------
# 4. Infraestrutura & Banco
# ------------------------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/promoradar")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:3000").rstrip("/")
