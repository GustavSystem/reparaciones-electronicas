# 1. Configurar permisos de CORS para Ollama (CRÍTICO)
$env:OLLAMA_ORIGINS="*"
Write-Host "Configurando OLLAMA_ORIGINS='*'" -ForegroundColor Green

# 2. Detener cualquier instancia previa de Ollama (para aplicar los cambios)
Write-Host "Deteniendo instancias previas de Ollama..." -ForegroundColor Yellow
try {
    Stop-Process -Name "ollama" -Force -ErrorAction SilentlyContinue
    Stop-Process -Name "ollama app" -Force -ErrorAction SilentlyContinue
    Write-Host "Ollama detenido correctamente." -ForegroundColor Green
} catch {
    Write-Host "No había procesos previos de Ollama." -ForegroundColor Gray
}

# Esperar a que se libere el puerto
Start-Sleep -Seconds 2

# 3. Iniciar Ollama con la nueva configuración (Minimizado)
Write-Host "Iniciando NUEVA instancia de Ollama..." -ForegroundColor Cyan
try {
    # Usamos Start-Process para que no bloquee este script si falla algo
    $ollamaPath = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
    Start-Process -FilePath $ollamaPath -ArgumentList "serve" -WindowStyle Minimized
    Write-Host "Servicio Ollama iniciado en segundo plano." -ForegroundColor Green
} catch {
    Write-Host "ERROR: No se pudo iniciar 'ollama serve'." -ForegroundColor Red
    Write-Host "Asegúrate de tener Ollama instalado." -ForegroundColor Red
    exit
}

# 4. Esperar a que Ollama esté listo
Write-Host "Esperando a que Ollama cargue..." -ForegroundColor Cyan
Start-Sleep -Seconds 4

# 5. Iniciar la aplicación Web
Write-Host "Iniciando App (npm run dev)..." -ForegroundColor Cyan
Write-Host "¡IMPORTANTE! NO CIERRES ESTA VENTANA NEGRA." -ForegroundColor Red -BackgroundColor Yellow
Write-Host "Si la cierras, se apagará el servidor web." -ForegroundColor Gray

npm run dev
