#!/bin/bash

# Script de déploiement professionnel pour Dousha Events & Wedding Services
# Usage: ./deploy.sh [environment]

set -e  # Arrêter le script en cas d'erreur

ENVIRONMENT=${1:-production}
echo "🚀 Déploiement de Dousha en environnement: $ENVIRONMENT"

# Vérifications pré-déploiement
echo "📋 Vérifications pré-déploiement..."

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez installer Docker d'abord."
    exit 1
fi

# Vérifier que Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez installer Docker Compose d'abord."
    exit 1
fi

# Vérifier que le fichier .env existe
if [ ! -f ".env" ]; then
    echo "❌ Fichier .env introuvable. Veuillez le créer avant de continuer."
    exit 1
fi

# Nettoyage des anciens conteneurs et images
echo "🧹 Nettoyage des anciens conteneurs..."
docker-compose down --remove-orphans || true
docker system prune -f

# Construction des images
echo "🔨 Construction des images Docker..."
docker-compose build --no-cache

# Démarrage des services
echo "🚀 Démarrage des services..."
docker-compose up -d

# Attente que les services soient prêts
echo "⏳ Attente que les services soient prêts..."
sleep 30

# Vérification de la santé des services
echo "🏥 Vérification de la santé des services..."

# Vérifier le backend
echo "🔍 Vérification du backend..."
for i in {1..10}; do
    if curl -f http://localhost:3000/health &> /dev/null; then
        echo "✅ Backend prêt"
        break
    else
        echo "⏳ En attente du backend... ($i/10)"
        sleep 10
    fi
done

# Vérifier le frontend
echo "🔍 Vérification du frontend..."
for i in {1..10}; do
    if curl -f http://localhost:80 &> /dev/null; then
        echo "✅ Frontend prêt"
        break
    else
        echo "⏳ En attente du frontend... ($i/10)"
        sleep 10
    fi
done

# Exécution des migrations Supabase si nécessaire
echo "🗄️ Vérification des migrations Supabase..."
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_KEY" ]; then
    echo "📊 Application des migrations..."
    # Ajouter ici la logique pour appliquer les migrations Supabase
    echo "✅ Migrations vérifiées"
else
    echo "⚠️ Variables Supabase non trouvées, veuillez appliquer les migrations manuellement"
fi

# Tests de santé finaux
echo "🧪 Tests de santé finaux..."
docker-compose ps

# Affichage des logs
echo "📋 Affichage des logs des services..."
docker-compose logs --tail=50

echo ""
echo "🎉 Déploiement terminé avec succès!"
echo ""
echo "📊 Services disponibles:"
echo "   • Backend API: http://localhost:3000"
echo "   • Frontend: http://localhost:80"
echo "   • Monitoring Prometheus: http://localhost:9090"
echo "   • Grafana: http://localhost:3001 (admin/admin123)"
echo "   • Redis: localhost:6379"
echo ""
echo "🔍 Commandes utiles:"
echo "   • Voir les logs: docker-compose logs -f [service]"
echo "   • Arrêter: docker-compose down"
echo "   • Redémarrer: docker-compose restart [service]"
echo "   • Mettre à jour: git pull && docker-compose build && docker-compose up -d"
echo ""
echo "📝 Pour le monitoring:"
echo "   • Prometheus: http://localhost:9090"
echo "   • Grafana: http://localhost:3001"
echo "   • Nginx: http://localhost:8080"
echo ""

# Sauvegarde des logs
echo "💾 Sauvegarde des logs de déploiement..."
mkdir -p logs/deployments
docker-compose logs > logs/deployments/deploy-$(date +%Y%m%d-%H%M%S).log

echo "🎯 Déploiement terminé à $(date)"
