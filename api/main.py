import os
import logging
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, Query, status, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from database.connection import get_db, engine, Base
from database.models import Offer, Source
from api.deps import get_current_user
from api.routes.auth import router as auth_router
from api.routes.preferences import router as preferences_router
from api.routes.favorites import router as favorites_router
from api.routes.alerts import router as alerts_router
from api.routes.push import router as push_router
from api.routes.feed import router as feed_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cria tabelas caso ainda não criadas (conveniente para desenvolvimento)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PromoRadar API",
    description="Backend FastAPI para agregação, curadoria, preferências, favoritos, alertas e Web Push.",
    version="3.0.0",
)

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
        current_time = int(datetime.utcnow().timestamp() // 60)  # Minuto atual
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
# Inclusão dos Roteadores da Fase 3
# ==========================================
app.include_router(auth_router)
app.include_router(preferences_router)
app.include_router(favorites_router)
app.include_router(alerts_router)
app.include_router(push_router)
app.include_router(feed_router)


# ==========================================
# Endpoints Públicos de Ofertas (Fase 1)
# ==========================================
@app.get("/offers", tags=["Vitrine Pública"])
def list_offers(
    store: Optional[str] = None,
    category: Optional[str] = None,
    min_discount: int = Query(0, ge=0),
    sort: str = Query("recent", regex="^(recent|discount|price)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Lista de ofertas ativas para a vitrine pública com filtros."""
    query = db.query(Offer).filter(Offer.status.in_(["published", "approved"]))

    if store and store.lower() != "todas":
        query = query.filter(Offer.store.ilike(f"%{store}%"))

    if category and category.lower() != "todas":
        query = query.filter(Offer.category.ilike(category))

    if min_discount > 0:
        query = query.filter(Offer.discount_pct >= min_discount)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(Offer.title.ilike(s) | Offer.store.ilike(s) | Offer.category.ilike(s))

    if sort == "discount":
        query = query.order_by(desc(Offer.discount_pct))
    elif sort == "price":
        query = query.order_by(Offer.price_current.asc())
    else:
        query = query.order_by(desc(Offer.published_at))

    total = query.count()
    offset = (page - 1) * limit
    items = query.offset(offset).limit(limit).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": offset + limit < total,
    }


@app.get("/offers/{offer_id}", tags=["Vitrine Pública"])
def get_offer_details(offer_id: str, db: Session = Depends(get_db)):
    """Busca detalhes de uma oferta pelo ID."""
    offer = db.query(Offer).filter(Offer.id == offer_id, Offer.status.in_(["published", "approved"])).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta não encontrada.")
    return offer


@app.get("/categories", tags=["Vitrine Pública"])
def get_categories(db: Session = Depends(get_db)):
    """Retorna lista de categorias disponíveis com contagem."""
    results = (
        db.query(Offer.category, func.count(Offer.id))
        .filter(Offer.status.in_(["published", "approved"]))
        .group_by(Offer.category)
        .all()
    )
    return [{"name": cat.capitalize(), "slug": cat, "count": count} for cat, count in results]


@app.get("/stores", tags=["Vitrine Pública"])
def get_stores(db: Session = Depends(get_db)):
    """Retorna lista de lojas disponíveis com contagem."""
    results = (
        db.query(Offer.store, func.count(Offer.id))
        .filter(Offer.status.in_(["published", "approved"]))
        .group_by(Offer.store)
        .all()
    )
    return [
        {"name": store, "slug": store.lower().replace(" ", "-"), "count": count}
        for store, count in results
    ]


@app.post("/events/click", tags=["Métricas & Tracking"])
def track_affiliate_click(payload: dict):
    """Registra evento de clique no link de afiliado."""
    offer_id = payload.get("offer_id")
    logger.info(f"[Tracking Event] Clique registrado para oferta {offer_id}")
    return {"status": "success", "tracked": True}


# ==========================================
# Endpoints de Curadoria & Publicação (Fase 2)
# ==========================================
@app.post("/admin/offers/{offer_id}/publish", tags=["Admin & Curadoria"])
def publish_offer(offer_id: str, db: Session = Depends(get_db)):
    """
    Publica uma oferta na vitrine e despacha a task assíncrona do Celery para envio de Web Push aos alertas casados.
    """
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta não encontrada.")

    offer.status = "published"
    offer.published_at = datetime.utcnow()
    db.commit()
    db.refresh(offer)

    # Dispara a notificação assíncrona aos alertas cadastrados
    try:
        from processor.notify import match_and_notify

        match_and_notify.delay(str(offer.id))
        logger.info(f"[Publish] Celery task match_and_notify disparada para oferta {offer.id}")
    except Exception as exc:
        logger.warning(f"[Publish] Celery não disponível ou offline: {str(exc)}")

    return offer


@app.get("/health", tags=["Health Check"])
def health_check():
    return {"status": "healthy", "service": "PromoRadar Backend", "timestamp": datetime.utcnow()}
