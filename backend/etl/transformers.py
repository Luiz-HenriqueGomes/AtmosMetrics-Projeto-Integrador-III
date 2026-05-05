# ============================================================
# AtmosMetrics — etl/transformers.py
# Limpeza e transformação dos dados brutos do INPE
# para o formato do Star Schema
# ============================================================

import pandas as pd
from datetime import date, datetime
from typing import Optional

# ---- Mapeamentos -----------------------------------------------------------

# Mapeia o nome do estado (como vem do INPE) para a UF de 2 letras
ESTADO_PARA_UF: dict[str, str] = {
    "Acre": "AC", "Amazonas": "AM", "Amapá": "AP", "Pará": "PA",
    "Rondônia": "RO", "Roraima": "RR", "Tocantins": "TO",
    "Alagoas": "AL", "Bahia": "BA", "Ceará": "CE", "Maranhão": "MA",
    "Paraíba": "PB", "Pernambuco": "PE", "Piauí": "PI",
    "Rio Grande do Norte": "RN", "Sergipe": "SE",
    "Distrito Federal": "DF", "Goiás": "GO",
    "Mato Grosso do Sul": "MS", "Mato Grosso": "MT",
    "Espírito Santo": "ES", "Minas Gerais": "MG",
    "Rio de Janeiro": "RJ", "São Paulo": "SP",
    "Paraná": "PR", "Rio Grande do Sul": "RS", "Santa Catarina": "SC",
}

# Nomes dos meses em português
MESES_PT: dict[int, str] = {
    1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
    5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
    9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro",
}

# Nomes dos dias em português (weekday(): 0=Segunda, 6=Domingo)
DIAS_PT: dict[int, str] = {
    0: "Segunda-feira", 1: "Terça-feira", 2: "Quarta-feira",
    3: "Quinta-feira", 4: "Sexta-feira", 5: "Sábado", 6: "Domingo",
}

# Colunas esperadas no CSV do INPE e seus alias internos
# Atualizado em abr/2026: precipitacao_dia → precipitacao
COLUNAS_INPE: dict[str, str] = {
    "lat":                    "latitude",
    "lon":                    "longitude",
    "data_hora_gmt":          "data_hora_gmt",
    "satelite":               "satelite",
    "municipio":              "municipio",
    "estado":                 "estado",
    "bioma":                  "bioma",
    "municipio_id":           "codigo_ibge",
    "frp":                    "frp_megawatts",
    "risco_fogo":             "risco_fogo",
    "precipitacao":           "precipitacao_mm",   # nome atualizado pelo INPE
    "precipitacao_dia":       "precipitacao_mm",   # nome antigo (compatibilidade)
    "numero_dias_sem_chuva":  "dias_sem_chuva",
}


# ---- Funções ----------------------------------------------------------------

def normalizar_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Renomeia, limpa e tipifica as colunas do CSV bruto do INPE.

    Returns:
        DataFrame normalizado com as colunas internas do projeto.
    """
    # Normaliza os nomes de coluna (minúsculas, sem espaços)
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    # Seleciona apenas colunas que existem no CSV (versões diferentes podem variar)
    mapeamento_disponivel = {
        k: v for k, v in COLUNAS_INPE.items() if k in df.columns
    }
    df = df.rename(columns=mapeamento_disponivel)

    # Mantém apenas colunas que temos mapeado
    colunas_internas = list(mapeamento_disponivel.values())
    df = df[[c for c in colunas_internas if c in df.columns]].copy()

    # Converte tipos
    df["latitude"]  = pd.to_numeric(df["latitude"],  errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")

    if "frp_megawatts" in df.columns:
        df["frp_megawatts"] = pd.to_numeric(df["frp_megawatts"], errors="coerce")
    if "risco_fogo" in df.columns:
        df["risco_fogo"] = pd.to_numeric(df["risco_fogo"], errors="coerce")
    if "precipitacao_mm" in df.columns:
        df["precipitacao_mm"] = pd.to_numeric(df["precipitacao_mm"], errors="coerce")
    if "dias_sem_chuva" in df.columns:
        df["dias_sem_chuva"] = pd.to_numeric(df["dias_sem_chuva"], errors="coerce").astype("Int64")

    # Extrai data e hora da coluna data_hora_gmt
    if "data_hora_gmt" in df.columns:
        dt_parsed = pd.to_datetime(df["data_hora_gmt"], errors="coerce")
        df["data_foco"] = dt_parsed.dt.date
        df["hora_utc"]  = dt_parsed.dt.time
    else:
        df["data_foco"] = None
        df["hora_utc"]  = None

    # Mapeia estado → UF (INPE envia nomes em maiúsculas desde abr/2026)
    if "estado" in df.columns:
        # Cria mapa case-insensitive: chave em título (Title Case)
        mapa_ci = {k.upper(): v for k, v in ESTADO_PARA_UF.items()}
        df["uf"] = df["estado"].str.strip().str.upper().map(mapa_ci)
    else:
        df["uf"] = None

    # Remove linhas sem lat/lon válidos (dados corrompidos)
    df = df.dropna(subset=["latitude", "longitude"])

    print(f"[ETL] Normalização concluída: {len(df)} registros válidos.")
    return df


def construir_dim_tempo(data: date) -> dict:
    """
    Constrói o dicionário de atributos para um registro de dim_tempo a partir de uma data.
    Utilizado pelo loader para inserir/buscar a data na dimensão temporal.
    """
    dt = datetime.combine(data, datetime.min.time())
    dia_semana = dt.weekday()  # 0=Segunda, 6=Domingo
    return {
        "data_completa":  data,
        "ano":            data.year,
        "semestre":       1 if data.month <= 6 else 2,
        "trimestre":      (data.month - 1) // 3 + 1,
        "mes":            data.month,
        "nome_mes":       MESES_PT[data.month],
        "semana_do_ano":  int(data.strftime("%W")),
        "dia":            data.day,
        "dia_da_semana":  dia_semana,
        "nome_dia":       DIAS_PT[dia_semana],
        "e_fim_de_semana": dia_semana >= 5,
    }
