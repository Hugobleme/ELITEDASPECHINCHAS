import hashlib
from datetime import datetime, timedelta, timezone
import logging
import re
from typing import Tuple, Optional, Dict, Any
from sqlalchemy.orm import Session

from database.models import Offer
from config import (
    MIN_DISCOUNT_PERCENT,
    MIN_PRICE,
    MAX_PRICE,
    MIN_QUALITY_SCORE,
    REQUIRE_VALID_IMAGE,
    BLOCKED_CATEGORIES,
    BLOCKED_STORES,
    BLOCKED_KEYWORDS,
    DEDUPLICATION_HOURS,
    MAX_OFFERS_PER_HOUR_PER_SOURCE,
    AUTO_APPROVE_ENABLED,
    AUTO_APPROVE_DISCOUNT_THRESHOLD,
)

logger = logging.getLogger(__name__)

# Domínios ou encurtadores suspeitos/maliciosos
SUSPICIOUS_DOMAINS = [
    "iplogger.org", "grabify.link", "bit.do", "2no.co", "yip.su",
    "curto.io", "linkseguro.xyz", "encurta.net"
]


def generate_offer_hash(title: str, price_current: float) -> str:
    """
    Gera um hash único combinando o título normalizado e o preço.
    Permite detectar o mesmo produto postado com pequenos intervalos.
    """
    normalized_title = title.lower().strip()
    raw_key = f"{normalized_title}_{price_current:.2f}"
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def calculate_quality_score(parsed_data: Dict[str, Any]) -> int:
    """
    Calcula um score de qualidade da oferta entre 0 e 100 pontos.
    Fatores:
    - Desconto percentual (até 30 pts)
    - Reputação da loja (até 25 pts)
    - Faixa de preço aceitável/atrativa (até 15 pts)
    - Presença de cupom de desconto (10 pts)
    - Imagem de alta qualidade (10 pts)
    - Clareza e detalhamento do título (10 pts)
    """
    score = 0
    discount_pct = parsed_data.get("discount_pct", 0) or 0
    store = (parsed_data.get("store") or "").strip().lower()
    price = parsed_data.get("price_current", 0.0) or 0.0
    title = (parsed_data.get("title") or "").strip()
    coupon = parsed_data.get("coupon_code")
    image_url = parsed_data.get("image_url") or ""

    # 1. Desconto (0-30 pts)
    if discount_pct >= 50:
        score += 30
    elif discount_pct >= 30:
        score += 25
    elif discount_pct >= 20:
        score += 20
    elif discount_pct >= 10:
        score += 15
    else:
        score += 5

    # 2. Reputação da Loja (0-25 pts)
    top_tier = ["amazon", "mercado livre", "magazine luiza", "kabum"]
    second_tier = ["shopee", "aliexpress", "casas bahia", "samsung", "fast shop", "pichau", "terabyte"]
    if any(t in store for t in top_tier):
        score += 25
    elif any(s in store for s in second_tier):
        score += 20
    elif store and store != "desconhecida":
        score += 10

    # 3. Faixa de preço atrativa (0-15 pts)
    if 20.0 <= price <= 2500.0:
        score += 15
    elif 10.0 <= price <= 5000.0:
        score += 10
    else:
        score += 5

    # 4. Presença de cupom verificado (+10 pts)
    if coupon and len(coupon) >= 3:
        score += 10

    # 5. Imagem válida (+10 pts)
    if image_url and image_url.startswith("http") and "unsplash.com" not in image_url:
        score += 10
    elif image_url.startswith("http"):
        score += 5

    # 6. Título claro e informativo (+10 pts)
    if len(title) >= 20:
        score += 10
    elif len(title) >= 10:
        score += 5

    return min(100, max(0, score))


def is_coupon_expired(validity_str: Optional[str]) -> bool:
    """
    Avalia se a validade descrita para o cupom já expirou em relação à data UTC atual.
    Suporta formatos 'DD/MM', 'DD/MM/YYYY' e 'hoje'.
    """
    if not validity_str or not isinstance(validity_str, str):
        return False

    clean_val = validity_str.strip().lower()
    now = datetime.now(timezone.utc)

    # Se indicar hoje, não está expirado
    if clean_val in ("hoje", "amanhã", "amanha"):
        return False

    match = re.match(r"^(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?$", clean_val)
    if match:
        day = int(match.group(1))
        month = int(match.group(2))
        year = int(match.group(3)) if match.group(3) else now.year
        if year < 100:
            year += 2000
        try:
            exp_date = datetime(year, month, day, 23, 59, 59, tzinfo=timezone.utc)
            return now > exp_date
        except ValueError:
            return False

    return False


