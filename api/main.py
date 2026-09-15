import os
import time
import logging
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Request, status, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.connection import engine, Base, get_db
from database.models import Offer, Coupon, Store, Category
from api.services.cache import cache_service
from api.routes.auth import router as auth_router
from api.routes.preferences import router as preferences_router
from api.routes.favorites import router as favorites_router
from api.routes.alerts import router as alerts_router
from api.routes.push import router as push_router
from api.routes.feed import router as feed_router
from api.routes.offers import router as offers_router
from api.routes.admin import router as admin_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("elitedaspechinchas.api")

# ==========================================
# Inicialização Resiliente do Sentry Backend
# ==========================================
sentry_dsn = os.getenv("SENTRY_DSN")
if sentry_dsn and sentry_dsn.strip():
    try:
        import sentry_sdk
        sentry_sdk.init(
            dsn=sentry_dsn,
            traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.2")),
            environment=os.getenv("ENVIRONMENT", "development"),
        )
        logger.info("✅ [Sentry] Error tracking backend inicializado com sucesso.")
    except Exception as s_exc:
        logger.warning(f"[Sentry] Não foi possível inicializar sentry_sdk: {s_exc}")

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
    description="Backend FastAPI de alta performance para agregação, curadoria, cache, SEO e métricas.",
    version="4.0.0",
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

if not CORS_ORIGIN_REGEX and os.getenv("ENVIRONMENT") in ("staging", "production"):
    CORS_ORIGIN_REGEX = r"^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$"
elif CORS_ORIGIN_REGEX and CORS_ORIGIN_REGEX.strip() in [".*", ".*?", "^.*$", ".*vercel.*"]:
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
# Middleware de Timing e Logs Estruturados
# ==========================================
@app.middleware("http")
async def request_timing_and_logging_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start_time) * 1000
    response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"

    # Log estruturado (suprime endpoints de liveness frequentes)
    if request.url.path not in ("/health", "/ready", "/metrics", "/favicon.ico"):
        client_ip = request.client.host if request.client else "unknown"
        logger.info(
            f"[{request.method}] {request.url.path} status={response.status_code} "
            f"latency={duration_ms:.2f}ms ip={client_ip}"
        )
    return response


# ==========================================
# Rate Limiting Global e para Auth com Retry-After
# ==========================================
RATE_LIMIT_COUNTS: dict[str, int] = {}
RATE_LIMIT_AUTH_COUNTS: dict[str, int] = {}


@app.middleware("http")
async def rate_limiting_middleware(request: Request, call_next):
    if request.url.path in ("/health", "/ready", "/push/vapid-public-key", "/me/push/vapid-public-key", "/metrics", "/api/metrics"):
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    current_minute = int(time.time() // 60)
    current_hour = int(time.time() // 3600)

    # 1. Rate limiting restritivo para rotas de autenticação (30 req/min)
    if request.url.path.startswith("/auth/login") or request.url.path.startswith("/auth/register"):
        auth_key = f"{client_ip}:{current_minute}"
        count = RATE_LIMIT_AUTH_COUNTS.get(auth_key, 0)
        if count >= 30:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Muitas tentativas de autenticação. Aguarde um minuto."},
                headers={"Retry-After": "60"},
            )
        RATE_LIMIT_AUTH_COUNTS[auth_key] = count + 1

    # 2. Rate limiting geral: 100 req/min para anônimos, 1000 req/hora para autenticados
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        user_key = f"auth:{client_ip}:{current_hour}"
        count = RATE_LIMIT_COUNTS.get(user_key, 0)
        if count >= 1000:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Limite de requisições por hora excedido."},
                headers={"Retry-After": "3600"},
            )
        RATE_LIMIT_COUNTS[user_key] = count + 1
    else:
        anon_key = f"anon:{client_ip}:{current_minute}"
        count = RATE_LIMIT_COUNTS.get(anon_key, 0)
        if count >= 100:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Limite de requisições por minuto excedido (máximo 100 req/min)."},
                headers={"Retry-After": "60"},
            )
        RATE_LIMIT_COUNTS[anon_key] = count + 1

    # Limpeza periódica em memória
    if len(RATE_LIMIT_COUNTS) > 10000:
        RATE_LIMIT_COUNTS.clear()
    if len(RATE_LIMIT_AUTH_COUNTS) > 5000:
        RATE_LIMIT_AUTH_COUNTS.clear()

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
# Health Check, Readiness & Métricas de Monitoramento
# ==========================================
@app.get("/health", tags=["Health Check"])
def health_check():
    return {
        "status": "healthy",
        "service": "Elite das Pechinchas Backend",
        "version": "4.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cache": cache_service.get_stats(),
    }


@app.get("/metrics", tags=["Métricas & Monitoramento"])
@app.get("/api/metrics", tags=["Métricas & Monitoramento"])
def get_metrics(db: Session = Depends(get_db)):
    """
    Retorna métricas consolidadas de volumetria, banco de dados e eficiência do cache.
    """
    offers_count = db.query(func.count(Offer.id)).filter(Offer.status == "published", Offer.is_active == True).scalar() or 0
    coupons_count = db.query(func.count(Coupon.id)).filter(Coupon.is_active == True).scalar() or 0
    stores_count = db.query(func.count(Store.id)).filter(Store.is_trusted == True).scalar() or 0
    categories_count = db.query(func.count(Category.id)).scalar() or 0

    return {
        "status": "operational",
        "service": "Elite das Pechinchas API",
        "version": "4.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "published_offers": offers_count,
            "active_coupons": coupons_count,
            "trusted_stores": stores_count,
            "categories": categories_count,
        },
        "cache": cache_service.get_stats(),
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
