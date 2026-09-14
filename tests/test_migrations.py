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


def test_alembic_migrations_postgresql():
    """
    Validação de migrações em PostgreSQL limpo (Fase de Homologação / CI).
    No ambiente de CI (CI=true), o teste EXIGE um PostgreSQL funcional e falha
    imediatamente se não conseguir conectar ou executar as migrações.
    Localmente, se TEST_POSTGRES_URL não estiver configurada, o teste é documentado
    como PENDENTE via pytest.skip.
    """
    is_ci = os.getenv("CI") == "true"
    postgres_url = os.getenv("TEST_POSTGRES_URL") or os.getenv("DATABASE_URL")
    if not postgres_url or not postgres_url.startswith("postgresql"):
        if is_ci:
            pytest.fail("Ambiente CI requer PostgreSQL ativo configurado em TEST_POSTGRES_URL.")
        pytest.skip(
            "Validação PostgreSQL pendente: nenhum servidor PostgreSQL configurado em TEST_POSTGRES_URL. "
            "Para executar: docker run -d --name pg-test -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=elitedaspechinchas -p 5432:5432 postgres:16-alpine"
        )

    try:
        engine = create_engine(postgres_url)
        with engine.connect() as conn:
            pass
    except Exception as e:
        if is_ci:
            pytest.fail(f"Falha na conexão com PostgreSQL no CI ({postgres_url}): {e}")
        pytest.skip(
            f"Validação PostgreSQL pendente: falha na conexão com {postgres_url} ({e}). "
            "Execute: docker run -d --name pg-test -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=elitedaspechinchas -p 5432:5432 postgres:16-alpine"
        )

    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", postgres_url)

    try:
        # 1. Upgrade completo até head
        command.upgrade(alembic_cfg, "head")

        inspector = inspect(engine)
        tables = inspector.get_table_names()

        required_tables = [
            "sources",
            "offers",
            "affiliate_rules",
            "users",
            "user_preferences",
            "favorites",
            "price_alerts",
            "push_subscriptions",
            "notifications",
        ]
        for table in required_tables:
            assert table in tables, f"Tabela esperada '{table}' não encontrada após upgrade head."

        # Validação de tipo BIGINT para telegram_msg_id
        offer_columns = {c["name"]: str(c["type"]) for c in inspector.get_columns("offers")}
        assert "telegram_msg_id" in offer_columns, "telegram_msg_id ausente em offers"
        assert "BIGINT" in offer_columns["telegram_msg_id"].upper(), f"telegram_msg_id esperado BIGINT, obtido {offer_columns['telegram_msg_id']}"
        assert "coupon_code" in offer_columns, "coupon_code ausente em offers"

        # Validação de Foreign Keys em favorites
        fk_favorites = inspector.get_foreign_keys("favorites")
        fk_tables = [fk["referred_table"] for fk in fk_favorites]
        assert "users" in fk_tables, "FK para users ausente em favorites"
        assert "offers" in fk_tables, "FK para offers ausente em favorites"

        # Validação de Foreign Keys em price_alerts
        fk_alerts = inspector.get_foreign_keys("price_alerts")
        fk_alert_tables = [fk["referred_table"] for fk in fk_alerts]
        assert "users" in fk_alert_tables, "FK para users ausente em price_alerts"

        # Validação de índices
        indexes_offers = [idx["name"] for idx in inspector.get_indexes("offers")]
        assert len(indexes_offers) > 0, "Índices ausentes na tabela offers"

        # 2. Downgrade completo até base
        command.downgrade(alembic_cfg, "base")

        engine.dispose()
        engine = create_engine(postgres_url)
        inspector_after = inspect(engine)
        tables_after = inspector_after.get_table_names()
        for table in required_tables:
            assert table not in tables_after, f"Tabela '{table}' não deveria existir após downgrade base."

        # 3. Upgrade novamente para confirmar idempotência e retorno ao estado correto
        command.upgrade(alembic_cfg, "head")

        engine.dispose()
        engine = create_engine(postgres_url)
        inspector_final = inspect(engine)
        tables_final = inspector_final.get_table_names()
        for table in required_tables:
            assert table in tables_final, f"Tabela '{table}' não encontrada após re-upgrade head."

    finally:
        engine.dispose()
