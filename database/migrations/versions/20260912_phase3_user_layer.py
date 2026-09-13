"""Fase 3: Criacao das tabelas de usuarios, favoritos, preferencias, alertas e push

Revision ID: 20260912_phase3_user_layer
Revises: 
Create Date: 2026-09-12 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260912_phase3_user_layer"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("provider", sa.String(50), server_default="email", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # 2. user_preferences
    op.create_table(
        "user_preferences",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("categories", sa.JSON(), server_default="[]", nullable=False),
        sa.Column("stores", sa.JSON(), server_default="[]", nullable=False),
        sa.Column("min_discount", sa.Integer(), server_default="0", nullable=False),
    )
    op.create_index("ix_user_preferences_user_id", "user_preferences", ["user_id"], unique=True)

    # 3. favorites
    op.create_table(
        "favorites",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("offer_id", sa.String(36), sa.ForeignKey("offers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("user_id", "offer_id", name="uq_user_favorite_offer"),
    )
    op.create_index("ix_favorites_user_id", "favorites", ["user_id"])
    op.create_index("ix_favorites_offer_id", "favorites", ["offer_id"])

    # 4. price_alerts
    op.create_table(
        "price_alerts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("store", sa.String(100), nullable=True),
        sa.Column("keyword", sa.String(255), nullable=True),
        sa.Column("target_discount", sa.Integer(), server_default="0", nullable=False),
        sa.Column("active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_price_alerts_user_id", "price_alerts", ["user_id"])
    op.create_index("ix_price_alerts_active", "price_alerts", ["active"])

    # 5. push_subscriptions
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False),
        sa.Column("p256dh", sa.Text(), nullable=False),
        sa.Column("auth", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("user_id", "endpoint", name="uq_user_push_endpoint"),
    )
    op.create_index("ix_push_subscriptions_user_id", "push_subscriptions", ["user_id"])

    # 6. notifications
    op.create_table(
        "notifications",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("offer_id", sa.String(36), sa.ForeignKey("offers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("alert_id", sa.String(36), sa.ForeignKey("price_alerts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("sent_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("status", sa.String(50), server_default="sent", nullable=False),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_offer_id", "notifications", ["offer_id"])


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("push_subscriptions")
    op.drop_table("price_alerts")
    op.drop_table("favorites")
    op.drop_table("user_preferences")
    op.drop_table("users")
