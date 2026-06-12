# Modelo ORM - Dimensao Localidade (PostgreSQL + PostGIS)
# ============================================================
# AtmosMetrics — models/dim_localidade.py
# ORM: Dimensão Localidade (espelha a tabela dim_localidade)
# Expandido para suporte global (colunas de país, continente, etc.)
# ============================================================

from sqlalchemy import Column, Integer, String, Numeric
from app.database import Base


class DimLocalidade(Base):
    __tablename__ = "dim_localidade"

    id_localidade = Column(Integer, primary_key=True, autoincrement=True)
    municipio     = Column(String(100), nullable=False)
    codigo_ibge   = Column(String(7), unique=True)

    # Campos específicos do Brasil (opcionais para localidades internacionais)
    uf            = Column(String(2), nullable=True)
    estado        = Column(String(50), nullable=True)
    regiao        = Column(String(20), nullable=True)
    bioma         = Column(String(30), nullable=True)

    # Campos globais
    pais          = Column(String(100), default="Brasil")
    continente    = Column(String(50), default="América do Sul")
    latitude_ref  = Column(Numeric(9, 6), nullable=True)
    longitude_ref = Column(Numeric(9, 6), nullable=True)
    codigo_iso    = Column(String(3), nullable=True)

    def __repr__(self) -> str:
        return f"<DimLocalidade(municipio={self.municipio}, pais={self.pais})>"
