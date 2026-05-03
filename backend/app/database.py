# ============================================================
# AtmosMetrics — database.py
# Engine SQLAlchemy + gerenciamento de sessão
# ============================================================

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from typing import Generator

from app.config import get_settings

settings = get_settings()

# Engine de conexão com o PostgreSQL
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,      # verifica a conexão antes de usar
    pool_size=5,             # conexões simultâneas no pool
    max_overflow=10,         # conexões extras quando o pool esgota
    echo=False,              # True = loga todas as queries (útil para debug)
)

# Fábrica de sessões
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    """Classe base para todos os modelos ORM."""
    pass


def get_db() -> Generator:
    """
    Dependency injection do FastAPI.
    Garante que a sessão seja sempre fechada, mesmo em caso de erro.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_connection() -> bool:
    """Verifica se o banco de dados está acessível."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
