import os
import time
import logging
from typing import Tuple
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/elitedaspechinchas")

# Configuração adaptativa do Engine com Pooling Resiliente
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
        pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "30")),
        pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "1800")),
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency injection para sessões transacionais da FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection(max_retries: int = 3, retry_delay: float = 1.0, target_engine = None) -> Tuple[bool, str]:
    """
    Verifica a conectividade ativa com o banco de dados.
    Tenta executar 'SELECT 1' com retries em caso de falhas temporárias.
    Retorna (True, mensagem_sucesso) ou (False, mensagem_erro).
    """
    eng = target_engine or engine
    last_error = ""
    for attempt in range(1, max_retries + 1):
        try:
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
                return True, "Conexão com banco de dados ativa e saudável."
        except Exception as e:
            last_error = str(e)
            logger.warning(
                f"[DB Check] Falha na tentativa {attempt}/{max_retries} de conexão ao banco: {e}"
            )
            if attempt < max_retries:
                time.sleep(retry_delay)

    return False, f"Falha de conexão com banco de dados após {max_retries} tentativas: {last_error}"
