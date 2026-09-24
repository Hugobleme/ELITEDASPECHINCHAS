web: python -m alembic upgrade head && python seed.py && python -m uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
worker: celery -A processor.celery_app worker --loglevel=info --pool=prefork --concurrency=2
listener: python main.py
