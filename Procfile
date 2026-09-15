web: alembic upgrade head && python seed.py && uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
worker: celery -A processor.celery_app worker --loglevel=info --pool=prefork --concurrency=2
listener: python main.py
