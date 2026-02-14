# 🐳 Dockerisation & Déploiement

## 📋 Configuration Docker

### 🐳 Build de l'image
```bash
# Build local
docker build -t events-wedding-api .

# Run local
docker run -p 3000:3000 --env-file .env.production events-wedding-api
```

### 🚀 Docker Compose
```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down
```

## 🔧 Configuration Production

### Variables d'environnement
Copiez `.env.production` et configurez :
- `SUPABASE_URL` : URL de votre projet Supabase
- `SUPABASE_KEY` : Clé service Supabase
- `SUPABASE_ANON_KEY` : Clé anonyme Supabase
- `JWT_SECRET` : Secret JWT sécurisé

### Sécurité
- Utilisez des secrets forts
- Configurez SSL/TLS
- Activez HTTPS
- Configurez les headers de sécurité

## 🚀 Déploiement GitHub Actions

### Prérequis
1. **Fork** ce repository
2. **Configurez les secrets GitHub** :
   - `DOCKER_USERNAME` : Nom d'utilisateur Docker Hub
   - `DOCKER_PASSWORD` : Mot de passe Docker Hub
   - `PRODUCTION_HOST` : IP du serveur de production
   - `PRODUCTION_USER` : Utilisateur SSH du serveur
   - `PRODUCTION_SSH_KEY` : Clé SSH privée

### Workflow automatique
1. **Push sur main** → Tests → Build → Deploy
2. **Pull Request** → Tests seulement
3. **Déploiement automatique** sur le serveur de production

## 🌐 Architecture Production

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Nginx     │────│   API       │────│ Supabase    │
│  (Reverse   │    │  (NestJS)   │    │ (Database)  │
│   Proxy)    │    │             │    │             │
│   SSL/TLS   │    │   Port 3000 │    │   HTTPS     │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 🔍 Monitoring

### Logs
```bash
# Logs Docker
docker-compose logs -f api

# Logs Nginx
docker-compose logs -f nginx

# Logs Base de données
docker-compose logs -f db
```

### Health Check
```bash
# Vérifier l'API
curl http://localhost/api

# Vérifier Swagger
curl http://localhost/api/docs
```

## 🛠️ Maintenance

### Mise à jour
```bash
# Pull latest version
docker-compose pull

# Redémarrer avec nouvelle version
docker-compose up -d

# Nettoyer les anciennes images
docker system prune -f
```

### Backup
```bash
# Backup base de données
docker-compose exec db pg_dump events_wedding > backup.sql

# Restore base de données
docker-compose exec -T db psql events_wedding < backup.sql
```

## 📊 Performance

### Optimisations
- **Multi-stage build** pour réduire la taille de l'image
- **Nginx reverse proxy** pour gérer le load balancing
- **SSL/TLS** pour la sécurité
- **Headers de sécurité** pour la protection

### Monitoring
- **Health checks** automatiques
- **Logs structurés** pour le debugging
- **Metrics** pour la surveillance

## 🚀 Déploiement Rapide

### Commande unique
```bash
# Clone et déploiement
git clone <repository-url>
cd events-wedding-api
cp .env.production .env
# Configurez vos variables
docker-compose up -d
```

### Accès
- **API** : `http://localhost/api`
- **Swagger** : `http://localhost/api`
- **Documentation** : `http://localhost/api/docs`

**Le projet est maintenant 100% dockerisé et prêt pour le déploiement !** 🚀
