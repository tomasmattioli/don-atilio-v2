@echo off
chcp 65001 >nul
title Mi Abejita V2 - Iniciando Sistema

echo ========================================================
echo          SISTEMA POS MI ABEJITA V2 - INICIANDO
echo ========================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

echo [1/3] Iniciando Servidor Backend (FastAPI en http://localhost:8000)...
start "Mi Abejita - Backend (FastAPI)" cmd /k "cd /d "%ROOT_DIR%" && call venv\Scripts\activate.bat && uvicorn main:app --reload --host 127.0.0.1 --port 8000"

echo [2/3] Iniciando Servidor Frontend (Vite React en http://localhost:5173)...
start "Mi Abejita - Frontend (React)" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

echo [3/3] Esperando que inicien los servicios y abriendo navegador...
ping 127.0.0.1 -n 4 >nul
start http://localhost:5173

echo.
echo ========================================================
echo             SISTEMA INICIADO EXITOSAMENTE
echo ========================================================
echo - Las ventanas de Backend y Frontend estan activas.
echo - Para apagar el sistema, simplemente cierra ambas ventanas.
echo.
pause
