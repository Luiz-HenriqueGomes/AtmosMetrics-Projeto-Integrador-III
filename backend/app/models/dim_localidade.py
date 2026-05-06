# ============================================================
# AtmosMetrics — models/dim_localidade.py
# ORM: Dimensão Localidade (espelha a tabela dim_localidade)
# ============================================================

from sqlalchemy import Column, Integer, String
from app.database import Base


class DimLocalidade(Base):
    __tablename__ = "dim_localidade"

    id_localidade = Column(Integer, primary_key=True, autoincrement=True)
    municipio     = Column(String(100), nullable=False)
    codigo_ibge   = Column(String(7), unique=True)
    uf            = Column(String(2), nullable=False)
    estado        = Column(String(50), nullable=False)
    regiao        = Column(String(20), nullable=False)
    bioma         = Column(String(30), nullable=False)

    def __repr__(self) -> str:
        return f"<DimLocalidade(municipio={self.municipio}, uf={self.uf})>"
