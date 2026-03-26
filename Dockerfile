# ====================== BUILD STAGE ======================
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package*.json
COPY package*.json ./

# Устанавливаем dependencies
RUN npm install --production

# ====================== RUNTIME STAGE ======================
FROM node:18-alpine

WORKDIR /app

# Устанавливаем dumb-init для корректной обработки сигналов
RUN apk add --no-cache dumb-init

# Копируем node_modules из builder
COPY --from=builder /app/node_modules ./node_modules

# Копируем приложение
COPY . .

# Выставляем порт
EXPOSE 3001

# Используем dumb-init для запуска приложения
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
