# COMMANDES GITHUB POUR DÉPLOIEMENT

Write-Host "=== COMMANDES GITHUB & GIT ==="

# 1. Initialiser Git (si pas fait)
Write-Host "`n1. Initialiser Git..."
git init
git add .
git commit -m "Initial commit - Events & Wedding Marketplace API"

# 2. Ajouter remote GitHub
Write-Host "`n2. Ajouter remote GitHub..."
# Remplacez avec votre repository
git remote add origin https://github.com/votre-username/events-wedding-api.git

# 3. Créer et push sur main
Write-Host "`n3. Push sur main..."
git branch -M main
git push -u origin main

# 4. Vérifier le status
Write-Host "`n4. Vérifier le status..."
git status
git log --oneline -5

# 5. Créer une branche de développement
Write-Host "`n5. Créer branche dev..."
git checkout -b develop
git push origin develop

# 6. Merge et déployer
Write-Host "`n6. Merge vers main..."
git checkout main
git merge develop
git push origin main

# 7. Vérifier les actions GitHub
Write-Host "`n7. Vérifier les actions GitHub..."
Write-Host "Allez sur: https://github.com/votre-username/events-wedding-api/actions"

Write-Host "`n=== COMMANDES GIT TERMINÉES ==="
Write-Host "Configurez les secrets GitHub dans les settings du repository:"
Write-Host "- DOCKER_USERNAME"
Write-Host "- DOCKER_PASSWORD"
Write-Host "- PRODUCTION_HOST"
Write-Host "- PRODUCTION_USER"
Write-Host "- PRODUCTION_SSH_KEY"
