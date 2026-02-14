
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

# Exposer le port
EXPOSE 3000

# Creer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Changer le proprietaire des fichiers
RUN chown -R nestjs:nodejs /app
USER nestjs

# Commande de demarrage
CMD ["node", "dist/main"]
