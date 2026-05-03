# AtmosMetrics

> Sistema de monitoramento socioambiental com dados do INPE — Projeto Dev Web II

## 📌 Status Atual

**Fase 1 — Banco de Dados: ✅ CONCLUÍDA**

**Fases 2 e 3 — ETL e Backend API: ✅ CONCLUÍDAS**

**Fase 4 — Frontend / Dashboard: ✅ CONCLUÍDA**

**Próxima etapa → Fase 5: Páginas internas (Focos de Calor, Localidades, Satélites)**

---

## 🎯 Sobre o Projeto

O **AtmosMetrics** é uma plataforma web para centralizar, processar e visualizar dados críticos de monitoramento ambiental do Brasil, com foco inicial em **focos de calor (queimadas)** fornecidos pelo INPE.

**Fontes de dados:**
- **INPE / Programa Queimadas** → focos de calor detectados por satélite
- **IBGE** → dados geográficos e socioeconômicos

**Stack utilizada:**
- **Banco de dados:** PostgreSQL 16 + PostGIS 3.4 (via Docker)
- **ETL e Backend:** Python + FastAPI + SQLAlchemy + Pydantic
- **Frontend / Dashboard:** React 19 + TypeScript + Vite + Recharts

---

## 🏗️ Arquitetura do Banco de Dados (Star Schema)

```
             ┌──────────────┐
             │  dim_tempo   │
             │  (Quando?)   │
             └──────┬───────┘
                    │ FK
┌──────────────┐    │    ┌──────────────────────────┐
│ dim_satelite │────┼────│  fato_anomalia_termica   │
│  (Quem?)     │  FK│ FK │  (O foco de calor!)      │
└──────────────┘    │    └──────────────────────────┘
                    │ FK
             ┌──────┴────────┐
             │dim_localidade │
             │   (Onde?)     │
             └───────────────┘
```

### Tabelas criadas

| Tabela | Tipo | Descrição |
|---|---|---|
| `dim_tempo` | Dimensão | Hierarquia temporal (dia/mês/ano/trimestre/semestre) |
| `dim_satelite` | Dimensão | 13 satélites do INPE pré-cadastrados |
| `dim_localidade` | Dimensão | 27 estados + biomas + regiões pré-cadastrados |
| `fato_anomalia_termica` | Fato | Registros de focos de calor com coordenadas PostGIS |

---

## 🚀 Setup — Nova Máquina

