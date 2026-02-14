# Étape 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY . .

# Builder l'application
RUN npm run build

# Étape 2: Production
FROM node:18-alpine AS production

WORKDIR /app

# Copier les node_modules de l'étape build
COPY --from=builder /app/node_modules ./node_modules

# Copier le code buildé
COPY --from=builder /app/dist ./dist

# Copier les fichiers de configuration
COPY package*.json ./
COPY .env.production ./.env

# Exposer le port
EXPOSE 3000

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Changer le propriétaire des fichiers
RUN chown -R nestjs:nodejs /app
USER nestjs

# Commande de démarrage
CMD ["node", "dist/main"]
