# Dockerfile - Frontend React/Vite (Node 22)
# Build com hot-reload para desenvolvimento
# ============================================================
# AtmosMetrics — Dockerfile do Frontend (Vite/React)
# ============================================================

FROM node:20-alpine

WORKDIR /app

# Copia apenas os arquivos de dependência primeiro (otimiza cache do Docker)
COPY package.json package-lock.json* ./

# Instala as dependências
RUN npm install

# Copia o restante do código da aplicação
COPY . .

# Expõe a porta do Vite
EXPOSE 5173

# Inicia o servidor em modo de desenvolvimento
CMD ["npm", "run", "dev"]
