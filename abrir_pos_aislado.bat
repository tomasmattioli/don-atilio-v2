@echo off
REM ========================================================
REM Lanzador de Mi Abejita POS en modo App Aislado
REM ========================================================

REM Cambiar esta IP por la IP real de tu VM Linux en la red local
set "SERVER_URL=http://127.0.0.1:8000"
set "USER_DATA_DIR=C:\MiAbejitaPOS\perfil"

REM Crear el directorio de perfil aislado si no existe
if not exist "%USER_DATA_DIR%" mkdir "%USER_DATA_DIR%"

REM Detectar ruta de Chrome o Edge
set "CHROME_PATH="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=%LocalAppData%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "CHROME_PATH=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
)

if "%CHROME_PATH%"=="" (
    echo [ERROR] No se encontro Google Chrome ni Microsoft Edge instalado.
    pause
    exit /b 1
)

start "" "%CHROME_PATH%" --app="%SERVER_URL%" --user-data-dir="%USER_DATA_DIR%"
