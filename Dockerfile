
# Etape 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers de dependances
COPY package*.json ./

# Installer les dependances
RUN npm ci

# Copier le code source
COPY . .

# Builder l'application
RUN npm run build

# Etape 2: Production
FROM node:18-alpine AS production

WORKDIR /app

# Copier les node_modules de l'etape build
COPY --from=builder /app/node_modules ./node_modules

# Copier le code builde
COPY --from=builder /app/dist ./dist

# Copier les fichiers de configuration
COPY package*.json ./
COPY .env.production .env

# Exposer le port
EXPOSE 3000

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Changer le proprietaire des fichiers
RUN chown -R nestjs:nodejs /app
USER nestjs

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30m --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Commande de démarrage
CMD ["node", "dist/main"]
