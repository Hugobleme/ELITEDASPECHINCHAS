import os
import logging
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Request, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy.orm import Session

from database.connection import engine, Base, get_db
from api.routes.auth import router as auth_router
from api.routes.preferences import router as preferences_router
from api.routes.favorites import router as favorites_router
from api.routes.alerts import router as alerts_router
from api.routes.push import router as push_router
from api.routes.feed import router as feed_router
from api.routes.offers import router as offers_router
from api.routes.admin import router as admin_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Validação e inicialização resiliente do banco de dados
try:
    from database.connection import check_db_connection
    is_connected, msg = check_db_connection(max_retries=2, retry_delay=1.0)
    if is_connected:
        logger.info(f"✅ [Database] Conexão com banco de dados verificada com sucesso na inicialização.")
        Base.metadata.create_all(bind=engine)
    else:
        logger.warning(f"⚠️ [Database] Alerta de conexão na inicialização: {msg}")
except Exception as exc:
    logger.warning(f"[Database] Não foi possível conectar ao banco de dados na inicialização: {exc}")

app = FastAPI(
    title="Elite das Pechinchas API",
    description="Backend FastAPI modular para agregação, curadoria, preferências, favoritos, alertas e Web Push.",
    version="3.0.0",
)

# ==========================================
# Compressão GZip Automática para Payloads > 1KB
# ==========================================
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ==========================================
# Configuração de CORS Segura
# ==========================================
raw_cors = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
CORS_ORIGINS = [origin.strip() for origin in raw_cors.split(",") if origin.strip()]
CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX")

# Em staging: se não configurado explicitamente, aplica regex restritiva apenas para subdomínios seguros da Vercel
if not CORS_ORIGIN_REGEX and os.getenv("ENVIRONMENT") == "staging":
    CORS_ORIGIN_REGEX = r"^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$"
elif CORS_ORIGIN_REGEX and CORS_ORIGIN_REGEX.strip() in [".*", ".*?", "^.*$", ".*vercel.*"]:
    # Sanitiza regex insegura que permitiria qualquer origem arbitrária
    CORS_ORIGIN_REGEX = r"^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$"

cors_kwargs = {
    "allow_origins": CORS_ORIGINS,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if CORS_ORIGIN_REGEX:
    cors_kwargs["allow_origin_regex"] = CORS_ORIGIN_REGEX

app.add_middleware(CORSMiddleware, **cors_kwargs)


# ==========================================
# Rate Limiting Simples em Memória para /auth
# ==========================================
AUTH_REQUEST_COUNTS = {}


@app.middleware("http")
async def rate_limit_auth_middleware(request: Request, call_next):
    if request.url.path.startswith("/auth/login") or request.url.path.startswith("/auth/register"):
        client_ip = request.client.host if request.client else "unknown"
        current_time = int(datetime.now(timezone.utc).timestamp() // 60)  # Minuto atual
        key = f"{client_ip}:{current_time}"

        count = AUTH_REQUEST_COUNTS.get(key, 0)
        if count >= 30:  # Limite de 30 tentativas por minuto por IP
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Muitas tentativas de autenticação. Aguarde um minuto.",
            )
        AUTH_REQUEST_COUNTS[key] = count + 1

    return await call_next(request)


# ==========================================
# Registro de Roteadores Modulares
# ==========================================
app.include_router(offers_router)
app.include_router(offers_router, prefix="/api")
app.include_router(admin_router)
app.include_router(auth_router)
app.include_router(preferences_router)
app.include_router(favorites_router)
app.include_router(alerts_router)
app.include_router(push_router)
app.include_router(feed_router)


# ==========================================
# Health Check & Readiness Endpoints
# ==========================================
@app.get("/health", tags=["Health Check"])
def health_check():
    return {
        "status": "healthy",
        "service": "Elite das Pechinchas Backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/ready", tags=["Health Check"])
def readiness_check(db: Session = Depends(get_db)):
    """
    Endpoint de prontidão (Readiness Probe) para Staging e Produção.
    Verifica a conectividade do banco de dados relacional e do cache/broker Redis.
    Retorna 200 OK quando o backend está operacional para receber tráfego.
    """
    checks = {
        "status": "ready",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": "unknown",
        "redis": "unknown",
    }

    # 1. Verificação do Banco de Dados
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        checks["database"] = "connected"
    except Exception as db_exc:
        logger.error(f"[Readiness] Falha de conexão com o banco de dados: {db_exc}")
        checks["database"] = "error"
        checks["status"] = "unhealthy"

    # 2. Verificação do Redis
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        try:
            import redis
            r = redis.Redis.from_url(redis_url, socket_timeout=2.0)
            if r.ping():
                checks["redis"] = "connected"
            else:
                checks["redis"] = "unresponsive"
                checks["status"] = "unhealthy"
        except Exception as redis_exc:
            logger.warning(f"[Readiness] Falha de conexão com o Redis: {redis_exc}")
            checks["redis"] = "error"
            checks["status"] = "unhealthy"
    else:
        checks["redis"] = "not_configured"

    if checks["status"] != "ready":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=checks,
        )

    return checks


@app.get("/push/vapid-public-key", tags=["Notificações Web Push"])
def get_public_vapid_key():
    """
    Retorna a chave pública VAPID para registro no navegador.
    Segredos privados nunca são expostos.
    """
    return {
        "vapid_public_key": os.getenv("VAPID_PUBLIC_KEY", "")
    }
