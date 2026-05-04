# Usa uma imagem oficial do Node.js
FROM node:20-alpine

# Define o diretório de trabalho dentro do contêiner
WORKDIR /frontend

# Copia os arquivos de dependência
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o resto do código da aplicação
COPY . .

# Expõe a porta que o Vite utiliza
EXPOSE 5173

# Variáveis do Vite
ENV HOST=0.0.0.0

# Inicia o modo de desenvolvimento
CMD ["npm", "run", "dev"]
