# ============================================================
# AtmosMetrics — models/dim_satelite.py
# ORM: Dimensão Satélite (espelha a tabela dim_satelite)
# ============================================================

from sqlalchemy import Column, Integer, String, Text
from app.database import Base


class DimSatelite(Base):
    __tablename__ = "dim_satelite"

    id_satelite   = Column(Integer, primary_key=True, autoincrement=True)
    nome_satelite = Column(String(50), nullable=False, unique=True)
    agencia       = Column(String(50))
    descricao     = Column(Text)

    def __repr__(self) -> str:
        return f"<DimSatelite(nome={self.nome_satelite}, agencia={self.agencia})>"
