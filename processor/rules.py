import hashlib
from datetime import datetime, timedelta, timezone
import logging
from typing import Tuple, Optional
from sqlalchemy.orm import Session

from database.models import Offer
from config import (
    MIN_DISCOUNT_PERCENT,
    DEDUPLICATION_HOURS,
    MAX_OFFERS_PER_HOUR_PER_SOURCE,
    AUTO_APPROVE_ENABLED,
    AUTO_APPROVE_DISCOUNT_THRESHOLD,
)

logger = logging.getLogger(__name__)


def generate_offer_hash(title: str, price_current: float) -> str:
    """
    Gera um hash único combinando o título normalizado e o preço.
    Permite detectar o mesmo produto postado com pequenos intervalos.
    """
    normalized_title = title.lower().strip()
    raw_key = f"{normalized_title}_{price_current:.2f}"
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def is_duplicate(
    db: Session,
    telegram_msg_id: Optional[int],
    title: str,
    price_current: float,
    hours: int = DEDUPLICATION_HOURS,
) -> Tuple[bool, str]:
    """
    Verifica se a oferta já foi capturada por telegram_msg_id ou por título/preço nas últimas 24h.
    """
    # 1. Checagem por ID de mensagem no Telegram
    if telegram_msg_id:
        existing_msg = db.query(Offer).filter(Offer.telegram_msg_id == telegram_msg_id).first()
        if existing_msg:
            return True, f"Mensagem duplicada já capturada (telegram_msg_id: {telegram_msg_id})"

    # 2. Checagem por título e preço na janela de tempo
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
    
    # Busca ofertas recentes da mesma faixa de preço (tolerância de R$ 1,00)
    recent_offers = (
        db.query(Offer)
        .filter(
            Offer.created_at >= cutoff_time,
            Offer.price_current.between(price_current - 1.0, price_current + 1.0),
        )
        .all()
    )

    current_hash = generate_offer_hash(title, price_current)
    for off in recent_offers:
        if generate_offer_hash(off.title, off.price_current) == current_hash:
            return True, f"Oferta idêntica encontrada nas últimas {hours}h (ID existente: {off.id})"

    return False, "Oferta única"


def check_rate_limit(
    db: Session,
    source_name: Optional[str],
    max_per_hour: int = MAX_OFFERS_PER_HOUR_PER_SOURCE,
) -> bool:
    """
    Impede que um único grupo-fonte inunde a fila de curadoria com spam.
    Retorna True se estiver dentro do limite; False se estourou a cota.
    """
    if not source_name:
        return True

    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    count = (
        db.query(Offer)
        .filter(
            Offer.source_name == source_name,
            Offer.created_at >= one_hour_ago,
        )
        .count()
    )

    if count >= max_per_hour:
        logger.warning(
            f"[Rules] Rate limit atingido para fonte '{source_name}': {count}/{max_per_hour} ofertas/h"
        )
        return False

    return True


def determine_initial_status(discount_pct: int) -> str:
    """
    Define o status inicial da oferta:
    - 'published': se auto-aprovação estiver ligada e desconto for brutal (>= 40%)
    - 'pending': padrão seguro para curadoria humana na Fase 2
    """
    if AUTO_APPROVE_ENABLED and discount_pct >= AUTO_APPROVE_DISCOUNT_THRESHOLD:
        return "published"
    return "pending"


def evaluate_rules(
    parsed_data: dict,
    db: Session,
    telegram_msg_id: Optional[int] = None,
    source_name: Optional[str] = None,
) -> Tuple[bool, str, str]:
    """
    Avalia a oferta através de todas as regras de curadoria.
    Retorna: (is_approved, reason, status)
    """
    title = parsed_data.get("title", "")
    price_current = parsed_data.get("price_current", 0.0)
    discount_pct = parsed_data.get("discount_pct", 0)

    # 1. Validação de Preço Positivo
    if price_current <= 0:
        return False, "Preço atual inválido ou zerado", "rejected"

    # 2. Validação de Desconto Mínimo
    if discount_pct < MIN_DISCOUNT_PERCENT:
        return (
            False,
            f"Desconto de {discount_pct}% abaixo do piso mínimo de {MIN_DISCOUNT_PERCENT}%",
            "rejected",
        )

    # 3. Rate Limit da Fonte
    if not check_rate_limit(db, source_name):
        return False, f"Limite de postagens por hora excedido para {source_name}", "rejected"

    # 4. Deduplicação
    duplicated, dup_reason = is_duplicate(db, telegram_msg_id, title, price_current)
    if duplicated:
        return False, dup_reason, "rejected"

    # Define status inicial (pending ou published)
    initial_status = determine_initial_status(discount_pct)
    return True, "Oferta aprovada pelas regras de curadoria", initial_status
