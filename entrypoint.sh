#!/bin/sh
set -e

# ==============================================================================
# ENTRYPOINT — ELITE DAS PECHINCHAS (BACKEND / WORKER / LISTENER)
# ==============================================================================

wait_for_postgres() {
    echo "⏳ Aguardando PostgreSQL ficar disponível em $DATABASE_URL..."
    until python -c "
import os, sys, psycopg2
url = os.getenv('DATABASE_URL', '')
try:
    conn = psycopg2.connect(url)
    conn.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; do
        sleep 1
    done
    echo "✅ PostgreSQL conectado com sucesso!"
}

wait_for_redis() {
    echo "⏳ Aguardando Redis ficar disponível em $REDIS_URL..."
    until python -c "
import os, sys, redis
url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
try:
    r = redis.from_url(url)
    r.ping()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; do
        sleep 1
    done
    echo "✅ Redis conectado com sucesso!"
}

run_migrations() {
    echo "🚀 Aplicando migrações do banco (alembic upgrade head)..."
    alembic upgrade head
    echo "✅ Migrações aplicadas com sucesso!"
}

COMMAND="${1:-api}"

case "$COMMAND" in
    api)
        wait_for_postgres
        wait_for_redis
        run_migrations
        echo "🌐 Iniciando servidor FastAPI Uvicorn na porta 8000..."
        exec uvicorn api.main:app --host 0.0.0.0 --port 8000
        ;;
    worker|celery-worker)
        wait_for_postgres
        wait_for_redis
        echo "⚙️ Iniciando Celery Worker (processor.celery_app)..."
        exec celery -A processor.celery_app worker --loglevel=info
        ;;
    listener|telegram-bot|bot)
        wait_for_postgres
        wait_for_redis
        echo "🤖 Iniciando Automação Telethon Userbot (main.py)..."
        exec python main.py
        ;;
    *)
        # Executa comando customizado (ex: python seed.py, pytest, bash)
        wait_for_postgres
        exec "$@"
        ;;
esac
