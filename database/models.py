import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    JSON,
    Text,
)
from sqlalchemy.orm import relationship
from database.connection import Base


# Helper para tipo UUID compatível com Postgres e SQLite
def UUID_COLUMN():
    return Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))


# Helper para timestamp UTC atual
def utcnow():
    return datetime.now(timezone.utc)


# ==============================================================================
# 1. Catálogo e Domínio Principal: Lojas e Categorias
# ==============================================================================

class Store(Base):
    """
    Entidade de lojas parceiras oficiais com metadados e confiabilidade.
    """
    __tablename__ = "stores"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    logo_url = Column(Text, nullable=True)
    website_url = Column(Text, nullable=True)
    is_trusted = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    offers = relationship("Offer", back_populates="store_rel")
    coupons = relationship("Coupon", back_populates="store_rel")


class Category(Base):
    """
    Categorias taxonômicas com suporte a auto-relacionamento (subcategorias).
    """
    __tablename__ = "categories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    parent_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    subcategories = relationship("Category")
    offers = relationship("Offer", back_populates="category_rel")
    coupons = relationship("Coupon", back_populates="category_rel")


# ==============================================================================
# 2. Ofertas, Cupons e Auditoria de Mensagens
# ==============================================================================

class Source(Base):
    __tablename__ = "sources"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    channel_username = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class Offer(Base):
    __tablename__ = "offers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    price_current = Column(Float, nullable=False)
    price_original = Column(Float, nullable=False)
    discount_pct = Column(Integer, nullable=False)
    store = Column(String(100), nullable=False, index=True)
    store_id = Column(String(36), ForeignKey("stores.id", ondelete="SET NULL"), nullable=True)
    category = Column(String(100), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    image_url = Column(Text, nullable=False)
    original_link = Column(Text, nullable=True)
    affiliate_link = Column(Text, nullable=False)
    coupon_code = Column(String(64), nullable=True)
    telegram_msg_id = Column(BigInteger, nullable=True, index=True)
    source_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    status = Column(String(50), default="pending", nullable=False, index=True)  # pending, approved, published, rejected, expired
    published_at = Column(DateTime, nullable=True, index=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    store_rel = relationship("Store", back_populates="offers")
    category_rel = relationship("Category", back_populates="offers")
    favorites = relationship("Favorite", back_populates="offer", cascade="all, delete-orphan")


class Coupon(Base):
    """
    Cupons de desconto ativos com código, validade e regras promocionais.
    """
    __tablename__ = "coupons"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(64), nullable=False, index=True)
    store = Column(String(100), nullable=False, index=True)
    store_id = Column(String(36), ForeignKey("stores.id", ondelete="SET NULL"), nullable=True)
    store_slug = Column(String(100), nullable=True)
    discount_text = Column(String(100), nullable=False)
    discount_value = Column(Float, nullable=True)
    discount_type = Column(String(50), nullable=True)  # "percent", "fixed", "shipping"
    rule_text = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), default="todas", nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    valid_until = Column(String(50), nullable=True)
    validity_start = Column(DateTime, nullable=True)
    validity_end = Column(DateTime, nullable=True)
    affiliate_link = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_verified = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    store_rel = relationship("Store", back_populates="coupons")
    category_rel = relationship("Category", back_populates="coupons")


class ProcessedMessage(Base):
    """
    Log de auditoria e rastreamento de mensagens capturadas do Telegram.
    """
    __tablename__ = "processed_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    telegram_message_id = Column(BigInteger, nullable=False, index=True)
    source_name = Column(String(100), nullable=True)
    offer_id = Column(String(36), ForeignKey("offers.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), nullable=False)  # success, rejected, failed, skipped
    reason = Column(Text, nullable=True)
    raw_text = Column(Text, nullable=True)
    processed_at = Column(DateTime, default=utcnow, nullable=False)

    offer = relationship("Offer")


class AffiliateRule(Base):
    __tablename__ = "affiliate_rules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    store = Column(String(100), nullable=False)
    tag_param = Column(String(100), nullable=False)
    affiliate_tag = Column(String(100), nullable=False)


# ==============================================================================
# 3. Usuários, Alertas, Favoritos & Notificações
# ==============================================================================

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)  # Null se cadastro via Google
    name = Column(String(255), nullable=False)
    role = Column(String(50), default="user", nullable=False)  # admin, user
    provider = Column(String(50), default="email")  # email, google
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    preferences = relationship("UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("PriceAlert", back_populates="user", cascade="all, delete-orphan")
    push_subscriptions = relationship("PushSubscription", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    categories = Column(JSON, default=list)
    stores = Column(JSON, default=list)
    min_discount = Column(Integer, default=0)

    user = relationship("User", back_populates="preferences")


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    offer_id = Column(String(36), ForeignKey("offers.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "offer_id", name="uq_user_favorite_offer"),
    )

    user = relationship("User", back_populates="favorites")
    offer = relationship("Offer", back_populates="favorites")


class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(100), nullable=True)
    store = Column(String(100), nullable=True)
    keyword = Column(String(255), nullable=True)
    target_discount = Column(Integer, nullable=False, default=0)
    min_price = Column(Float, nullable=True)
    max_price = Column(Float, nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    @property
    def is_active(self) -> bool:
        return self.active

    @is_active.setter
    def is_active(self, val: bool):
        self.active = val

    user = relationship("User", back_populates="alerts")


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    endpoint = Column(Text, nullable=False, index=True)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "endpoint", name="uq_user_push_endpoint"),
    )

    user = relationship("User", back_populates="push_subscriptions")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    offer_id = Column(String(36), ForeignKey("offers.id", ondelete="CASCADE"), nullable=False, index=True)
    alert_id = Column(String(36), ForeignKey("price_alerts.id", ondelete="SET NULL"), nullable=True)
    sent_at = Column(DateTime, default=utcnow, nullable=False)
    status = Column(String(50), default="sent", nullable=False)

    user = relationship("User", back_populates="notifications")

