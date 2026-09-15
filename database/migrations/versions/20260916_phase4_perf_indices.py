"""Etapa 4: Indices de performance para queries de ofertas e cupons

Revision ID: 20260916_phase4_perf_indices
Revises: 20260915_phase3_db_real
Create Date: 2026-09-16 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260916_phase4_perf_indices"
down_revision: Union[str, None] = "20260915_phase3_db_real"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Indices adicionais de alta seletividade para queries frequentes
    with op.batch_alter_table("offers") as batch_op:
        batch_op.create_index("ix_offers_store_id", ["store_id"])
        batch_op.create_index("ix_offers_category_id", ["category_id"])
        batch_op.create_index("ix_offers_created_at", ["created_at"])

    with op.batch_alter_table("coupons") as batch_op:
        batch_op.create_index("ix_coupons_store_id", ["store_id"])
        batch_op.create_index("ix_coupons_validity_end", ["validity_end"])


def downgrade() -> None:
    with op.batch_alter_table("coupons") as batch_op:
        batch_op.drop_index("ix_coupons_validity_end")
        batch_op.drop_index("ix_coupons_store_id")

    with op.batch_alter_table("offers") as batch_op:
        batch_op.drop_index("ix_offers_created_at")
        batch_op.drop_index("ix_offers_category_id")
        batch_op.drop_index("ix_offers_store_id")
