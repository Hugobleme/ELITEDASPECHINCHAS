import os
import logging
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from database.connection import engine, Base
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

# Cria tabelas caso ainda não criadas (conveniente para desenvolvimento)
try:
    Base.metadata.create_all(bind=engine)
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
# Configuração de CORS
# ==========================================
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in CORS_ORIGINS if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
app.include_router(admin_router)
app.include_router(auth_router)
app.include_router(preferences_router)
app.include_router(favorites_router)
app.include_router(alerts_router)
app.include_router(push_router)
app.include_router(feed_router)


# ==========================================
# Health Check Endpoint
# ==========================================
@app.get("/health", tags=["Health Check"])
def health_check():
    return {
        "status": "healthy",
        "service": "Elite das Pechinchas Backend",
        "timestamp": datetime.now(timezone.utc),
    }
