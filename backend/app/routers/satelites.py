# ============================================================
# AtmosMetrics — routers/satelites.py
# Endpoints: /api/v1/satelites
# ============================================================

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.dim_satelite import DimSatelite
from app.schemas.satelite import SateliteOut

router = APIRouter(prefix="/api/v1/satelites", tags=["Satélites"])


@router.get("/", response_model=list[SateliteOut], summary="Listar satélites")
def listar_satelites(db: Session = Depends(get_db)):
    """Retorna todos os satélites cadastrados (pré-populados pelo seed SQL)."""
    return db.query(DimSatelite).order_by(DimSatelite.nome_satelite).all()
