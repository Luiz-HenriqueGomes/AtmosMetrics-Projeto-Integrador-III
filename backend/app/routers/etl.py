# ============================================================
# AtmosMetrics — routers/etl.py
# Endpoints: /api/v1/etl
# Disparo manual da ingestão de dados do INPE
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


@router.post("/executar", response_model=ETLResponse, summary="Executar ETL para uma data")
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
    # Importa aqui para evitar import circular no startup
    from etl.loader import executar_pipeline

    if data is None:
        data = date.today() - timedelta(days=1)

    # Valida que não é uma data futura
    if data > date.today():
        raise HTTPException(
            status_code=400,
            detail=f"Data {data} é no futuro. Use uma data passada.",
        )

    background_tasks.add_task(executar_pipeline, data)

    return ETLResponse(
        status="iniciado",
        mensagem=f"ETL para {data} iniciado em background. Verifique os logs do container.",
        data=str(data),
    )


@router.post("/executar-sync", response_model=ETLResponse, summary="ETL síncrono (aguarda resultado)")
def executar_etl_sync(
    data: date = Query(default=None, description="Data para ingestão (YYYY-MM-DD). Padrão: ontem."),
    db: Session = Depends(get_db),
):
    """
    Igual ao /executar, mas aguarda o processamento terminar antes de responder.
    Útil para testes e validação. Não use em produção para datas com muitos registros.
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
            detail=f"Erro interno no ETL: {str(e)}",
        )

    return ETLResponse(
        status="concluído",
        mensagem=f"ETL para {data} concluído com sucesso.",
        data=str(data),
        registros=registros,
    )
