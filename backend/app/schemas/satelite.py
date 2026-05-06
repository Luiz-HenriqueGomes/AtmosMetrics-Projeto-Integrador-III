# ============================================================
# AtmosMetrics — schemas/satelite.py
# Pydantic: serialização de satélites para a API
# ============================================================

from pydantic import BaseModel, ConfigDict
from typing import Optional


class SateliteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_satelite:   int
    nome_satelite: str
    agencia:       Optional[str] = None
    descricao:     Optional[str] = None
