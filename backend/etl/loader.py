# ============================================================
# AtmosMetrics — etl/loader.py
# Carrega os dados transformados no banco PostgreSQL
# ============================================================

from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.database import SessionLocal
from app.models.dim_tempo import DimTempo
from app.models.dim_satelite import DimSatelite
from app.models.dim_localidade import DimLocalidade
from app.models.fato_anomalia_termica import FatoAnomaliaTermica
from etl.inpe_client import baixar_focos_csv
from etl.transformers import normalizar_dataframe, construir_dim_tempo


# ---- Helpers de Dimensão ---------------------------------------------------

def _get_ou_criar_dim_tempo(db: Session, data: date) -> int:
    """
    Retorna o id_tempo para a data. Cria o registro se não existir.
    """
    registro = db.query(DimTempo).filter(DimTempo.data_completa == data).first()
    if registro:
        return registro.id_tempo

    novo = DimTempo(**construir_dim_tempo(data))
    db.add(novo)
    db.flush()  # gera o id sem commit
    return novo.id_tempo


def _get_ou_criar_satelite(db: Session, nome_satelite: str) -> int:
    """
    Retorna o id_satelite pelo nome. Cria se não existir (satélite desconhecido).
    """
    nome = nome_satelite.strip().upper()
    registro = db.query(DimSatelite).filter(DimSatelite.nome_satelite == nome).first()
    if registro:
        return registro.id_satelite

    novo = DimSatelite(nome_satelite=nome, agencia="Desconhecida")
    db.add(novo)
    db.flush()
    return novo.id_satelite


def _get_ou_criar_localidade(
    db: Session,
    municipio: str,
    uf: str,
    estado: str,
    bioma: str,
    codigo_ibge: str | None = None,
) -> int:
    """
    Retorna id_localidade para o município. Cria se não existir.
    Tenta match por código IBGE primeiro; cai para municipio+uf.
    """
    if codigo_ibge and codigo_ibge.strip():
        registro = (
            db.query(DimLocalidade)
            .filter(DimLocalidade.codigo_ibge == codigo_ibge.strip())
            .first()
        )
        if registro:
            return registro.id_localidade

    # Fallback: match por municipio + uf
    registro = (
        db.query(DimLocalidade)
        .filter(
            DimLocalidade.municipio == municipio,
            DimLocalidade.uf == uf,
        )
        .first()
    )
    if registro:
        return registro.id_localidade

    # Define a região a partir da UF
    REGIAO_POR_UF = {
        "AC": "Norte", "AM": "Norte", "AP": "Norte", "PA": "Norte",
        "RO": "Norte", "RR": "Norte", "TO": "Norte",
        "AL": "Nordeste", "BA": "Nordeste", "CE": "Nordeste", "MA": "Nordeste",
        "PB": "Nordeste", "PE": "Nordeste", "PI": "Nordeste",
        "RN": "Nordeste", "SE": "Nordeste",
        "DF": "Centro-Oeste", "GO": "Centro-Oeste",
        "MS": "Centro-Oeste", "MT": "Centro-Oeste",
        "ES": "Sudeste", "MG": "Sudeste", "RJ": "Sudeste", "SP": "Sudeste",
        "PR": "Sul", "RS": "Sul", "SC": "Sul",
    }
    regiao = REGIAO_POR_UF.get(uf, "Não Identificada")

    novo = DimLocalidade(
        municipio=municipio,
        codigo_ibge=codigo_ibge.strip() if codigo_ibge and codigo_ibge.strip() else None,
        uf=uf,
        estado=estado,
        regiao=regiao,
        bioma=bioma,
    )
    db.add(novo)
    db.flush()
    return novo.id_localidade


# ---- Pipeline Principal ----------------------------------------------------

def executar_pipeline(data: date) -> int:
    """
    Executa o pipeline completo ETL para a data informada:
    1. Download do CSV do INPE
    2. Normalização e transformação
    3. Carga no banco (upsert implícito: ignora duplicatas)

    Returns:
        Número de registros inseridos.
    """
    print(f"\n{'='*60}")
    print(f"[ETL] Iniciando pipeline para {data}")
    print(f"{'='*60}")

    # 1. Download
    df = baixar_focos_csv(data)

    # 2. Transformação
    df = normalizar_dataframe(df)

    if df.empty:
        print(f"[ETL] Nenhum registro válido para {data}. Abortando.")
        return 0

    # 3. Carga no banco
    db = SessionLocal()
    inseridos = 0

    try:
        # Resolve id_tempo (único para toda a data)
        id_tempo = _get_ou_criar_dim_tempo(db, data)

        for _, row in df.iterrows():
            try:
                # Valida UF
                uf = row.get("uf")
                if not uf or str(uf) == "nan":
                    continue  # ignora focos sem estado identificado

                municipio   = str(row.get("municipio", "Não Identificado")).strip()
                estado      = str(row.get("estado", "")).strip()
                bioma       = str(row.get("bioma", "Não Identificado")).strip()
                codigo_ibge = str(row.get("codigo_ibge", "")).strip() or None
                satelite    = str(row.get("satelite", "DESCONHECIDO")).strip()

                id_localidade = _get_ou_criar_localidade(db, municipio, uf, estado, bioma, codigo_ibge)
                id_satelite   = _get_ou_criar_satelite(db, satelite)

                fato = FatoAnomaliaTermica(
                    id_tempo        = id_tempo,
                    id_localidade   = id_localidade,
                    id_satelite     = id_satelite,
                    latitude        = float(row["latitude"]),
                    longitude       = float(row["longitude"]),
                    frp_megawatts   = _safe_float(row.get("frp_megawatts")),
                    risco_fogo      = _safe_float(row.get("risco_fogo")),
                    precipitacao_mm = _safe_float(row.get("precipitacao_mm")),
                    dias_sem_chuva  = _safe_int(row.get("dias_sem_chuva")),
                    hora_utc        = row.get("hora_utc") if row.get("hora_utc") else None,
                )
                db.add(fato)
                inseridos += 1

                # Commit a cada 500 registros (evita transaction muito grande)
                if inseridos % 500 == 0:
                    db.commit()
                    print(f"[ETL] {inseridos} registros inseridos...")

            except Exception as e:
                print(f"[ETL] ⚠️  Erro ao processar linha: {e}")
                continue

        db.commit()
        print(f"\n[ETL] ✅ Pipeline concluído! {inseridos} focos inseridos para {data}.")

    except Exception as e:
        db.rollback()
        print(f"\n[ETL] ❌ Falha crítica no pipeline: {e}")
        raise
    finally:
        db.close()

    return inseridos


# ---- Utilitários -----------------------------------------------------------

def _safe_float(value) -> float | None:
    """Converte para float, retorna None se inválido."""
    try:
        v = float(value)
        return None if v != v else v  # NaN check
    except (TypeError, ValueError):
        return None


def _safe_int(value) -> int | None:
    """Converte para int, retorna None se inválido."""
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None
