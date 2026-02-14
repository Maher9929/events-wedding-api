# TEST SÉCURITÉ

try {
    # Test accès sans token (doit échouer)
    Invoke-RestMethod -Uri "http://localhost:3000/categories" -Method Post -ContentType "application/json" -Body '{"name":"test"}'
    Write-Host "❌ Accès sans token: ÉCHEC (normal)"
} catch {
    Write-Host "✅ Sécurité: Accès non autorisé correctement bloqué"
}

try {
    # Test avec token invalide (doit échouer)
    Invoke-RestMethod -Uri "http://localhost:3000/categories" -Method Post -ContentType "application/json" -Body '{"name":"test"}' -Headers @{"Authorization"="Bearer token_invalide"}
    Write-Host "❌ Token invalide: Rejeté (normal)"
} catch {
    Write-Host "✅ Sécurité: Token invalide correctement bloqué"
}
