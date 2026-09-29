"""Add media tracking fields to offers table

Revision ID: 20260929_add_media_tracking_fields
Revises: 20260916_phase4_perf_indices
Create Date: 2026-09-29 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260929_add_media_tracking_fields"
down_revision: Union[str, None] = "20260916_phase4_perf_indices"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("offers") as batch_op:
        batch_op.add_column(sa.Column("source_media_type", sa.String(50), nullable=True))
        batch_op.add_column(sa.Column("source_message_id", sa.BigInteger(), nullable=True))
        batch_op.add_column(sa.Column("media_storage_key", sa.String(255), nullable=True))
        batch_op.add_column(sa.Column("media_status", sa.String(50), server_default="not_present", nullable=True))
        batch_op.alter_column("image_url", existing_type=sa.Text(), nullable=True)


def downgrade() -> None:
    with op.batch_alter_table("offers") as batch_op:
        batch_op.alter_column("image_url", existing_type=sa.Text(), nullable=False)
        batch_op.drop_column("media_status")
        batch_op.drop_column("media_storage_key")
        batch_op.drop_column("source_message_id")
        batch_op.drop_column("source_media_type")