def check_blocked_content(
    title: str,
    raw_text: str = "",
    store: str = "",
    category: str = "",
) -> Tuple[bool, str]:
    """
    Verifica se a oferta viola regras de categorias, lojas ou palavras-chave bloqueadas.
    """
    # 1. Categoria bloqueada
    if category and category.lower() in BLOCKED_CATEGORIES:
        return True, f"Categoria bloqueada: '{category}'"

    # 2. Loja bloqueada
    if store and any(blocked in store.lower() for blocked in BLOCKED_STORES):
        return True, f"Loja não confiável ou bloqueada: '{store}'"

    # 3. Palavras-chave proibidas
    combined_text = f"{title} {raw_text}".lower()

    # Exceção para cosméticos / perfumaria legítimos que usam nomes fantasia como 'Cassino' (ex: Eudora Club 6 Cassino)
    is_cosmetics_or_fragrance = any(
        term in combined_text
        for term in ("colônia", "colonia", "perfume", "desodorante", "fragrância", "fragrancia", "eau de", "eudora", "boticário", "boticario", "natura")
    )

    for kw in BLOCKED_KEYWORDS:
        if "cassino" in kw and is_cosmetics_or_fragrance:
            continue
        if re.search(r"\b" + re.escape(kw) + r"\b", combined_text):
            return True, f"Contém palavra-chave bloqueada: '{kw}'"

    return False, ""


def is_link_safe(url: Optional[str]) -> Tuple[bool, str]:
    """
    Valida integridade e segurança da URL, rejeitando encurtadores maliciosos ou links suspeitos.
    """
    if not url or not isinstance(url, str):
        return False, "Link original ausente ou malformado"

    if not url.startswith(("http://", "https://")):
        return False, "Link original ausente ou malformado"

    for susp in SUSPICIOUS_DOMAINS:
        if susp in url.lower():
            return False, f"Link utiliza encurtador não autorizado ou suspeito: '{susp}'"

    return True, ""


def is_duplicate(
    db: Session,
    telegram_msg_id: Optional[int],
    title: str,
    price_current: float,
    hours: int = DEDUPLICATION_HOURS,
) -> Tuple[bool, str]:
    """
    Verifica se a oferta já foi capturada por telegram_msg_id ou por título/preço nas últimas horas.
    """
    try:
        if telegram_msg_id:
            existing_msg = db.query(Offer).filter(Offer.telegram_msg_id == telegram_msg_id).first()
            if existing_msg:
                return True, f"Mensagem duplicada já capturada (telegram_msg_id: {telegram_msg_id})"

        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
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
    except Exception as db_err:
        logger.warning(f"[Rules] Consulta de duplicidade no banco ignorada devido a erro de conexão: {db_err}")

    return False, "Oferta única"


def check_rate_limit(
    db: Session,
    source_name: Optional[str],
    max_per_hour: int = MAX_OFFERS_PER_HOUR_PER_SOURCE,
) -> bool:
    """
    Impede que um único grupo-fonte inunde a fila de curadoria com spam.
    """
    if not source_name:
        return True

    try:
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
    except Exception as db_err:
        logger.warning(f"[Rules] Verificação de rate limit no banco ignorada devido a erro: {db_err}")

    return True


def is_source_authorized(
    db: Session,
    source_name: Optional[str],
    allow_internal_test: bool = False,
) -> bool:
    """
    Verifica se o canal ou grupo de origem está cadastrado e ativo no banco ou na configuração.
    """
    if not source_name or not str(source_name).strip():
        if allow_internal_test:
            return True
        return False

    clean_name = str(source_name).strip()

    if clean_name in ("TEST_SOURCE", "@teste_promocoes", "test_source"):
        return True

    from config import SOURCE_CHANNELS
    from database.models import Source

    norm_clean = clean_name.lstrip("@").lower()
    for configured in SOURCE_CHANNELS:
        if configured.lstrip("@").lower() == norm_clean:
            return True

    try:
        src = (
            db.query(Source)
            .filter(
                (Source.channel_username.ilike(f"%{norm_clean}%")) | (Source.name.ilike(f"%{norm_clean}%")),
                Source.is_active == True,
            )
            .first()
        )
        return src is not None
    except Exception as e:
        logger.error(f"[Rules] Erro ao consultar fontes autorizadas: {e}")
        return False


def determine_initial_status(discount_pct: int, quality_score: int = 50) -> str:
    """
    Define o status inicial da oferta:
    - 'published': se auto-aprovação estiver ligada (AUTO_APPROVE_ENABLED=True)
    - 'pending': se auto-aprovação estiver desligada para curadoria humana
    """
    if not AUTO_APPROVE_ENABLED:
        return "pending"
    return "published"


