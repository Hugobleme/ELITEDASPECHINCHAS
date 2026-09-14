"""Etapa 3: Criacao das tabelas de lojas, categorias, cupons e mensagens processadas

Revision ID: 20260915_phase3_stores_categories_coupons
Revises: 20260912_phase3_user_layer
Create Date: 2026-09-15 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260915_phase3_stores_categories_coupons"
down_revision: Union[str, None] = "20260912_phase3_user_layer"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. stores
    op.create_table(
        "stores",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column("website_url", sa.Text(), nullable=True),
        sa.Column("is_trusted", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("name", name="uq_stores_name"),
    )
    op.create_index("ix_stores_slug", "stores", ["slug"], unique=True)

    # 2. categories
    op.create_table(
        "categories",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("parent_id", sa.String(36), sa.ForeignKey("categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("name", name="uq_categories_name"),
    )
    op.create_index("ix_categories_slug", "categories", ["slug"], unique=True)

    # 3. coupons
    op.create_table(
        "coupons",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("code", sa.String(64), nullable=False),
        sa.Column("store", sa.String(100), nullable=False),
        sa.Column("store_id", sa.String(36), sa.ForeignKey("stores.id", ondelete="SET NULL"), nullable=True),
        sa.Column("store_slug", sa.String(100), nullable=True),
        sa.Column("discount_text", sa.String(100), nullable=False),
        sa.Column("discount_value", sa.Float(), nullable=True),
        sa.Column("discount_type", sa.String(50), nullable=True),
        sa.Column("rule_text", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(100), server_default="todas", nullable=False),
        sa.Column("category_id", sa.String(36), sa.ForeignKey("categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("valid_until", sa.String(50), nullable=True),
        sa.Column("validity_start", sa.DateTime(), nullable=True),
        sa.Column("validity_end", sa.DateTime(), nullable=True),
        sa.Column("affiliate_link", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("is_verified", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_coupons_code", "coupons", ["code"])
    op.create_index("ix_coupons_store", "coupons", ["store"])
    op.create_index("ix_coupons_category", "coupons", ["category"])
    op.create_index("ix_coupons_is_active", "coupons", ["is_active"])

    # 4. processed_messages
    op.create_table(
        "processed_messages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("telegram_message_id", sa.BigInteger(), nullable=False),
        sa.Column("source_name", sa.String(100), nullable=True),
        sa.Column("offer_id", sa.String(36), sa.ForeignKey("offers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column("processed_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_processed_messages_telegram_msg_id", "processed_messages", ["telegram_message_id"])

    # 5. Colunas adicionais em offers
    with op.batch_alter_table("offers") as batch_op:
        batch_op.add_column(sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False))
        batch_op.add_column(sa.Column("description", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("store_id", sa.String(36), nullable=True))
        batch_op.add_column(sa.Column("category_id", sa.String(36), nullable=True))
        batch_op.create_foreign_key("fk_offers_store_id", "stores", ["store_id"], ["id"], ondelete="SET NULL")
        batch_op.create_foreign_key("fk_offers_category_id", "categories", ["category_id"], ["id"], ondelete="SET NULL")
        batch_op.add_column(sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False))
        batch_op.add_column(sa.Column("expires_at", sa.DateTime(), nullable=True))

    # 6. Colunas adicionais em users
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("role", sa.String(50), server_default="user", nullable=False))
        batch_op.add_column(sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False))
        batch_op.add_column(sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False))

    # 7. Colunas adicionais em price_alerts
    with op.batch_alter_table("price_alerts") as batch_op:
        batch_op.add_column(sa.Column("min_price", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("max_price", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False))


def downgrade() -> None:
    # Remove colunas adicionais
    with op.batch_alter_table("price_alerts") as batch_op:
        batch_op.drop_column("updated_at")
        batch_op.drop_column("max_price")
        batch_op.drop_column("min_price")

    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("updated_at")
        batch_op.drop_column("is_active")
        batch_op.drop_column("role")

    with op.batch_alter_table("offers") as batch_op:
        batch_op.drop_constraint("fk_offers_category_id", type_="foreignkey")
        batch_op.drop_constraint("fk_offers_store_id", type_="foreignkey")
        batch_op.drop_column("expires_at")
        batch_op.drop_column("updated_at")
        batch_op.drop_column("category_id")
        batch_op.drop_column("store_id")
        batch_op.drop_column("description")
        batch_op.drop_column("is_active")

    # Remove tabelas criadas
    op.drop_table("processed_messages")
    op.drop_table("coupons")
    op.drop_table("categories")
    op.drop_table("stores")
