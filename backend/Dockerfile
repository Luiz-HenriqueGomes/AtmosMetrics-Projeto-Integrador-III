# ============================================================
# AtmosMetrics — Dockerfile do Backend (FastAPI)
# ============================================================

FROM python:3.12-slim

# Evita prompts interativos durante instalação de pacotes
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /backend

# Copia e instala dependências primeiro (cache do Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código da aplicação
COPY . .

# Expõe a porta da API
EXPOSE 8000

# Inicia o servidor com hot-reload (desenvolvimento)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
