# ============================================================
# AtmosMetrics — etl/inpe_client.py
# Download dos CSVs diários de focos de calor do INPE
# ============================================================

import httpx
import pandas as pd
from datetime import date
from io import StringIO

# URL base da API pública do INPE (Programa Queimadas)
# Formato atual do arquivo: focos_diario_br_YYYYMMDD.csv (atualizado em abr/2026)
INPE_BASE_URL = (
    "https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/diario/Brasil/"
    "focos_diario_br_{data}.csv"
)

# Timeout generoso: os arquivos do INPE podem ser grandes (>50k linhas)
REQUEST_TIMEOUT = 120.0


def baixar_focos_csv(data: date) -> pd.DataFrame:
    """
    Baixa o CSV de focos de calor do INPE para a data informada.

    Args:
        data: Data de referência.

    Returns:
        DataFrame com os dados brutos do INPE.

    Raises:
        ValueError: Se o arquivo não existir para a data informada.
        httpx.HTTPError: Se houver falha na requisição.
    """
    data_str = data.strftime("%Y%m%d")
    url = INPE_BASE_URL.format(data=data_str)

    print(f"[ETL] Baixando focos de {data} → {url}")

    with httpx.Client(timeout=REQUEST_TIMEOUT, follow_redirects=True) as client:
        response = client.get(url)

        if response.status_code == 404:
            raise ValueError(
                f"Dados não disponíveis no INPE para a data {data}. "
                f"O INPE geralmente disponibiliza os dados com 1-2 dias de atraso."
            )

        response.raise_for_status()

    # Lê o CSV direto da memória (sem salvar em disco)
    conteudo = response.text

    if not conteudo.strip():
        raise ValueError(f"CSV vazio retornado pelo INPE para a data {data}.")

    df = pd.read_csv(StringIO(conteudo), dtype=str)

    print(f"[ETL] Download concluído: {len(df)} registros brutos.")
    return df


def get_colunas_csv(df: pd.DataFrame) -> list[str]:
    """Retorna as colunas disponíveis no CSV (útil para debug)."""
    return df.columns.tolist()
