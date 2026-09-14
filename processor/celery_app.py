import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "elitedaspechinchas_processor",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["processor.notify", "processor.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Sao_Paulo",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,
    task_routes={
        "publish_offer_to_channel": {"queue": "high_priority"},
        "task_publish_offer": {"queue": "high_priority"},
        "process_telegram_message": {"queue": "default"},
        "task_process_message": {"queue": "default"},
        "task_batch_process": {"queue": "default"},
        "task_cleanup_expired": {"queue": "low_priority"},
    },
)
