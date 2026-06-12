# ============================================================
# AtmosMetrics — etl/openweather_etl.py
# Pipeline ETL para dados de qualidade do ar
# Quando OPENWEATHER_API_KEY está configurada, usa a API real.
# Caso contrário, gera dados simulados baseados em perfis
# regionais realistas (tipo de bioma, industrialização, etc.)
# ============================================================

import hashlib
import math
import httpx
from datetime import date

from app.database import SessionLocal
from app.config import get_settings
from app.models.dim_tempo import DimTempo
from app.models.dim_localidade import DimLocalidade
from app.models.fato_qualidade_ar import FatoQualidadeAr
from etl.transformers import construir_dim_tempo

# URL base da API de poluição atmosférica do OpenWeatherMap
OPENWEATHER_AIR_URL = "http://api.openweathermap.org/data/2.5/air_pollution"

# Timeout para requisições HTTP
REQUEST_TIMEOUT = 30.0

# ============================================================
# Perfis regionais de qualidade do ar (valores médios realistas)
# Baseados em dados reais de 2023-2024 da OMS e IQAir
# ============================================================
PERFIS_REGIONAIS = {
    # Regiões industrializadas / alta poluição
    "alta_poluicao": {
        "aqi_range": (3, 5), "pm2_5": (35, 85), "pm10": (50, 120),
        "co": (800, 2500), "no2": (30, 80), "o3": (40, 100),
        "so2": (15, 50), "no": (10, 40), "nh3": (5, 25),
        "paises": ["China", "Índia", "Egito", "Nigéria", "Paquistão", "Bangladesh"],
    },
    # Grandes metrópoles
    "metropole": {
        "aqi_range": (2, 4), "pm2_5": (15, 45), "pm10": (25, 70),
        "co": (400, 1500), "no2": (20, 55), "o3": (30, 80),
        "so2": (8, 30), "no": (5, 25), "nh3": (3, 15),
        "paises": ["Estados Unidos", "Rússia", "México", "Turquia", "Indonésia"],
    },
    # Regiões com queimadas sazonais
    "queimadas": {
        "aqi_range": (2, 5), "pm2_5": (20, 100), "pm10": (30, 150),
        "co": (500, 3000), "no2": (10, 35), "o3": (50, 120),
        "so2": (5, 20), "no": (3, 15), "nh3": (8, 40),
        "paises": ["Brasil"],
    },
    # Europa / regiões limpas
    "limpo": {
        "aqi_range": (1, 2), "pm2_5": (5, 18), "pm10": (8, 25),
        "co": (150, 500), "no2": (8, 25), "o3": (20, 60),
        "so2": (2, 12), "no": (1, 8), "nh3": (1, 8),
        "paises": [
            "Noruega", "Suécia", "Suíça", "Áustria", "Nova Zelândia",
            "Canadá", "Finlândia", "Islândia", "Dinamarca",
        ],
    },
    # Regiões moderadas
    "moderado": {
        "aqi_range": (2, 3), "pm2_5": (10, 30), "pm10": (15, 45),
        "co": (250, 900), "no2": (12, 40), "o3": (25, 70),
        "so2": (5, 20), "no": (3, 15), "nh3": (2, 12),
        "paises": [],  # fallback para países não listados
    },
}


def _get_perfil(pais: str) -> dict:
    """Retorna o perfil de qualidade do ar para o país."""
    for perfil in PERFIS_REGIONAIS.values():
        if pais in perfil.get("paises", []):
            return perfil
    return PERFIS_REGIONAIS["moderado"]


def _gerar_valor_deterministico(seed: str, min_val: float, max_val: float) -> float:
    """
    Gera um valor numérico deterministico (reprodutível) entre min e max
    usando um hash SHA256 como semente.
    """
    hash_hex = hashlib.sha256(seed.encode()).hexdigest()
    # Usa os primeiros 8 chars do hash como fração [0,1)
    fraction = int(hash_hex[:8], 16) / 0xFFFFFFFF
    return round(min_val + (max_val - min_val) * fraction, 2)


def _gerar_dados_simulados(loc, data: date) -> dict:
    """
    Gera dados de qualidade do ar realistas para a localidade.
    Usa seed determinística (localidade + data) para resultados reproduzíveis.
    """
    pais = loc.pais or ""
    perfil = _get_perfil(pais)
    base_seed = f"{loc.id_localidade}-{data.isoformat()}"

    aqi_min, aqi_max = perfil["aqi_range"]
    aqi = int(_gerar_valor_deterministico(f"{base_seed}-aqi", aqi_min, aqi_max))
    aqi = max(1, min(5, aqi))  # Clamp 1-5

    return {
        "aqi":   aqi,
        "co":    _gerar_valor_deterministico(f"{base_seed}-co",   *perfil["co"]),
        "no":    _gerar_valor_deterministico(f"{base_seed}-no",   *perfil["no"]),
        "no2":   _gerar_valor_deterministico(f"{base_seed}-no2",  *perfil["no2"]),
        "o3":    _gerar_valor_deterministico(f"{base_seed}-o3",   *perfil["o3"]),
        "so2":   _gerar_valor_deterministico(f"{base_seed}-so2",  *perfil["so2"]),
        "pm2_5": _gerar_valor_deterministico(f"{base_seed}-pm25", *perfil["pm2_5"]),
        "pm10":  _gerar_valor_deterministico(f"{base_seed}-pm10", *perfil["pm10"]),
        "nh3":   _gerar_valor_deterministico(f"{base_seed}-nh3",  *perfil["nh3"]),
    }


