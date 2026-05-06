# ============================================================
# AtmosMetrics — routers/localidades.py
# Endpoints: /api/v1/localidades
# ============================================================

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import distinct

from app.database import get_db
from app.models.dim_localidade import DimLocalidade
from app.schemas.localidade import LocalidadeOut, EstadoOut, BiomaOut

router = APIRouter(prefix="/api/v1/localidades", tags=["Localidades"])


@router.get("/", response_model=list[LocalidadeOut], summary="Listar localidades")
def listar_localidades(db: Session = Depends(get_db)):
    """Retorna todas as localidades cadastradas no banco."""
    return db.query(DimLocalidade).order_by(DimLocalidade.estado, DimLocalidade.municipio).all()


@router.get("/estados", response_model=list[EstadoOut], summary="Listar estados")
def listar_estados(db: Session = Depends(get_db)):
    """Retorna a lista de estados únicos — útil para filtros no frontend."""
    from sqlalchemy import func
    rows = (
        db.query(
            DimLocalidade.uf,
            func.min(DimLocalidade.estado).label("estado"),
            func.min(DimLocalidade.regiao).label("regiao"),
        )
        .group_by(DimLocalidade.uf)
        .order_by(func.min(DimLocalidade.estado))
        .all()
    )
    return [EstadoOut(uf=r.uf, estado=r.estado, regiao=r.regiao) for r in rows]


@router.get("/biomas", response_model=list[BiomaOut], summary="Listar biomas")
def listar_biomas(db: Session = Depends(get_db)):
    """Retorna a lista de biomas únicos — útil para filtros no frontend."""
    rows = (
        db.query(distinct(DimLocalidade.bioma).label("bioma"))
        .order_by(DimLocalidade.bioma)
        .all()
    )
    return [BiomaOut(bioma=r.bioma) for r in rows]
