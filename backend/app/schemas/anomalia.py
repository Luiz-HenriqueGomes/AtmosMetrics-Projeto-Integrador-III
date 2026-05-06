# ============================================================
# AtmosMetrics — schemas/anomalia.py
# Pydantic: serialização dos focos de calor para a API
# ============================================================

from pydantic import BaseModel, ConfigDict
from datetime import date, time
from decimal import Decimal
from typing import Optional


class AnomaliaOut(BaseModel):
    """Resposta de um único foco de calor com dados das dimensões."""

    model_config = ConfigDict(from_attributes=True)

    id_anomalia:     int
    latitude:        Decimal
    longitude:       Decimal
    frp_megawatts:   Optional[Decimal] = None
    risco_fogo:      Optional[Decimal] = None
    precipitacao_mm: Optional[Decimal] = None
    dias_sem_chuva:  Optional[int]     = None
    hora_utc:        Optional[time]    = None

    # Dados das dimensões (preenchidos pela query com JOIN)
    data_completa:   Optional[date]    = None
    uf:              Optional[str]     = None
    estado:          Optional[str]     = None
    municipio:       Optional[str]     = None
    bioma:           Optional[str]     = None
    regiao:          Optional[str]     = None
    nome_satelite:   Optional[str]     = None


class AnomaliaResumoOut(BaseModel):
    """Agrupamento por UF ou bioma para exibição no dashboard."""

    chave:        str            # ex: 'MT' ou 'Cerrado'
    total_focos:  int
    frp_media:    Optional[Decimal] = None
    frp_max:      Optional[Decimal] = None


class ResumoGeralOut(BaseModel):
    """Resumo geral do período para os cards do dashboard."""

    total_focos:       int
    media_frp:         Optional[Decimal] = None
    media_risco:       Optional[Decimal] = None
    data_inicio:       Optional[date]    = None
    data_fim:          Optional[date]    = None
    por_uf:            list[AnomaliaResumoOut] = []
    por_bioma:         list[AnomaliaResumoOut] = []