def _get_ou_criar_dim_tempo(db, data: date) -> int:
    """Retorna o id_tempo para a data. Cria o registro se não existir."""
    registro = db.query(DimTempo).filter(DimTempo.data_completa == data).first()
    if registro:
        return registro.id_tempo

    novo = DimTempo(**construir_dim_tempo(data))
    db.add(novo)
    db.flush()
    return novo.id_tempo


def _buscar_qualidade_ar(lat: float, lon: float, api_key: str) -> dict | None:
    """
    Consulta a API OpenWeatherMap Air Pollution para a localidade.
    Retorna dicionário com os componentes ou None se falhar.
    """
    params = {
        "lat": lat,
        "lon": lon,
        "appid": api_key,
    }

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
            response = client.get(OPENWEATHER_AIR_URL, params=params)
            response.raise_for_status()

        dados = response.json()
        lista = dados.get("list", [])

        if not lista:
            return None

        item = lista[0]
        main = item.get("main", {})
        components = item.get("components", {})

        return {
            "aqi":   main.get("aqi"),
            "co":    _safe_val(components.get("co")),
            "no":    _safe_val(components.get("no")),
            "no2":   _safe_val(components.get("no2")),
            "o3":    _safe_val(components.get("o3")),
            "so2":   _safe_val(components.get("so2")),
            "pm2_5": _safe_val(components.get("pm2_5")),
            "pm10":  _safe_val(components.get("pm10")),
            "nh3":   _safe_val(components.get("nh3")),
        }

    except Exception as e:
        print(f"[ETL-QualidadeAr] ⚠️  Erro ao buscar dados para ({lat}, {lon}): {e}")
        return None


def executar_pipeline_qualidade_ar(data: date) -> int:
    """
    Executa o pipeline ETL de qualidade do ar para a data informada.
    - Com API key: consulta OpenWeatherMap para dados reais
    - Sem API key: gera dados simulados baseados em perfis regionais

    Returns:
        Número de registros inseridos.
    """
    settings = get_settings()
    api_key = settings.openweather_api_key
    usar_simulacao = not api_key

    if usar_simulacao:
        print("[ETL-QualidadeAr] ℹ️  API key não configurada. Usando dados simulados (perfis regionais).")
    
    print(f"\n{'='*60}")
    print(f"[ETL-QualidadeAr] Iniciando pipeline para {data}")
    print(f"{'='*60}")

    db = SessionLocal()
    inseridos = 0

    try:
        # Busca localidades com coordenadas de referência
        localidades = (
            db.query(DimLocalidade)
            .filter(
                DimLocalidade.latitude_ref.isnot(None),
                DimLocalidade.longitude_ref.isnot(None),
            )
            .all()
        )

        if not localidades:
            print("[ETL-QualidadeAr] Nenhuma localidade com coordenadas encontrada.")
            return 0

        print(f"[ETL-QualidadeAr] {len(localidades)} localidades para processar.")

        # Resolve id_tempo
        id_tempo = _get_ou_criar_dim_tempo(db, data)

        for loc in localidades:
            try:
                # Verifica se já existe registro para esta localidade/data
                existe = (
                    db.query(FatoQualidadeAr)
                    .filter(
                        FatoQualidadeAr.id_tempo == id_tempo,
                        FatoQualidadeAr.id_localidade == loc.id_localidade,
                    )
                    .first()
                )
                if existe:
                    continue

                # Obtém dados: API real ou simulação
                if usar_simulacao:
                    qualidade = _gerar_dados_simulados(loc, data)
                else:
                    qualidade = _buscar_qualidade_ar(
                        float(loc.latitude_ref),
                        float(loc.longitude_ref),
                        api_key,
                    )

                if not qualidade:
                    continue

                fato = FatoQualidadeAr(
                    id_tempo=id_tempo,
                    id_localidade=loc.id_localidade,
                    **qualidade,
                )
                db.add(fato)
                inseridos += 1

                # Commit a cada 50 registros
                if inseridos % 50 == 0:
                    db.commit()
                    print(f"[ETL-QualidadeAr] {inseridos} registros inseridos...")

            except Exception as e:
                print(f"[ETL-QualidadeAr] ⚠️  Erro ao processar {loc.municipio}: {e}")
                continue

        db.commit()
        modo = "simulados" if usar_simulacao else "reais (OpenWeatherMap)"
        print(f"\n[ETL-QualidadeAr] ✅ Pipeline concluído! {inseridos} registros ({modo}) para {data}.")

    except Exception as e:
        db.rollback()
        print(f"\n[ETL-QualidadeAr] ❌ Falha crítica no pipeline: {e}")
        raise
    finally:
        db.close()

    return inseridos


# ---- Utilitários -----------------------------------------------------------

def _safe_val(value) -> float | None:
    """Converte para float, retorna None se inválido."""
    try:
        if value is None:
            return None
        v = float(value)
        return None if v != v else v
    except (TypeError, ValueError):
        return None
