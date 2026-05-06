# ============================================================
# AtmosMetrics — routers/anomalias.py
# Endpoints: /api/v1/anomalias
# ============================================================

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import date
from typing import Optional
from decimal import Decimal

from app.database import get_db
from app.models import FatoAnomaliaTermica, DimTempo, DimLocalidade, DimSatelite
from app.schemas.anomalia import AnomaliaOut, ResumoGeralOut, AnomaliaResumoOut

router = APIRouter(prefix="/api/v1/anomalias", tags=["Anomalias Térmicas"])


# ---- Helpers ---------------------------------------------------------------

def _base_query(db: Session):
    """Query base com todos os JOINs das dimensões."""
    return (
        db.query(
            FatoAnomaliaTermica.id_anomalia,
            FatoAnomaliaTermica.latitude,
            FatoAnomaliaTermica.longitude,
            FatoAnomaliaTermica.frp_megawatts,
            FatoAnomaliaTermica.risco_fogo,
            FatoAnomaliaTermica.precipitacao_mm,
            FatoAnomaliaTermica.dias_sem_chuva,
            FatoAnomaliaTermica.hora_utc,
            DimTempo.data_completa,
            DimLocalidade.uf,
            DimLocalidade.estado,
            DimLocalidade.municipio,
            DimLocalidade.bioma,
            DimLocalidade.regiao,
            DimSatelite.nome_satelite,
        )
        .join(DimTempo,      FatoAnomaliaTermica.id_tempo      == DimTempo.id_tempo)
        .join(DimLocalidade, FatoAnomaliaTermica.id_localidade == DimLocalidade.id_localidade)
        .join(DimSatelite,   FatoAnomaliaTermica.id_satelite   == DimSatelite.id_satelite)
    )


def _apply_filters(query, data_inicio, data_fim, uf, bioma, satelite):
    """Aplica os filtros opcionais à query."""
    if data_inicio:
        query = query.filter(DimTempo.data_completa >= data_inicio)
    if data_fim:
        query = query.filter(DimTempo.data_completa <= data_fim)
    if uf:
        query = query.filter(DimLocalidade.uf == uf.upper())
    if bioma:
        query = query.filter(DimLocalidade.bioma.ilike(f"%{bioma}%"))
    if satelite:
        query = query.filter(DimSatelite.nome_satelite.ilike(f"%{satelite}%"))
    return query


def _row_to_schema(row) -> AnomaliaOut:
    """Converte uma linha do resultado para o schema de saída."""
    return AnomaliaOut(
        id_anomalia=row.id_anomalia,
        latitude=row.latitude,
        longitude=row.longitude,
        frp_megawatts=row.frp_megawatts,
        risco_fogo=row.risco_fogo,
        precipitacao_mm=row.precipitacao_mm,
        dias_sem_chuva=row.dias_sem_chuva,
        hora_utc=row.hora_utc,
        data_completa=row.data_completa,
        uf=row.uf,
        estado=row.estado,
        municipio=row.municipio,
        bioma=row.bioma,
        regiao=row.regiao,
        nome_satelite=row.nome_satelite,
    )


# ---- Endpoints -------------------------------------------------------------

@router.get("/", response_model=list[AnomaliaOut], summary="Listar focos de calor")
def listar_anomalias(
    data_inicio: Optional[date] = Query(None, description="Data inicial (YYYY-MM-DD)"),
    data_fim:    Optional[date] = Query(None, description="Data final (YYYY-MM-DD)"),
    uf:          Optional[str]  = Query(None, description="UF do estado (ex: MT, PA)"),
    bioma:       Optional[str]  = Query(None, description="Bioma (ex: Cerrado, Amazônia)"),
    satelite:    Optional[str]  = Query(None, description="Nome do satélite (ex: AQUA_M-T)"),
    limit:       int            = Query(100, ge=1, le=1000, description="Máx. de registros retornados"),
    offset:      int            = Query(0, ge=0, description="Paginação: início da busca"),
    db: Session = Depends(get_db),
):
    """
    Retorna uma lista paginada de focos de calor com dados das dimensões.
    Use os filtros para restringir por período, estado, bioma ou satélite.
    """
    query = _base_query(db)
    query = _apply_filters(query, data_inicio, data_fim, uf, bioma, satelite)
    rows = query.order_by(DimTempo.data_completa.desc()).offset(offset).limit(limit).all()
    return [_row_to_schema(r) for r in rows]


