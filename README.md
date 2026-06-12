# 🌍 AtmosMetrics — Monitoramento Socioambiental Global

> Plataforma analítica para monitoramento de focos de calor, clima global e qualidade do ar em tempo real, construída com arquitetura conteinerizada (Docker).

---

## 📋 Sobre o Projeto

O **AtmosMetrics** é um sistema web que integra dados de múltiplas fontes ambientais e os apresenta em um dashboard interativo com mapas, rankings e métricas em tempo real.

### Fontes de Dados
| Fonte | Dados | Cobertura |
|-------|-------|-----------|
| **INPE** | Focos de calor (queimadas) | Brasil — por estado |
| **Open-Meteo** | Temperatura, umidade, vento | Global — capitais e cidades principais |
| **OpenWeatherMap** | Qualidade do ar (AQI, PM2.5, PM10) | Global |

### Funcionalidades
- **Dashboard Principal** — Mapa interativo com focos de calor por estado (Brasil) e clima por país (mundo), com rankings e KPIs
- **Temperaturas Extremas** — Listagem filtrada de ondas de calor e frio extremo globais, com exportação para PDF e CSV
- **Qualidade do Ar** — Monitoramento de AQI com mapa de partículas de vento e ranking por país
- **Localidades** — Exploração de todas as localidades monitoradas com filtros por continente e país
- **Satélites** — Informações dos satélites que alimentam os dados de queimadas
- **Configurações** — Execução manual dos pipelines de ETL e gerenciamento do sistema

---

## 🏛️ Arquitetura

O projeto utiliza **Docker Compose** para orquestrar 4 contêineres:

```
┌──────────────────────────────────────────────────┐
│                 Docker Compose                    │
│                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │  Frontend    │  │  Backend    │  │  pgAdmin   │ │
│  │  React/Vite  │  │  FastAPI    │  │  Painel DB │ │
│  │  :5173       │  │  :8000      │  │  :8080     │ │
│  └──────┬───────┘  └──────┬──────┘  └─────┬─────┘ │
│         │                 │               │       │
│         │        ┌────────┴────────┐      │       │
│         └───────►│   PostgreSQL    │◄─────┘       │
│                  │   + PostGIS     │              │
│                  │   :5432         │              │
│                  └─────────────────┘              │
└──────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | React 19, TypeScript, Vite, Leaflet (mapas), Recharts (gráficos), Framer Motion |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy, httpx (requisições assíncronas) |
| **Banco de Dados** | PostgreSQL 16 + PostGIS 3.4 |
| **Infraestrutura** | Docker, Docker Compose |
| **Administração** | pgAdmin 4 |

---

## 🚀 Como Executar

### Pré-requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando
- [Git](https://git-scm.com/) instalado

### Passo a Passo

**1. Clone o repositório:**
```bash
git clone https://github.com/Luiz-HenriqueGomes/AtmosMetrics-Projeto-Integrador-III.git
cd AtmosMetrics-Projeto-Integrador-III
```

**2. Crie o arquivo `.env` na raiz do projeto:**
```env
# PostgreSQL
POSTGRES_DB=atmosmetrics
POSTGRES_USER=atmos_user
POSTGRES_PASSWORD=atmos_dev_secure123
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# pgAdmin
PGADMIN_DEFAULT_EMAIL=admin@atmosmetrics.com
PGADMIN_DEFAULT_PASSWORD=admin
```

**3. Suba os contêineres:**
```bash
docker compose up -d --build
```

**4. Aguarde todos os serviços ficarem saudáveis** (aprox. 1-2 minutos na primeira vez):
```bash
docker compose ps
```
Todos os contêineres devem estar com status `Up` ou `Healthy`.

**5. Carregue os dados executando os pipelines de ETL:**
```bash
# Focos de calor do INPE (Brasil)
curl -X POST http://localhost:8000/api/v1/etl/executar-sync

# Dados climáticos globais (Open-Meteo)
curl -X POST http://localhost:8000/api/v1/etl/executar-clima-sync
```

**6. Acesse a aplicação:**

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| **Frontend (Dashboard)** | http://localhost:5173 | — |
| **Backend (API Swagger)** | http://localhost:8000/docs | — |
| **pgAdmin** | http://localhost:8080 | `admin@atmosmetrics.com` / `admin` |

---

## 📁 Estrutura do Projeto

```
AtmosMetrics-Projeto-Integrador-III/
├── docker-compose.yml          # Orquestração dos 4 contêineres
├── .env                        # Variáveis de ambiente (não versionado)
├── .gitignore
├── Documentação.pdf            # Documentação acadêmica completa
│
├── backend/                    # API REST + Pipelines de ETL
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # Entry point do FastAPI
│       ├── database.py         # Conexão com PostgreSQL
│       ├── config.py           # Configurações do ambiente
│       ├── models/             # Modelos SQLAlchemy (ORM)
│       ├── routers/            # Rotas da API REST
│       ├── schemas/            # Schemas Pydantic (validação)
│       └── etl/                # Pipelines de ingestão de dados
│
├── frontend/                   # Interface React/TypeScript
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── App.tsx             # Componente raiz + roteamento
│       ├── pages/              # Páginas do dashboard
│       ├── components/         # Componentes reutilizáveis
│       └── services/api.ts     # Camada de comunicação com o backend
│
└── database/
    └── init/                   # Scripts SQL de inicialização
        ├── 01_schema.sql       # Criação das tabelas (Star Schema)
        └── 02_populate.sql     # Dados iniciais (satélites, localidades)
```

---

## 🔌 Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/` | Health check e status da API |
| `GET` | `/api/v1/anomalias/` | Listar focos de calor com filtros |
| `GET` | `/api/v1/anomalias/resumo` | Resumo agregado (por UF, bioma, país) |
| `GET` | `/api/v1/clima/` | Dados climáticos globais |
| `GET` | `/api/v1/clima/resumo` | Resumo climático global |
| `GET` | `/api/v1/clima/extremas` | Temperaturas extremas filtradas |
| `GET` | `/api/v1/qualidade-ar/` | Dados de qualidade do ar |
| `GET` | `/api/v1/localidades/` | Todas as localidades monitoradas |
| `GET` | `/api/v1/satelites/` | Satélites cadastrados |
| `POST` | `/api/v1/etl/executar-sync` | Executar ETL do INPE |
| `POST` | `/api/v1/etl/executar-clima-sync` | Executar ETL de clima |
| `POST` | `/api/v1/etl/executar-global-sync` | Executar todos os ETLs |

Documentação interativa completa disponível em: `http://localhost:8000/docs`

---

## 🛑 Comandos Úteis

```bash
# Parar todos os contêineres
docker compose down

# Parar e remover volumes (reset completo do banco)
docker compose down -v

# Ver logs do backend em tempo real
docker compose logs -f backend

# Acessar o banco de dados via terminal
docker compose exec db psql -U atmos_user -d atmosmetrics

# Reconstruir após alterações no código
docker compose up -d --build
```

---

## 👥 Equipe

Desenvolvido como projeto acadêmico de **Projeto Integrador III** — FAESA.

---
