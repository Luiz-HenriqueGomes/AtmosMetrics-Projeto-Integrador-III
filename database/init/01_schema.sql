-- ============================================================
-- AtmosMetrics — 01_schema.sql
-- Criação do Star Schema para Monitoramento Socioambiental
-- ============================================================
-- Este script é executado automaticamente pelo Docker na
-- primeira vez que o container é iniciado.
-- ============================================================

-- Habilita a extensão PostGIS (geoespacial) no banco
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- ============================================================
-- DIMENSÃO: dim_tempo
-- Armazena a hierarquia temporal para facilitar análises
-- ============================================================
CREATE TABLE IF NOT EXISTS dim_tempo (
    id_tempo        SERIAL PRIMARY KEY,
    data_completa   DATE        NOT NULL UNIQUE,
    ano             SMALLINT    NOT NULL,
    semestre        SMALLINT    NOT NULL CHECK (semestre IN (1, 2)),
    trimestre       SMALLINT    NOT NULL CHECK (trimestre BETWEEN 1 AND 4),
    mes             SMALLINT    NOT NULL CHECK (mes BETWEEN 1 AND 12),
    nome_mes        VARCHAR(20) NOT NULL,
    semana_do_ano   SMALLINT    NOT NULL CHECK (semana_do_ano BETWEEN 1 AND 53),
    dia             SMALLINT    NOT NULL CHECK (dia BETWEEN 1 AND 31),
    dia_da_semana   SMALLINT    NOT NULL CHECK (dia_da_semana BETWEEN 0 AND 6),
    nome_dia        VARCHAR(15) NOT NULL,
    e_fim_de_semana BOOLEAN     NOT NULL
);

COMMENT ON TABLE dim_tempo IS
    'Dimensão temporal. Cada linha representa um dia único, decomposto em hierarquias para facilitar filtros no dashboard.';

-- ============================================================
-- DIMENSÃO: dim_satelite
-- Registra os satélites usados para detectar focos de calor
-- ============================================================
CREATE TABLE IF NOT EXISTS dim_satelite (
    id_satelite     SERIAL PRIMARY KEY,
    nome_satelite   VARCHAR(50)  NOT NULL UNIQUE,
    agencia         VARCHAR(50),
    descricao       TEXT
);

COMMENT ON TABLE dim_satelite IS
    'Dimensão dos satélites. Identifica a fonte de detecção de cada foco de calor.';

-- ============================================================
-- DIMENSÃO: dim_localidade
-- Hierarquia geográfica: Município → Estado → Região → Bioma
-- ============================================================
CREATE TABLE IF NOT EXISTS dim_localidade (
    id_localidade   SERIAL PRIMARY KEY,
    municipio       VARCHAR(100) NOT NULL,
    codigo_ibge     VARCHAR(7)   UNIQUE, -- Código IBGE do município (7 dígitos)
    uf              CHAR(2)      NOT NULL,
    estado          VARCHAR(50)  NOT NULL,
    regiao          VARCHAR(20)  NOT NULL CHECK (regiao IN ('Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul')),
    bioma           VARCHAR(30)  NOT NULL
);

COMMENT ON TABLE dim_localidade IS
    'Dimensão geográfica. Cada linha é um município, com sua hierarquia regional e bioma para filtros agregados.';

CREATE INDEX IF NOT EXISTS idx_localidade_uf     ON dim_localidade(uf);
CREATE INDEX IF NOT EXISTS idx_localidade_bioma   ON dim_localidade(bioma);
CREATE INDEX IF NOT EXISTS idx_localidade_regiao  ON dim_localidade(regiao);

-- ============================================================
-- TABELA FATO: fato_anomalia_termica
-- Cada linha = um foco de calor detectado por satélite
-- ============================================================
CREATE TABLE IF NOT EXISTS fato_anomalia_termica (
    id_anomalia         BIGSERIAL    PRIMARY KEY,

    -- Chaves Estrangeiras (ligação com as dimensões)
    id_tempo            INT          NOT NULL REFERENCES dim_tempo(id_tempo),
    id_localidade       INT          NOT NULL REFERENCES dim_localidade(id_localidade),
    id_satelite         INT          NOT NULL REFERENCES dim_satelite(id_satelite),

    -- Coordenadas brutas (para compatibilidade)
    latitude            DECIMAL(9,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude           DECIMAL(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),

    -- Coluna geoespacial PostGIS (ponto geográfico)
    -- SRID 4326 = sistema de coordenadas WGS84 (o do GPS)
    geom                GEOMETRY(Point, 4326),

    -- Métricas do foco
    frp_megawatts       DECIMAL(10,2),  -- Fire Radiative Power (Potência do fogo em MW)
    risco_fogo          DECIMAL(5,2),   -- Índice de risco de fogo (0 a 1)
    precipitacao_mm     DECIMAL(7,2),   -- Precipitação acumulada no dia (mm)
    dias_sem_chuva      SMALLINT,       -- Dias consecutivos sem precipitação

    -- Hora UTC da passagem do satélite
    hora_utc            TIME,

    -- Auditoria
    criado_em           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fato_anomalia_termica IS
    'Tabela Fato central. Cada registro é um foco de calor (anomalia térmica) detectado por satélite, com suas métricas associadas.';

COMMENT ON COLUMN fato_anomalia_termica.frp_megawatts IS
    'Fire Radiative Power: estimativa da intensidade do fogo em Megawatts. Quanto maior, mais intenso o incêndio.';

COMMENT ON COLUMN fato_anomalia_termica.geom IS
    'Ponto geoespacial no padrão WGS84 (SRID 4326). Permite consultas espaciais via PostGIS.';

-- Índices para performance nas queries do dashboard
CREATE INDEX IF NOT EXISTS idx_fato_tempo       ON fato_anomalia_termica(id_tempo);
CREATE INDEX IF NOT EXISTS idx_fato_localidade  ON fato_anomalia_termica(id_localidade);
CREATE INDEX IF NOT EXISTS idx_fato_satelite    ON fato_anomalia_termica(id_satelite);
CREATE INDEX IF NOT EXISTS idx_fato_geom        ON fato_anomalia_termica USING GIST(geom);

-- ============================================================
-- FUNÇÃO: atualiza geom automaticamente ao inserir/atualizar
-- (Trigger: mantém a coluna geom sincronizada com lat/lon)
-- ============================================================
CREATE OR REPLACE FUNCTION update_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_update_geom
BEFORE INSERT OR UPDATE OF latitude, longitude
ON fato_anomalia_termica
FOR EACH ROW EXECUTE FUNCTION update_geom();
