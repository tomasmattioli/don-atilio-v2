@echo off
title Mi Abejita - Servicio Local de Impresion ESC/POS
chcp 65001 > nul
echo ========================================================
echo   Mi Abejita - Servicio Local de Impresion (Puerto 9100)
echo ========================================================
echo.

cd /d "%~dp0"

REM Verificar si existe el entorno virtual
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else if exist "..\venv\Scripts\activate.bat" (
    call ..\venv\Scripts\activate.bat
) else (
    echo [AVISO] No se encontro venv local, usando python del sistema...
)

echo Iniciando servicio de impresion ESC/POS...
echo Presione Ctrl+C para detener el servicio.
echo.

python -m uvicorn print_service.main:app --host 127.0.0.1 --port 9100

pause
