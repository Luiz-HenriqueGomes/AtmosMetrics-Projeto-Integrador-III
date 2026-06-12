# Schema Pydantic - Validacao de dados climaticos globais
# ============================================================
# AtmosMetrics — schemas/clima.py
# Pydantic: serialização de dados climáticos para a API
# ============================================================

from pydantic import BaseModel, ConfigDict
from datetime import date
from decimal import Decimal
from typing import Optional


class ClimaOut(BaseModel):
    """Resposta de um registro climático diário com dados das dimensões."""

    model_config = ConfigDict(from_attributes=True)

    id_clima:            int
    temperatura_media:   Optional[Decimal] = None
    temperatura_max:     Optional[Decimal] = None
    temperatura_min:     Optional[Decimal] = None
    umidade_media:       Optional[Decimal] = None
    precipitacao_mm:     Optional[Decimal] = None
    velocidade_vento:    Optional[Decimal] = None
    direcao_vento:       Optional[int]     = None
    pressao_hpa:         Optional[Decimal] = None
    radiacao_solar:      Optional[Decimal] = None

    # Dados das dimensões (preenchidos pela query com JOIN)
    data_completa:       Optional[date]    = None
    municipio:           Optional[str]     = None
    pais:                Optional[str]     = None
    continente:          Optional[str]     = None
    latitude:            Optional[Decimal] = None
    longitude:           Optional[Decimal] = None


class ResumoClimaOut(BaseModel):
    """Resumo agregado de dados climáticos para o dashboard."""

    temp_media_global:   Optional[float]   = None
    temp_max_global:     Optional[float]   = None
    temp_min_global:     Optional[float]   = None
    umidade_media:       Optional[float]   = None
    precipitacao_media:  Optional[float]   = None
    vento_medio:         Optional[float]   = None
    total_registros:     int               = 0
    data_inicio:         Optional[date]    = None
    data_fim:            Optional[date]    = None