### Pré-requisitos
- [ ] [Git](https://git-scm.com/downloads) instalado
- [ ] [Docker Desktop](https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe) instalado e rodando
- [ ] [Node.js 20+](https://nodejs.org/) instalado (para rodar o frontend)

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/Luiz-HenriqueGomes/AtmosMetrics-Dev-Web-II.git AtmosMetrics
cd AtmosMetrics

# 2. Configure o Git
git config --global user.name "Luiz-HenriqueGomes"
git config --global user.email "luiz12henrique21@gmail.com"

# 3. Crie o arquivo .env com as credenciais
# Crie manualmente o arquivo .env na raiz do projeto com o conteúdo:
# POSTGRES_DB=atmos_db
# POSTGRES_USER=atmos_user
# POSTGRES_PASSWORD=atmos_dev_secure123
# PGADMIN_EMAIL=admin@atmosmetrics.com
# PGADMIN_PASSWORD=admin123

# 4. Suba o banco de dados e a API (via Docker)
docker compose up -d --build

# 5. Instale as dependências do frontend
cd frontend
npm install

# 6. Rode o frontend (em outro terminal)
npm run dev
```

**Resultado esperado:**
- API disponível em: http://localhost:8000/docs (Swagger UI)
- Dashboard disponível em: http://localhost:5173

### Popular o banco com dados do INPE

Após subir os serviços, acesse http://localhost:8000/docs, encontre o endpoint `POST /api/v1/etl/executar-sync`, clique em **Try it out** → **Execute**. O ETL baixará os dados de focos de calor do INPE automaticamente.

---

## 📋 Roadmap do Projeto

### Fase 1 — Banco de Dados ✅
- [x] Modelagem Star Schema com PostGIS
- [x] Docker Compose para PostgreSQL 16
- [x] Pré-população: 27 estados brasileiros + 13 satélites INPE
- [x] Índices espaciais e trigger automático de geom

### Fase 2 — ETL ✅
- [x] Script Python para consumir arquivos diários do INPE (focos de calor)
- [x] Transformação das strings, lat/lon e extração de data/hora
- [x] Carga Upsert na `fato_anomalia_termica`, `dim_tempo`, `dim_localidade` e `dim_satelite`
- [x] Endpoint de disparo manual configurado (`/api/v1/etl/executar-sync`)

### Fase 3 — Backend / API ✅
- [x] Configuração FastAPI no Docker com hot-reload
- [x] Conexão com o PostGIS via GeoAlchemy2
- [x] Modelos ORM e Schemas Pydantic mapeando o Star Schema
- [x] Endpoint de Anomalias com paginação e filtros (data, uf, bioma, satélite)
- [x] Endpoint de Resumos e Agregadores para o Dashboard

### Fase 4 — Frontend / Dashboard ✅
- [x] Setup React 19 + TypeScript + Vite
- [x] Design system Dark Mode com Glassmorphism (paleta ambiental exclusiva)
- [x] Tipografia Inter + gradientes atmosféricos + scrollbar customizada
- [x] Sidebar de navegação com indicador de status da API em tempo real
- [x] StatCards animados (shimmer loading + hover flutuante)
- [x] Gráfico de barras: focos por bioma (Recharts)
- [x] Gráfico de barras: top estados por quantidade de focos (Recharts)
- [x] Ranking completo de estados com barra de progresso animada
- [x] Integração real com a API FastAPI (`/api/v1/anomalias/resumo`)
- [x] Correção do ETL: novo padrão de nome de arquivo do INPE (`focos_diario_br_`)
- [x] Correção do ETL: mapeamento de estados em maiúsculas

### Fase 5 — Páginas Internas 🔜
- [ ] Página "Focos de Calor" — tabela paginada e filtrável
- [ ] Página "Localidades" — estados e biomas com contagem de focos
- [ ] Página "Satélites" — lista dos satélites do INPE
- [ ] Página "Configurações" — painel de disparo do ETL

---

## 📁 Estrutura do Projeto

```
AtmosMetrics/
├── .env                        # Variáveis de ambiente (NÃO está no GitHub)
├── .gitignore                  # .env e node_modules protegidos
├── docker-compose.yml          # PostgreSQL 16 + Backend API
├── README.md                   # Este arquivo
├── backend/
│   ├── app/                    # Rotas, modelos ORM, schemas (FastAPI)
│   ├── etl/                    # Scripts de ingestão de dados do INPE
│   ├── Dockerfile              # Imagem do servidor web (API)
│   └── requirements.txt        # Dependências Python
├── frontend/
│   ├── src/
│   │   ├── components/         # Sidebar, StatCard
│   │   ├── pages/              # DashboardPage (e futuras)
│   │   ├── services/           # api.ts — camada de comunicação com o backend
│   │   ├── App.tsx             # Roteamento e layout raiz
│   │   └── index.css           # Design system global
│   ├── package.json
│   └── vite.config.ts
└── database/
    ├── README.md               # Documentação do banco
    └── init/
        ├── 01_schema.sql       # Criação do Star Schema
        └── 02_populate.sql     # Seed das dimensões
```

---

## ℹ️ Contexto para o Antigravity (nova máquina)

Ao abrir este projeto em uma nova instalação do Antigravity, informe:

> *"Leia o README.md e continue o projeto AtmosMetrics. As Fases 1 a 4 estão concluídas (Banco + ETL + API backend + Dashboard Frontend). Precisamos agora implementar a Fase 5: as páginas internas do dashboard (Focos de Calor, Localidades, Satélites e Configurações)."*

O Antigravity vai ler o workspace e terá todo o contexto necessário para continuar.
