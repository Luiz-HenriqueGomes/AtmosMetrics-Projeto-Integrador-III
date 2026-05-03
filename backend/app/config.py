# ============================================================
# AtmosMetrics — config.py
# Lê as variáveis de ambiente do .env (raiz do projeto)
# ============================================================

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Configurações da aplicação carregadas do arquivo .env.
    Funciona tanto no Docker (env vars injetadas pelo compose)
    quanto em desenvolvimento local (lê ../.env).
    """

    # PostgreSQL
    postgres_db: str
    postgres_user: str
    postgres_password: str
    postgres_host: str = "db"   # nome do serviço no docker-compose
    postgres_port: int = 5432

    # pgAdmin (não usado pelo backend, mas presente no .env)
    pgadmin_default_email: str = ""
    pgadmin_default_password: str = ""

    model_config = SettingsConfigDict(
        # Tenta ../.env (dev local a partir de backend/) e .env (Docker)
        env_file=["../.env", ".env"],
        env_file_encoding="utf-8",
        extra="ignore",          # ignora variáveis desconhecidas no .env
        case_sensitive=False,
    )

    @property
    def database_url(self) -> str:
        """URL de conexão no formato esperado pelo SQLAlchemy."""
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


@lru_cache()
def get_settings() -> Settings:
    """Retorna instância cacheada das configurações."""
    return Settings()