@router.get("/resumo", response_model=ResumoGeralOut, summary="Resumo para o dashboard")
def resumo_anomalias(
    data_inicio: Optional[date] = Query(None, description="Data inicial (YYYY-MM-DD)"),
    data_fim:    Optional[date] = Query(None, description="Data final (YYYY-MM-DD)"),
    uf:          Optional[str]  = Query(None, description="Filtrar por UF"),
    bioma:       Optional[str]  = Query(None, description="Filtrar por bioma"),
    satelite:    Optional[str]  = Query(None, description="Filtrar por satélite"),
    db: Session = Depends(get_db),
):
    """
    Retorna métricas agregadas para os cards e gráficos do dashboard:
    total de focos, FRP médio, distribuição por UF e por bioma.
    """
    # Query base para os agregados gerais
    base = (
        db.query(FatoAnomaliaTermica)
        .join(DimTempo,      FatoAnomaliaTermica.id_tempo      == DimTempo.id_tempo)
        .join(DimLocalidade, FatoAnomaliaTermica.id_localidade == DimLocalidade.id_localidade)
        .join(DimSatelite,   FatoAnomaliaTermica.id_satelite   == DimSatelite.id_satelite)
    )
    base = _apply_filters(base, data_inicio, data_fim, uf, bioma, satelite)

    total = base.count()
    agg = base.with_entities(
        func.avg(FatoAnomaliaTermica.frp_megawatts).label("media_frp"),
        func.avg(FatoAnomaliaTermica.risco_fogo).label("media_risco"),
        func.min(DimTempo.data_completa).label("data_inicio"),
        func.max(DimTempo.data_completa).label("data_fim"),
    ).first()

    # Agrupamento por UF
    por_uf_rows = (
        db.query(
            DimLocalidade.uf.label("chave"),
            func.count(FatoAnomaliaTermica.id_anomalia).label("total_focos"),
            func.avg(FatoAnomaliaTermica.frp_megawatts).label("frp_media"),
            func.max(FatoAnomaliaTermica.frp_megawatts).label("frp_max"),
        )
        .join(DimTempo,      FatoAnomaliaTermica.id_tempo      == DimTempo.id_tempo)
        .join(DimLocalidade, FatoAnomaliaTermica.id_localidade == DimLocalidade.id_localidade)
        .join(DimSatelite,   FatoAnomaliaTermica.id_satelite   == DimSatelite.id_satelite)
        .filter(*_build_filters(data_inicio, data_fim, uf, bioma, satelite))
        .group_by(DimLocalidade.uf)
        .order_by(func.count(FatoAnomaliaTermica.id_anomalia).desc())
        .limit(27)
        .all()
    )

    # Agrupamento por bioma
    por_bioma_rows = (
        db.query(
            DimLocalidade.bioma.label("chave"),
            func.count(FatoAnomaliaTermica.id_anomalia).label("total_focos"),
            func.avg(FatoAnomaliaTermica.frp_megawatts).label("frp_media"),
            func.max(FatoAnomaliaTermica.frp_megawatts).label("frp_max"),
        )
        .join(DimTempo,      FatoAnomaliaTermica.id_tempo      == DimTempo.id_tempo)
        .join(DimLocalidade, FatoAnomaliaTermica.id_localidade == DimLocalidade.id_localidade)
        .join(DimSatelite,   FatoAnomaliaTermica.id_satelite   == DimSatelite.id_satelite)
        .filter(*_build_filters(data_inicio, data_fim, uf, bioma, satelite))
        .group_by(DimLocalidade.bioma)
        .order_by(func.count(FatoAnomaliaTermica.id_anomalia).desc())
        .all()
    )

    return ResumoGeralOut(
        total_focos=total,
        media_frp=agg.media_frp if agg else None,
        media_risco=agg.media_risco if agg else None,
        data_inicio=agg.data_inicio if agg else None,
        data_fim=agg.data_fim if agg else None,
        por_uf=[AnomaliaResumoOut(
            chave=r.chave, total_focos=r.total_focos,
            frp_media=r.frp_media, frp_max=r.frp_max,
        ) for r in por_uf_rows],
        por_bioma=[AnomaliaResumoOut(
            chave=r.chave, total_focos=r.total_focos,
            frp_media=r.frp_media, frp_max=r.frp_max,
        ) for r in por_bioma_rows],
    )


def _build_filters(data_inicio, data_fim, uf, bioma, satelite):
    """Retorna lista de expressões de filtro para .filter(*filters)."""
    filters = []
    if data_inicio:
        filters.append(DimTempo.data_completa >= data_inicio)
    if data_fim:
        filters.append(DimTempo.data_completa <= data_fim)
    if uf:
        filters.append(DimLocalidade.uf == uf.upper())
    if bioma:
        filters.append(DimLocalidade.bioma.ilike(f"%{bioma}%"))
    if satelite:
        filters.append(DimSatelite.nome_satelite.ilike(f"%{satelite}%"))
    return filters if filters else [text("1=1")]
