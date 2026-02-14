# TEST CONNEXION ADMIN

$login = @{
    email = "testadmin@yopmail.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/users/login" -Method Post -ContentType "application/json" -Body $login
    $token = $response.access_token
    Write-Host "✅ Admin connecte: $($response.user.email)"
    Write-Host "   Token: $($token.Substring(0,30))..."
} catch {
    Write-Host "❌ Erreur connexion: $_"
    exit
}
