-- ============================================================
-- AtmosMetrics — 02_populate.sql
-- Pré-população das Tabelas Dimensão
-- ============================================================
-- Este script é executado após o 01_schema.sql pelo Docker.
-- ============================================================

-- ============================================================
-- SATÉLITES DO INPE (Programa Queimadas)
-- ============================================================
INSERT INTO dim_satelite (nome_satelite, agencia, descricao) VALUES
    ('AQUA_M-T',    'NASA/INPE', 'Satélite AQUA - sensor MODIS (passagem matutina). Referência histórica do INPE.'),
    ('AQUA_M-M',    'NASA/INPE', 'Satélite AQUA - sensor MODIS (passagem noturna).'),
    ('TERRA_M-T',   'NASA/INPE', 'Satélite TERRA - sensor MODIS (passagem matutina).'),
    ('TERRA_M-M',   'NASA/INPE', 'Satélite TERRA - sensor MODIS (passagem noturna).'),
    ('GOES-16',     'NOAA',      'Satélite geoestacionário GOES-16. Cobertura contínua das Américas.'),
    ('GOES-13',     'NOAA',      'Satélite geoestacionário GOES-13 (legado).'),
    ('NOAA-20',     'NOAA/NASA', 'Satélite NOAA-20 com sensor VIIRS. Alta resolução (375m).'),
    ('NOAA-21',     'NOAA/NASA', 'Satélite NOAA-21 com sensor VIIRS.'),
    ('NPP-375D',    'NASA',      'Satélite Suomi NPP com sensor VIIRS (detecção diurna 375m).'),
    ('NPP-375N',    'NASA',      'Satélite Suomi NPP com sensor VIIRS (detecção noturna 375m).'),
    ('MSG-03',      'EUMETSAT',  'Satélite Meteosat Third Generation da agência europeia EUMETSAT.'),
    ('METOP-B',     'EUMETSAT',  'Satélite MetOp-B polar com sensor AVHRR.'),
    ('METOP-C',     'EUMETSAT',  'Satélite MetOp-C polar com sensor AVHRR.')
ON CONFLICT (nome_satelite) DO NOTHING;

-- ============================================================
-- ESTADOS BRASILEIROS + REGIÕES
-- (Usados para pré-popular dim_localidade com dados de biomas)
-- Nota: a lista completa de municípios virá via ETL.
-- Aqui inserimos um registro por estado como "placeholder",
-- para garantir que consultas por UF funcionem de imediato.
-- ============================================================

-- Usamos uma tabela temporária para organizar o seed
CREATE TEMP TABLE temp_estados (
    uf      CHAR(2),
    estado  VARCHAR(50),
    regiao  VARCHAR(20),
    bioma   VARCHAR(30)  -- Bioma predominante do estado
);

INSERT INTO temp_estados VALUES
-- NORTE
('AC', 'Acre',            'Norte',        'Amazônia'),
('AM', 'Amazonas',        'Norte',        'Amazônia'),
('AP', 'Amapá',           'Norte',        'Amazônia'),
('PA', 'Pará',            'Norte',        'Amazônia'),
('RO', 'Rondônia',        'Norte',        'Amazônia'),
('RR', 'Roraima',         'Norte',        'Amazônia'),
('TO', 'Tocantins',       'Norte',        'Cerrado'),
-- NORDESTE
('AL', 'Alagoas',         'Nordeste',     'Caatinga'),
('BA', 'Bahia',           'Nordeste',     'Caatinga'),
('CE', 'Ceará',           'Nordeste',     'Caatinga'),
('MA', 'Maranhão',        'Nordeste',     'Cerrado'),
('PB', 'Paraíba',         'Nordeste',     'Caatinga'),
('PE', 'Pernambuco',      'Nordeste',     'Caatinga'),
('PI', 'Piauí',           'Nordeste',     'Caatinga'),
('RN', 'Rio Grande do Norte', 'Nordeste', 'Caatinga'),
('SE', 'Sergipe',         'Nordeste',     'Caatinga'),
-- CENTRO-OESTE
('DF', 'Distrito Federal','Centro-Oeste', 'Cerrado'),
('GO', 'Goiás',           'Centro-Oeste', 'Cerrado'),
('MS', 'Mato Grosso do Sul','Centro-Oeste','Pantanal'),
('MT', 'Mato Grosso',     'Centro-Oeste', 'Cerrado'),
-- SUDESTE
('ES', 'Espírito Santo',  'Sudeste',      'Mata Atlântica'),
('MG', 'Minas Gerais',    'Sudeste',      'Cerrado'),
('RJ', 'Rio de Janeiro',  'Sudeste',      'Mata Atlântica'),
('SP', 'São Paulo',       'Sudeste',      'Mata Atlântica'),
-- SUL
('PR', 'Paraná',          'Sul',          'Mata Atlântica'),
('RS', 'Rio Grande do Sul','Sul',         'Pampa'),
('SC', 'Santa Catarina',  'Sul',          'Mata Atlântica');

-- Insere um registro de localidade genérico por estado
-- (município = 'N/I' = Não Identificado). O ETL vai inserir os reais.
INSERT INTO dim_localidade (municipio, uf, estado, regiao, bioma)
SELECT
    'Não Identificado' AS municipio,
    uf, estado, regiao, bioma
FROM temp_estados
ON CONFLICT DO NOTHING;

DROP TABLE temp_estados;

-- ============================================================
-- Mensagem de confirmação
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ AtmosMetrics: Dimensões pré-populadas com sucesso!';
    RAISE NOTICE '   Satélites carregados: %', (SELECT COUNT(*) FROM dim_satelite);
    RAISE NOTICE '   Localidades base carregadas: %', (SELECT COUNT(*) FROM dim_localidade);
END $$;
