# Router ETL - Endpoints para execucao dos pipelines de ingestao
# ============================================================
# AtmosMetrics — routers/etl.py
# Endpoints: /api/v1/etl
# Disparo manual de pipelines de ingestão de dados
# ============================================================

from fastapi import APIRouter, Depends, Query, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta
from pydantic import BaseModel

from app.database import get_db

router = APIRouter(prefix="/api/v1/etl", tags=["ETL"])


class ETLResponse(BaseModel):
    status:    str
    mensagem:  str
    data:      str
    registros: int = 0


# ---- INPE (focos de calor Brasil) ------------------------------------------

@router.post("/executar", response_model=ETLResponse, summary="Executar ETL INPE (background)")
def executar_etl(
    background_tasks: BackgroundTasks,
    data: date = Query(
        default=None,
        description="Data para ingestão (YYYY-MM-DD). Padrão: ontem.",
    ),
    db: Session = Depends(get_db),
):
    """
    Dispara o pipeline ETL para baixar e carregar os focos de calor
    do INPE referentes à data informada.

    - Se `data` não for informada, usa o dia anterior (ontem).
    - O processamento ocorre em background para não bloquear a resposta.
    """
    from etl.loader import executar_pipeline

    if data is None:
        data = date.today() - timedelta(days=1)

    if data > date.today():
        raise HTTPException(
            status_code=400,
            detail=f"Data {data} é no futuro. Use uma data passada.",
        )

    background_tasks.add_task(executar_pipeline, data)

    return ETLResponse(
        status="iniciado",
        mensagem=f"ETL INPE para {data} iniciado em background. Verifique os logs do container.",
        data=str(data),
    )


@router.post("/executar-sync", response_model=ETLResponse, summary="ETL INPE síncrono")
def executar_etl_sync(
    data: date = Query(default=None, description="Data para ingestão (YYYY-MM-DD). Padrão: ontem."),
    db: Session = Depends(get_db),
):
    """
    Igual ao /executar, mas aguarda o processamento terminar antes de responder.
    Útil para testes e validação.
    """
    from etl.loader import executar_pipeline

    if data is None:
        data = date.today() - timedelta(days=1)

    if data > date.today():
        raise HTTPException(
            status_code=400,
            detail=f"Data {data} é no futuro. Use uma data passada.",
        )

    try:
        registros = executar_pipeline(data)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno no ETL INPE: {str(e)}",
        )

    return ETLResponse(
        status="concluído",
        mensagem=f"ETL INPE para {data} concluído com sucesso.",
        data=str(data),
        registros=registros,
    )


# ---- Open-Meteo (clima global) --------------------------------------------

@router.post("/executar-clima-sync", response_model=ETLResponse, summary="ETL Clima síncrono (Open-Meteo)")
def executar_clima_sync(
    data: date = Query(default=None, description="Data para ingestão (YYYY-MM-DD). Padrão: ontem."),
    db: Session = Depends(get_db),
):
    """
    Executa o pipeline de dados climáticos da Open-Meteo para todas as
    localidades com coordenadas de referência. Não requer API key.
    """
    from etl.openmeteo_etl import executar_pipeline_clima

    if data is None:
        data = date.today() - timedelta(days=1)

    if data > date.today():
        raise HTTPException(status_code=400, detail=f"Data {data} é no futuro.")

    try:
        registros = executar_pipeline_clima(data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno no ETL Clima: {str(e)}",
        )

    return ETLResponse(
        status="concluído",
        mensagem=f"ETL Clima para {data} concluído com sucesso.",
        data=str(data),
        registros=registros,
    )


# ---- OpenWeatherMap (qualidade do ar) --------------------------------------

@router.post("/executar-qualidade-ar-sync", response_model=ETLResponse, summary="ETL Qualidade do Ar (OpenWeatherMap)")
def executar_qualidade_ar_sync(
    data: date = Query(default=None, description="Data para ingestão (YYYY-MM-DD). Padrão: hoje."),
    db: Session = Depends(get_db),
):
    """
    Executa o pipeline de qualidade do ar via OpenWeatherMap.
    Requer OPENWEATHER_API_KEY configurada no .env.
    """
    from etl.openweather_etl import executar_pipeline_qualidade_ar

    if data is None:
        data = date.today()

    try:
        registros = executar_pipeline_qualidade_ar(data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno no ETL Qualidade do Ar: {str(e)}",
        )

    return ETLResponse(
        status="concluído",
        mensagem=f"ETL Qualidade do Ar para {data} concluído. Registros: {registros}",
        data=str(data),
        registros=registros,
    )


# ---- NASA FIRMS (focos de calor globais) -----------------------------------

@router.post("/executar-firms-sync", response_model=ETLResponse, summary="ETL NASA FIRMS (focos globais)")
def executar_firms_sync(
    data: date = Query(default=None, description="Data para ingestão (YYYY-MM-DD). Padrão: ontem."),
    db: Session = Depends(get_db),
):
    """
    Executa o pipeline de focos de calor globais via NASA FIRMS (VIIRS/SNPP).
    Requer NASA_FIRMS_MAP_KEY configurada no .env.
    """
    from etl.nasa_firms_etl import executar_pipeline_firms

    if data is None:
        data = date.today() - timedelta(days=1)

    if data > date.today():
        raise HTTPException(status_code=400, detail=f"Data {data} é no futuro.")

    try:
        registros = executar_pipeline_firms(data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno no ETL FIRMS: {str(e)}",
        )

    return ETLResponse(
        status="concluído",
        mensagem=f"ETL FIRMS para {data} concluído. Registros: {registros}",
        data=str(data),
        registros=registros,
    )


# ---- Pipeline Global (todos os ETLs) --------------------------------------

@router.post("/executar-global-sync", response_model=dict, summary="Executar TODOS os ETLs")
def executar_global_sync(
    data: date = Query(default=None, description="Data para ingestão (YYYY-MM-DD). Padrão: ontem."),
    db: Session = Depends(get_db),
):
    """
    Executa todos os pipelines ETL em sequência:
    1. INPE (focos Brasil)
    2. Open-Meteo (clima global)
    3. OpenWeatherMap (qualidade do ar)
    4. NASA FIRMS (focos globais)

    Retorna o resultado de cada pipeline individualmente.
    """
    from etl.loader import executar_pipeline
    from etl.openmeteo_etl import executar_pipeline_clima
    from etl.openweather_etl import executar_pipeline_qualidade_ar
    from etl.nasa_firms_etl import executar_pipeline_firms

    if data is None:
        data = date.today() - timedelta(days=1)

    resultados = {}

    # 1. INPE
    try:
        resultados["inpe"] = {"status": "concluído", "registros": executar_pipeline(data)}
    except Exception as e:
        resultados["inpe"] = {"status": "erro", "detalhe": str(e)}

    # 2. Open-Meteo (clima)
    try:
        resultados["clima"] = {"status": "concluído", "registros": executar_pipeline_clima(data)}
    except Exception as e:
        resultados["clima"] = {"status": "erro", "detalhe": str(e)}

    # 3. OpenWeatherMap (qualidade do ar)
    try:
        resultados["qualidade_ar"] = {"status": "concluído", "registros": executar_pipeline_qualidade_ar(data)}
    except Exception as e:
        resultados["qualidade_ar"] = {"status": "erro", "detalhe": str(e)}

    # 4. NASA FIRMS (focos globais)
    try:
        resultados["firms"] = {"status": "concluído", "registros": executar_pipeline_firms(data)}
    except Exception as e:
        resultados["firms"] = {"status": "erro", "detalhe": str(e)}

    return {
        "data": str(data),
        "pipelines": resultados,
    }

