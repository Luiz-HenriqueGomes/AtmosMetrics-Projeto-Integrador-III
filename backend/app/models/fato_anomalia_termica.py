# ============================================================
# AtmosMetrics — models/fato_anomalia_termica.py
# ORM: Tabela Fato (espelha fato_anomalia_termica)
# ============================================================

from sqlalchemy import (
    Column, BigInteger, Integer, Numeric,
    Time, TIMESTAMP, ForeignKey, func,
)
from geoalchemy2 import Geometry
from app.database import Base


class FatoAnomaliaTermica(Base):
    __tablename__ = "fato_anomalia_termica"

    id_anomalia     = Column(BigInteger, primary_key=True, autoincrement=True)

    # Chaves Estrangeiras
    id_tempo        = Column(Integer, ForeignKey("dim_tempo.id_tempo"),         nullable=False)
    id_localidade   = Column(Integer, ForeignKey("dim_localidade.id_localidade"), nullable=False)
    id_satelite     = Column(Integer, ForeignKey("dim_satelite.id_satelite"),   nullable=False)

    # Coordenadas brutas
    latitude        = Column(Numeric(9, 6),  nullable=False)
    longitude       = Column(Numeric(9, 6),  nullable=False)

    # Coluna geoespacial PostGIS (mantida pelo trigger do banco)
    geom            = Column(Geometry("Point", srid=4326))

    # Métricas do foco
    frp_megawatts   = Column(Numeric(10, 2))
    risco_fogo      = Column(Numeric(5, 2))
    precipitacao_mm = Column(Numeric(7, 2))
    dias_sem_chuva  = Column(Integer)
    hora_utc        = Column(Time)

    # Auditoria
    criado_em       = Column(TIMESTAMP(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return f"<FatoAnomaliaTermica(id={self.id_anomalia}, lat={self.latitude}, lon={self.longitude})>"
