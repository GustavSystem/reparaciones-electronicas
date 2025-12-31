# Verificar y descargar modelos de Ollama

Write-Host "Verificando modelos de Ollama..." -ForegroundColor Cyan

$requiredModels = @("llama3", "llava")
$missingModels = @()

$ollamaExe = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"

# Obtener lista de modelos instalados
try {
    $installed = & $ollamaExe list
} catch {
    Write-Host "Error: No se pudo ejecutar '$ollamaExe list'. Asegúrate de que Ollama está instalado." -ForegroundColor Red
    exit
}

foreach ($model in $requiredModels) {
    if ($installed -match $model) {
        Write-Host "[OK] Modelo '$model' encontrado." -ForegroundColor Green
    } else {
        Write-Host "[X] Modelo '$model' NO encontrado." -ForegroundColor Yellow
        $missingModels += $model
    }
}

if ($missingModels.Count -gt 0) {
    Write-Host "`nFaltan modelos. Iniciando descarga (esto puede tardar unos minutos)..." -ForegroundColor Yellow
    foreach ($model in $missingModels) {
        Write-Host "Descargando $model..." -ForegroundColor Cyan
        & $ollamaExe pull $model
    }
    Write-Host "`n¡Descarga completada!" -ForegroundColor Green
} else {
    Write-Host "`n¡Todos los modelos necesarios están listos!" -ForegroundColor Green
}

Write-Host "`nPresiona cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
