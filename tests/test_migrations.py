import os
import tempfile
import pytest
from sqlalchemy import create_engine, inspect
from alembic.config import Config
from alembic import command


def test_alembic_migrations_upgrade_and_downgrade():
    """
    Valida que as migrações do Alembic:
    1. Executam upgrade completo ('head') em um banco limpo sem erros;
    2. Criam todas as tabelas (sources, offers com coupon_code, affiliate_rules, users, favorites, etc.);
    3. Executam downgrade completo ('base') de forma reversível sem erros.
    """
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "test_migration.db").replace("\\", "/")
    sqlite_url = f"sqlite:///{db_path}"

    try:
        alembic_cfg = Config("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", sqlite_url)

        # 1. Executa upgrade até o head
        command.upgrade(alembic_cfg, "head")

        engine = create_engine(sqlite_url)
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        # Verifica criação das tabelas base
        assert "sources" in tables
        assert "offers" in tables
        assert "affiliate_rules" in tables

        # Verifica criação das tabelas de usuários e preferências
        assert "users" in tables
        assert "user_preferences" in tables
        assert "favorites" in tables
        assert "price_alerts" in tables
        assert "push_subscriptions" in tables
        assert "notifications" in tables

        # Verifica presença de coupon_code em offers
        offer_columns = [c["name"] for c in inspector.get_columns("offers")]
        assert "coupon_code" in offer_columns
        assert "affiliate_link" in offer_columns
        assert "status" in offer_columns

        # 2. Executa downgrade até a base
        command.downgrade(alembic_cfg, "base")

        engine.dispose()
        engine_after = create_engine(sqlite_url)
        inspector_after = inspect(engine_after)
        tables_after = inspector_after.get_table_names()

        # Nenhuma das tabelas de domínio deve restar
        assert "offers" not in tables_after
        assert "users" not in tables_after
        assert "sources" not in tables_after
        assert "favorites" not in tables_after
        engine_after.dispose()

    finally:
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except OSError:
                pass
        if os.path.exists(temp_dir):
            try:
                os.rmdir(temp_dir)
            except OSError:
                pass
