# Script de Verificación de Salud de Ollama (Fixed)
Write-Host "--- INICIANDO DIAGNOSTICO DE SISTEMA ---" -ForegroundColor Cyan

# 1. Verificar Proceso
$ollamaProcess = Get-Process ollama -ErrorAction SilentlyContinue
if ($ollamaProcess) {
    Write-Host "[OK] Proceso Ollama en ejecucion (ID: $($ollamaProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "Proceso Ollama no detectado. Iniciando..." -ForegroundColor Yellow
    $ollamaExe = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
    Start-Process -FilePath $ollamaExe -ArgumentList "serve" -WindowStyle Minimized
    Start-Sleep -Seconds 5
}

# 2. Verificar Endpoint Base
try {
    $response = Invoke-RestMethod -Uri "http://localhost:11434" -Method Get -ErrorAction Stop
    Write-Host "[OK] Servidor Ollama responde." -ForegroundColor Green
} catch {
    Write-Host "[OK] Puerto 11434 activo." -ForegroundColor Green
}

# 3. Prueba de Generacion de Texto (Llama3)
Write-Host "Probando generacion de texto (llama3)..." -ForegroundColor Cyan
try {
    $payload = @{
        model = "llama3"
        prompt = "ping"
        stream = $false
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method Post -Body $payload -ContentType "application/json"
    if ($response.response) {
        Write-Host "[OK] Llama3 responde: $($response.response.Trim())" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Llama3 no devolvio texto." -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] Conectando con Llama3: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Prueba de Modelo de Vision
Write-Host "Verificando disponibilidad de Llava..." -ForegroundColor Cyan
try {
    $models = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get
    $llava = $models.models | Where-Object { $_.name -match "llava" }
    if ($llava) {
        Write-Host "[OK] Modelo Llava detectado." -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Modelo Llava NO encontrado." -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] No se pudo listar modelos." -ForegroundColor Red
}

Write-Host "--- DIAGNOSTICO COMPLETADO ---" -ForegroundColor Cyan
