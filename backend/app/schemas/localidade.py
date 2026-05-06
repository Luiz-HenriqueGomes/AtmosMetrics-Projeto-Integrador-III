# ============================================================
# AtmosMetrics — schemas/localidade.py
# Pydantic: serialização de localidades para a API
# ============================================================

from pydantic import BaseModel, ConfigDict


class LocalidadeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_localidade: int
    municipio:     str
    codigo_ibge:   str | None = None
    uf:            str
    estado:        str
    regiao:        str
    bioma:         str


class EstadoOut(BaseModel):
    """Lista simplificada de estados para filtros no frontend."""
    uf:    str
    estado: str
    regiao: str


class BiomaOut(BaseModel):
    """Lista de biomas únicos para filtros no frontend."""
    bioma: str
