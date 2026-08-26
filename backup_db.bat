@echo off
chcp 65001 >nul
title Mi Abejita V2 - Respaldo de Base de Datos

echo ========================================================
echo       MI ABEJITA V2 - RESPALDO DE BASE DE DATOS
echo ========================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: Crear carpeta de backups si no existe
if not exist "backups" mkdir "backups"

:: Configuración por defecto (modificar si tus credenciales cambian)
set "DB_NAME=don_atilio"
set "DB_USER=root"
set "DB_HOST=127.0.0.1"
set "DB_PORT=3306"

:: Generar marca de tiempo formateada
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value 2^>nul') do set "DT=%%I"
if defined DT (
    set "TIMESTAMP=%DT:~0,4%-%DT:~4,2%-%DT:~6,2%_%DT:~8,2%-%DT:~10,2%-%DT:~12,2%"
) else (
    set "TIMESTAMP=%date:~6,4%-%date:~3,2%-%date:~0,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%"
    set "TIMESTAMP=%TIMESTAMP: =0%"
)

set "BACKUP_FILE=backups\backup_%DB_NAME%_%TIMESTAMP%.sql"

:: Buscar ejecutable mysqldump
set "DUMP_EXE=mysqldump"
where mysqldump >nul 2>&1
if %errorlevel% neq 0 (
    if exist "C:\Program Files\MariaDB*\bin\mysqldump.exe" (
        for /d %%D in ("C:\Program Files\MariaDB*") do if exist "%%D\bin\mysqldump.exe" set "DUMP_EXE=%%D\bin\mysqldump.exe"
    ) else if exist "C:\Program Files\MySQL\MySQL Server*\bin\mysqldump.exe" (
        for /d %%D in ("C:\Program Files\MySQL\MySQL Server*") do if exist "%%D\bin\mysqldump.exe" set "DUMP_EXE=%%D\bin\mysqldump.exe"
    ) else if exist "C:\xampp\mysql\bin\mysqldump.exe" (
        set "DUMP_EXE=C:\xampp\mysql\bin\mysqldump.exe"
    )
)

echo Guardando respaldo en: %BACKUP_FILE%...
echo (Si tu base de datos tiene contrasenia, sera solicitada a continuacion)
echo.

"%DUMP_EXE%" -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p %DB_NAME% > "%BACKUP_FILE%"

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo             RESPALDO CREADO CON EXITO
    echo ========================================================
    echo Archivo guardado: %BACKUP_FILE%
) else (
    echo.
    echo [ERROR] No se pudo completar el respaldo.
    echo Verifica que MariaDB este corriendo y las credenciales sean correctas.
)

echo.
pause