def evaluate_rules(
    parsed_data: dict,
    db: Session,
    telegram_msg_id: Optional[int] = None,
    source_name: Optional[str] = None,
    allow_internal_test: bool = False,
) -> Tuple[bool, str, str]:
    """
    Avalia a oferta através de todas as regras de curadoria e integridade.
    Retorna: (is_approved, reason, status)
    Armazena 'quality_score' dentro de parsed_data para referência posterior.
    """
    title = parsed_data.get("title", "")
    price_current = parsed_data.get("price_current")
    original_link = parsed_data.get("original_link")
    store = parsed_data.get("store", "")
    category = parsed_data.get("category", "")
    discount_pct = parsed_data.get("discount_pct", 0)
    raw_text = parsed_data.get("raw_text", "")
    coupon_validity = parsed_data.get("coupon_validity")
    image_url = parsed_data.get("image_url")

    # 1. Validação de Título
    if not title or not isinstance(title, str) or len(title.strip()) < 3:
        reason = "Título ausente, vazio ou curto demais"
        logger.warning(f"[Rules Rejeição] {reason}")
        return False, reason, "rejected"

    # 2. Validação de Preço (Valor positivo e limites operacionais)
    if price_current is None or not isinstance(price_current, (int, float)) or price_current <= 0:
        reason = f"Preço atual inválido ou zerado ({price_current})"
        logger.warning(f"[Rules Rejeição] {reason}")
        return False, reason, "rejected"

    if price_current < MIN_PRICE:
        reason = f"Preço de R$ {price_current:.2f} abaixo do valor mínimo configurado (R$ {MIN_PRICE:.2f})"
        logger.warning(f"[Rules Rejeição] {reason}")
        return False, reason, "rejected"

    if price_current > MAX_PRICE:
        reason = f"Preço de R$ {price_current:.2f} acima do limite máximo permitido (R$ {MAX_PRICE:.2f})"
        logger.warning(f"[Rules Rejeição] {reason}")
        return False, reason, "rejected"

    # 3. Validação de Link Seguro e Válido
    link_safe, link_reason = is_link_safe(original_link)
    if not link_safe:
        logger.warning(f"[Rules Rejeição] {link_reason}")
        return False, link_reason, "rejected"

    # 4. Validação de Loja Identificada
    if not store or not isinstance(store, str) or store.strip().lower() in ("", "desconhecida", "loja parceira", "unknown"):
        reason = f"Loja não identificada ou desconhecida: '{store}'"
        logger.warning(f"[Rules Rejeição] {reason}")
        return False, reason, "rejected"

    # 5. Conteúdo Bloqueado (Categorias, Lojas não confiáveis e Palavras-chave)
    is_blocked, blocked_reason = check_blocked_content(title, raw_text, store, category)
    if is_blocked:
        logger.warning(f"[Rules Rejeição] {blocked_reason}")
        return False, blocked_reason, "rejected"

    # 6. Validação de Validade de Cupom
    if coupon_validity and is_coupon_expired(coupon_validity):
        reason = f"Cupom expirado com base na validade informada: '{coupon_validity}'"
        logger.warning(f"[Rules Rejeição] {reason}")
        return False, reason, "rejected"

    # 7. Qualidade de Imagem (se exigido)
    if REQUIRE_VALID_IMAGE:
        if not image_url or not image_url.startswith("http"):
            reason = "Oferta rejeitada por ausência de imagem válida"
            logger.warning(f"[Rules Rejeição] {reason}")
            return False, reason, "rejected"

    # 8. Validação de Fonte Autorizada (Obrigatória no fluxo real)
    if not is_source_authorized(db, source_name, allow_internal_test=allow_internal_test):
        reason = f"Origem (source_name) ausente ou não autorizada: '{source_name or 'NÃO INFORMADA'}'"
        logger.warning(f"[Rules Rejeição] {reason}")
        return False, reason, "rejected"

    # 9. Validação de Desconto Mínimo (Piso padrão configurado)
    if discount_pct > 0 and discount_pct < MIN_DISCOUNT_PERCENT:
        reason = f"Desconto de {discount_pct}% abaixo do piso mínimo de {MIN_DISCOUNT_PERCENT}%"
        logger.warning(f"[Rules Rejeição] {reason}")
        return False, reason, "rejected"

    # 10. Rate Limit da Fonte
    if not check_rate_limit(db, source_name):
        reason = f"Limite de postagens por hora excedido para {source_name}"
        logger.warning(f"[Rules Rejeição] {reason}")
        return False, reason, "rejected"

    # 11. Deduplicação Temporal
    duplicated, dup_reason = is_duplicate(db, telegram_msg_id, title, price_current)
    if duplicated:
        logger.warning(f"[Rules Rejeição] {dup_reason}")
        return False, dup_reason, "rejected"

    # 12. Score de Qualidade
    quality_score = calculate_quality_score(parsed_data)
    parsed_data["quality_score"] = quality_score

    if quality_score < MIN_QUALITY_SCORE:
        reason = f"Score de qualidade ({quality_score}) insuficiente para aprovação (mínimo: {MIN_QUALITY_SCORE})"
        logger.warning(f"[Rules Rejeição] {reason}")
        return False, reason, "rejected"

    initial_status = determine_initial_status(discount_pct, quality_score)
    return True, "Oferta aprovada pelas regras de curadoria", initial_status
