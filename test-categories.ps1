# TEST CATEGORIES CRUD

$category = @{
    name = "Test PowerShell"
    description = "Catégorie testée par script PowerShell"
    slug = "test-powershell-$(Get-Random -Maximum 999)"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/users/login" -Method Post -ContentType "application/json" -Body ( @{
        email = "testadmin@yopmail.com"
        password = "admin123"
    } | ConvertTo-Json)
    $token = $response.access_token
    
    # CREATE
    $created = Invoke-RestMethod -Uri "http://localhost:3000/categories" -Method Post -ContentType "application/json" -Body $category -Headers @{"Authorization"="Bearer $token"}
    Write-Host "✅ CREATE: $($created.name)"
    
    # READ ALL
    $all = Invoke-RestMethod -Uri "http://localhost:3000/categories" -Method Get
    Write-Host "✅ READ ALL: $($all.data.Count) catégories"
    
    # DELETE
    Invoke-RestMethod -Uri "http://localhost:3000/categories/$($created.id)" -Method Delete -Headers @{"Authorization"="Bearer $token"}
    Write-Host "✅ DELETE: Catégorie supprimée"
    
} catch {
    Write-Host "❌ Erreur Categories: $_"
}
