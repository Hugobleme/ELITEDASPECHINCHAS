"""
Script de validação automatizada de Migrations Alembic no PostgreSQL 16.
Utilizado no CI (GitHub Actions) e para homologação local.
Executa o ciclo completo:
1. Upgrade head
2. Verificação de todas as 9 tabelas obrigatórias
3. Verificação de tipo BIGINT para offers.telegram_msg_id
4. Verificação de foreign keys e índices
5. Downgrade base
6. Verificação de remoção das tabelas de domínio
7. Re-upgrade head
8. Verificação de restauração do estado correto
"""
import os
import sys
import time
from sqlalchemy import create_engine, inspect
from alembic.config import Config
from alembic import command


def verify_database():
    postgres_url = os.getenv("DATABASE_URL") or os.getenv("TEST_POSTGRES_URL")
    if not postgres_url or not postgres_url.startswith("postgresql"):
        print("[-] ERRO CRÍTICO: DATABASE_URL do PostgreSQL não configurada.", file=sys.stderr)
        sys.exit(1)

    masked_url = postgres_url.split("@")[-1] if "@" in postgres_url else "postgresql://localhost"
    print(f"[+] Conectando ao PostgreSQL em: {masked_url}")

    # Aguarda conexão ativa se necessário
    max_retries = 10
    engine = None
    for attempt in range(1, max_retries + 1):
        try:
            engine = create_engine(postgres_url, pool_pre_ping=True)
            with engine.connect():
                print(f"[+] Conexão com PostgreSQL estabelecida com sucesso (tentativa {attempt}).")
                break
        except Exception as err:
            print(f"[*] Tentativa {attempt}/{max_retries} falhou: {err}. Aguardando 2 segundos...")
            time.sleep(2)
    else:
        print("[-] ERRO CRÍTICO: Não foi possível conectar ao PostgreSQL.", file=sys.stderr)
        sys.exit(1)

    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", postgres_url)

    required_tables = [
        "offers",
        "sources",
        "affiliate_rules",
        "users",
        "user_preferences",
        "favorites",
        "price_alerts",
        "push_subscriptions",
        "notifications",
        "stores",
        "categories",
        "coupons",
        "processed_messages",
    ]

    # 1. Executa alembic upgrade head
    print("\n[+] 1. Executando 'alembic upgrade head'...")
    command.upgrade(alembic_cfg, "head")

    # 2. Inspeciona e verifica tabelas
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"[+] Tabelas encontradas após upgrade head: {tables}")
    for table in required_tables:
        if table not in tables:
            print(f"[-] ERRO: Tabela obrigatória '{table}' ausente!", file=sys.stderr)
            sys.exit(1)
        print(f"  [OK] Tabela '{table}' presente")

    # 3. Verifica offers.telegram_msg_id é BIGINT
    offer_cols = {c["name"]: str(c["type"]).upper() for c in inspector.get_columns("offers")}
    if "telegram_msg_id" not in offer_cols:
        print("[-] ERRO: Coluna 'telegram_msg_id' ausente em offers!", file=sys.stderr)
        sys.exit(1)
    if "BIGINT" not in offer_cols["telegram_msg_id"]:
        print(f"[-] ERRO: offers.telegram_msg_id não é BIGINT (tipo: {offer_cols['telegram_msg_id']})!", file=sys.stderr)
        sys.exit(1)
    print(f"  [OK] offers.telegram_msg_id validado como BIGINT ({offer_cols['telegram_msg_id']})")

    # 4. Verifica Foreign Keys e Indexes
    fk_favorites = inspector.get_foreign_keys("favorites")
    referred_in_favs = [fk["referred_table"] for fk in fk_favorites]
    if "users" not in referred_in_favs or "offers" not in referred_in_favs:
        print(f"[-] ERRO: Foreign keys de favorites incorretas: {referred_in_favs}", file=sys.stderr)
        sys.exit(1)
    print("  [OK] Foreign keys de favorites verificadas (users, offers)")

    fk_alerts = inspector.get_foreign_keys("price_alerts")
    referred_in_alerts = [fk["referred_table"] for fk in fk_alerts]
    if "users" not in referred_in_alerts:
        print(f"[-] ERRO: Foreign keys de price_alerts incorretas: {referred_in_alerts}", file=sys.stderr)
        sys.exit(1)
    print("  [OK] Foreign keys de price_alerts verificadas (users)")

    indexes_offers = inspector.get_indexes("offers")
    if not indexes_offers:
        print("[-] ERRO: Nenhum índice encontrado na tabela offers!", file=sys.stderr)
        sys.exit(1)
    print(f"  [OK] {len(indexes_offers)} índices encontrados e validados em offers")

    # 5. Executa alembic downgrade base
    print("\n[+] 2. Executando 'alembic downgrade base'...")
    command.downgrade(alembic_cfg, "base")

    engine.dispose()
    engine = create_engine(postgres_url, pool_pre_ping=True)
    inspector_down = inspect(engine)
    tables_down = inspector_down.get_table_names()
    print(f"[+] Tabelas restantes após downgrade base: {tables_down}")
    for table in required_tables:
        if table in tables_down:
            print(f"[-] ERRO: Tabela '{table}' não foi removida no downgrade base!", file=sys.stderr)
            sys.exit(1)
    print("  [OK] Todas as 13 tabelas de domínio foram removidas com sucesso no downgrade")

    # 6. Executa novamente alembic upgrade head
    print("\n[+] 3. Re-executando 'alembic upgrade head'...")
    command.upgrade(alembic_cfg, "head")

    engine.dispose()
    engine = create_engine(postgres_url, pool_pre_ping=True)
    inspector_final = inspect(engine)
    tables_final = inspector_final.get_table_names()
    for table in required_tables:
        if table not in tables_final:
            print(f"[-] ERRO: Tabela '{table}' ausente após re-upgrade head!", file=sys.stderr)
            sys.exit(1)
    print("  [OK] Todas as 13 tabelas restauradas perfeitamente no re-upgrade head")

    print("\n[SUCCESS] Todas as validações de migrations PostgreSQL passaram com 100% de sucesso!")
    engine.dispose()


if __name__ == "__main__":
    verify_database()
