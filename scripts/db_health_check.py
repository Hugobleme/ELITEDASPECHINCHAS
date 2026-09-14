"""
Script de Health Check e Diagnóstico do Banco de Dados — Elite das Pechinchas
Execução: python scripts/db_health_check.py
Retorna exit code 0 se tudo saudável, 1 se houver erros críticos.
"""

import sys
import os

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from sqlalchemy import inspect, text

# Adiciona diretório raiz ao path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database.connection import engine, check_db_connection

REQUIRED_TABLES = [
    "stores",
    "categories",
    "coupons",
    "offers",
    "sources",
    "affiliate_rules",
    "users",
    "user_preferences",
    "favorites",
    "price_alerts",
    "push_subscriptions",
    "notifications",
    "processed_messages",
]


def run_health_check():
    print("==========================================================")
    print("🏥 DB HEALTH CHECK — ELITE DAS PECHINCHAS")
    print("==========================================================")

    # 1. Teste de Conectividade
    print("\n1. Verificando conectividade com o banco de dados...")
    is_ok, msg = check_db_connection(max_retries=3, retry_delay=1.0)
    if not is_ok:
        print(f"❌ [FALHA]: {msg}", file=sys.stderr)
        sys.exit(1)
    print(f"✅ [OK]: {msg}")

    # 2. Verificação de Tabelas Obrigatórias
    print("\n2. Verificando schema e tabelas obrigatórias...")
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    missing_tables = [t for t in REQUIRED_TABLES if t not in existing_tables]

    if missing_tables:
        print(f"❌ [FALHA]: Tabelas ausentes detectadas: {missing_tables}", file=sys.stderr)
        print("Dica: Execute 'alembic upgrade head' ou 'python seed.py' para criá-las.", file=sys.stderr)
        sys.exit(1)

    print(f"✅ [OK]: Todas as {len(REQUIRED_TABLES)} tabelas obrigatórias estão presentes.")

    # 3. Estatísticas de Registros
    print("\n3. Contagem de registros por tabela:")
    counts = {}
    with engine.connect() as conn:
        for table in REQUIRED_TABLES:
            try:
                res = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
                counts[table] = res or 0
                print(f"   • {table:20}: {counts[table]} registros")
            except Exception as e:
                print(f"   • {table:20}: erro ao consultar ({e})")

    print("\n==========================================================")
    print("🎉 STATUS GERAL DO BANCO: SAUDÁVEL E OPERACIONAL")
    print("==========================================================")
    sys.exit(0)


if __name__ == "__main__":
    run_health_check()
