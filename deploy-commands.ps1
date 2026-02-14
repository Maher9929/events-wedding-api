# COMMANDES COMPLÈTES DE DÉPLOIEMENT

Write-Host "=== DÉPLOIEMENT COMPLET ==="

# ÉTAPE 1: Préparation
Write-Host "`n=== ÉTAPE 1: PRÉPARATION ==="

# Vérifier Docker
Write-Host "Vérification Docker..."
docker --version
docker-compose --version

# ÉTAPE 2: Build Docker
Write-Host "`n=== ÉTAPE 2: BUILD DOCKER ==="
docker build -t events-wedding-api:latest .
docker build -t events-wedding-api:v1.0 .

# ÉTAPE 3: Test local
Write-Host "`n=== ÉTAPE 3: TEST LOCAL ==="
docker run -d -p 3000:3000 --name test-api events-wedding-api:latest

# Attendre démarrage
Start-Sleep -Seconds 5

# Test API
try {
    $test = Invoke-RestMethod -Uri "http://localhost:3000/api" -Method Get
    Write-Host "✅ API fonctionne dans Docker"
} catch {
    Write-Host "❌ API ne répond pas"
}

# Nettoyer test
docker stop test-api
docker rm test-api

# ÉTAPE 4: Docker Compose
Write-Host "`n=== ÉTAPE 4: DOCKER COMPOSE ==="
docker-compose up -d

# Attendre démarrage
Start-Sleep -Seconds 10

# Test avec Compose
try {
    $test = Invoke-RestMethod -Uri "http://localhost/api" -Method Get
    Write-Host "✅ API fonctionne avec Docker Compose"
} catch {
    Write-Host "❌ API ne répond pas avec Compose"
}

# ÉTAPE 5: Git & GitHub
Write-Host "`n=== ÉTAPE 5: GIT & GITHUB ==="

# Initialiser si nécessaire
if (-not (Test-Path ".git")) {
    git init
}

# Ajouter tous les fichiers
git add .
git commit -m "Add Docker configuration and deployment setup"

# Ajouter remote (remplacez avec votre repo)
git remote add origin https://github.com/votre-username/events-wedding-api.git

# Push
git branch -M main
git push -u origin main

# ÉTAPE 6: Configuration GitHub
Write-Host "`n=== ÉTAPE 6: CONFIGURATION GITHUB ==="
Write-Host "Configurez ces secrets dans GitHub:"
Write-Host "1. Allez sur: https://github.com/votre-username/events-wedding-api/settings/secrets/actions"
Write-Host "2. Ajoutez:"
Write-Host "   - DOCKER_USERNAME: votre nom d'utilisateur Docker Hub"
Write-Host "   - DOCKER_PASSWORD: votre mot de passe Docker Hub"
Write-Host "   - PRODUCTION_HOST: IP de votre serveur"
Write-Host "   - PRODUCTION_USER: utilisateur SSH du serveur"
Write-Host "   - PRODUCTION_SSH_KEY: clé SSH privée"

# ÉTAPE 7: Vérification finale
Write-Host "`n=== ÉTAPE 7: VÉRIFICATION FINALE ==="
Write-Host "Services actifs:"
docker-compose ps

Write-Host "Logs API:"
docker-compose logs api | Select-Object -Last 5

Write-Host "URLs:"
Write-Host "- API: http://localhost/api"
Write-Host "- Swagger: http://localhost/api"
Write-Host "- GitHub Actions: https://github.com/votre-username/events-wedding-api/actions"

Write-Host "`n=== DÉPLOIEMENT TERMINÉ ==="
Write-Host "Le projet est maintenant:"
Write-Host "✅ Dockerisé"
Write-Host "✅ Testé localement"
Write-Host "✅ Push sur GitHub"
Write-Host "✅ Prêt pour déploiement automatique"

Write-Host "`nProchaines étapes:"
Write-Host "1. Configurez les secrets GitHub"
Write-Host "2. Push des modifications pour déclencher le déploiement"
Write-Host "3. Surveillez les GitHub Actions"
