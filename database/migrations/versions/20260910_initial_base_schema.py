"""Initial base schema: sources, offers and affiliate_rules

Revision ID: 20260910_initial_base_schema
Revises: None
Create Date: 2026-09-10 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260910_initial_base_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. sources
    op.create_table(
        "sources",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("channel_username", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )

    # 2. offers
    op.create_table(
        "offers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("price_current", sa.Float(), nullable=False),
        sa.Column("price_original", sa.Float(), nullable=False),
        sa.Column("discount_pct", sa.Integer(), nullable=False),
        sa.Column("store", sa.String(100), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=False),
        sa.Column("original_link", sa.Text(), nullable=True),
        sa.Column("affiliate_link", sa.Text(), nullable=False),
        sa.Column("coupon_code", sa.String(64), nullable=True),
        sa.Column("telegram_msg_id", sa.Integer(), nullable=True),
        sa.Column("source_name", sa.String(100), nullable=True),
        sa.Column("status", sa.String(50), server_default="pending", nullable=False),
        sa.Column("published_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_offers_status", "offers", ["status"])
    op.create_index("ix_offers_store", "offers", ["store"])
    op.create_index("ix_offers_category", "offers", ["category"])
    op.create_index("ix_offers_telegram_msg_id", "offers", ["telegram_msg_id"])
    op.create_index("ix_offers_published_at", "offers", ["published_at"])

    # 3. affiliate_rules
    op.create_table(
        "affiliate_rules",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("store", sa.String(100), nullable=False),
        sa.Column("tag_param", sa.String(100), nullable=False),
        sa.Column("affiliate_tag", sa.String(100), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("affiliate_rules")
    op.drop_index("ix_offers_published_at", table_name="offers")
    op.drop_index("ix_offers_telegram_msg_id", table_name="offers")
    op.drop_index("ix_offers_category", table_name="offers")
    op.drop_index("ix_offers_store", table_name="offers")
    op.drop_index("ix_offers_status", table_name="offers")
    op.drop_table("offers")
    op.drop_table("sources")
