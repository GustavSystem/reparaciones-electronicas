# Instalar modelo ultra-ligero para visión (Moondream)
Write-Host "Iniciando instalación de Moondream (1.8GB)..." -ForegroundColor Cyan
Write-Host "Este modelo es mucho más rápido y ligero que LLaVA." -ForegroundColor Gray

$ollamaExe = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"

try {
    & $ollamaExe pull moondream
    Write-Host "`n¡Moondream instalado correctamente!" -ForegroundColor Green
} catch {
    Write-Host "Error descargando moondream. Verifica tu internet." -ForegroundColor Red
}

Write-Host "Presiona cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
