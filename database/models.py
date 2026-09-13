import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    JSON,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from database.connection import Base


# Helper para tipo UUID compatível com Postgres e SQLite
def UUID_COLUMN():
    return Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))


# Helper para timestamp UTC atual
def utcnow():
    return datetime.now(timezone.utc)


# ==========================================
# Modelos Existentes (Contexto do Backend)
# ==========================================


class Source(Base):
    __tablename__ = "sources"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    channel_username = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)


class Offer(Base):
    __tablename__ = "offers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(Text, nullable=False)
    price_current = Column(Float, nullable=False)
    price_original = Column(Float, nullable=False)
    discount_pct = Column(Integer, nullable=False)
    store = Column(String(100), nullable=False)
    category = Column(String(100), nullable=False)
    image_url = Column(Text, nullable=False)
    original_link = Column(Text, nullable=True)
    affiliate_link = Column(Text, nullable=False)
    coupon_code = Column(String(64), nullable=True)
    telegram_msg_id = Column(Integer, nullable=True)
    source_name = Column(String(100), nullable=True)
    status = Column(String(50), default="pending")  # pending, approved, published, rejected
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    favorites = relationship("Favorite", back_populates="offer", cascade="all, delete-orphan")


class AffiliateRule(Base):
    __tablename__ = "affiliate_rules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    store = Column(String(100), nullable=False)
    tag_param = Column(String(100), nullable=False)
    affiliate_tag = Column(String(100), nullable=False)


# ==========================================
# Novos Modelos (Fase 3: Usuários & Notificações)
# ==========================================


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)  # Null se cadastro via Google
    name = Column(String(255), nullable=False)
    provider = Column(String(50), default="email")  # email, google
    created_at = Column(DateTime, default=utcnow)

    preferences = relationship("UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("PriceAlert", back_populates="user", cascade="all, delete-orphan")
    push_subscriptions = relationship("PushSubscription", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    categories = Column(JSON, default=list)  # Lista de categorias favoritas ["eletronicos", "games"]
    stores = Column(JSON, default=list)  # Lista de lojas favoritas ["Amazon", "Kabum"]
    min_discount = Column(Integer, default=0)

    user = relationship("User", back_populates="preferences")


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    offer_id = Column(String(36), ForeignKey("offers.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=utcnow)

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
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="alerts")


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    endpoint = Column(Text, nullable=False, index=True)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow)

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
    sent_at = Column(DateTime, default=utcnow)
    status = Column(String(50), default="sent")  # sent, failed, expired

    user = relationship("User", back_populates="notifications")
