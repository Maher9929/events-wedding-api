# TEST ENDPOINTS PUBLICS

try {
    $categories = Invoke-RestMethod -Uri "http://localhost:3000/categories" -Method Get
    Write-Host "✅ Categories: $($categories.data.Count) catégories"
    
    $providers = Invoke-RestMethod -Uri "http://localhost:3000/providers" -Method Get
    Write-Host "✅ Providers: $($providers.data.Count) prestataires"
    
    $services = Invoke-RestMethod -Uri "http://localhost:3000/services" -Method Get
    Write-Host "✅ Services: $($services.data.Count) services"
    
    $events = Invoke-RestMethod -Uri "http://localhost:3000/events" -Method Get
    Write-Host "✅ Events: $($events.data.Count) événements"
    
} catch {
    Write-Host "❌ Erreur endpoints publics: $_"
}
