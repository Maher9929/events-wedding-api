# COMMANDES DOCKER POUR DÉPLOIEMENT

Write-Host "=== COMMANDES DOCKER & DÉPLOIEMENT ==="

# 1. Build Docker image
Write-Host "`n1. Build Docker image..."
docker build -t events-wedding-api .

# 2. Run container local
Write-Host "`n2. Run container local..."
docker run -d -p 3000:3000 --name events-api events-wedding-api

# 3. Vérifier le container
Write-Host "`n3. Vérifier le container..."
docker ps
docker logs events-api

# 4. Test l'API dans le container
Write-Host "`n4. Test l'API..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api" -Method Get
    Write-Host "✅ API répond dans Docker"
} catch {
    Write-Host "❌ API ne répond pas"
}

# 5. Arrêter le container
Write-Host "`n5. Arrêter le container..."
docker stop events-api
docker rm events-api

# 6. Docker Compose
Write-Host "`n6. Docker Compose..."
docker-compose up -d

# 7. Vérifier les services
Write-Host "`n7. Vérifier les services..."
docker-compose ps
docker-compose logs -f api

# 8. Test avec Docker Compose
Write-Host "`n8. Test avec Docker Compose..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost/api" -Method Get
    Write-Host "✅ API répond via Docker Compose"
} catch {
    Write-Host "❌ API ne répond pas via Docker Compose"
}

# 9. Nettoyer
Write-Host "`n9. Nettoyer..."
docker-compose down
docker system prune -f

Write-Host "`n=== COMMANDES TERMINÉES ==="
