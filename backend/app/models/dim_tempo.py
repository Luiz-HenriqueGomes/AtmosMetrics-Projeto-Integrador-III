# ============================================================
# AtmosMetrics — models/dim_tempo.py
# ORM: Dimensão Temporal (espelha a tabela dim_tempo)
# ============================================================

from sqlalchemy import Column, Integer, SmallInteger, String, Date, Boolean
from app.database import Base


class DimTempo(Base):
    __tablename__ = "dim_tempo"

    id_tempo        = Column(Integer, primary_key=True, autoincrement=True)
    data_completa   = Column(Date, nullable=False, unique=True)
    ano             = Column(SmallInteger, nullable=False)
    semestre        = Column(SmallInteger, nullable=False)
    trimestre       = Column(SmallInteger, nullable=False)
    mes             = Column(SmallInteger, nullable=False)
    nome_mes        = Column(String(20), nullable=False)
    semana_do_ano   = Column(SmallInteger, nullable=False)
    dia             = Column(SmallInteger, nullable=False)
    dia_da_semana   = Column(SmallInteger, nullable=False)
    nome_dia        = Column(String(15), nullable=False)
    e_fim_de_semana = Column(Boolean, nullable=False)

    def __repr__(self) -> str:
        return f"<DimTempo(data={self.data_completa})>"
