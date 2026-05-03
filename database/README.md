# AtmosMetrics — Database

## Visão Geral

O banco de dados do AtmosMetrics utiliza o modelo **Star Schema** no **PostgreSQL 16** com a extensão **PostGIS 3.4** para suporte a dados geoespaciais.

## Arquitetura: Star Schema

```
             ┌──────────────┐
             │  dim_tempo   │
             │  (Quando?)   │
             └──────┬───────┘
                    │ FK
┌──────────────┐    │    ┌─────────────────────────┐
│ dim_satelite │────┼────│   fato_anomalia_termica  │
│  (Quem?)     │  FK│ FK │  (O foco de calor!)     │
└──────────────┘    │    └─────────────────────────┘
                    │ FK
             ┌──────┴────────┐
             │ dim_localidade│
             │   (Onde?)    │
             └───────────────┘
```

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e em execução

## Como Usar

### 1. Configure as variáveis de ambiente
Copie o arquivo de exemplo e edite com suas credenciais:
```bash
# O arquivo .env já vem com valores padrão para desenvolvimento
# NÃO envie o .env para o GitHub!
```

### 2. Suba o banco de dados
```bash
docker-compose up -d
```
O Docker irá:
- Baixar a imagem `postgis/postgis:16-3.4-alpine`
- Criar o container `atmosmetrics_db`
- Executar os scripts em `database/init/` automaticamente

### 3. Verifique se está rodando
```bash
docker-compose ps
docker-compose logs db
```

### 4. Acesse o banco
```bash
docker-compose exec db psql -U atmos_user -d atmosmetrics
```

## Scripts de Inicialização

| Arquivo | Descrição |
|---|---|
| `01_schema.sql` | Cria todas as tabelas, índices e triggers |
| `02_populate.sql` | Pré-popula dimensões com dados estáticos do Brasil |

## Tabelas

| Tabela | Tipo | Descrição |
|---|---|---|
| `dim_tempo` | Dimensão | Hierarquia temporal (dia/mês/ano/trimestre) |
| `dim_satelite` | Dimensão | Catálogo de satélites do INPE |
| `dim_localidade` | Dimensão | Municípios, estados, regiões e biomas |
| `fato_anomalia_termica` | Fato | Registros de focos de calor |

## Parar o Banco
```bash
docker-compose down          # Para e remove os containers (dados persistem)
docker-compose down -v       # ⚠️ Para E APAGA todos os dados!
```
