@echo off
color 0E
echo ===================================================
echo       DESTRABAR SESION DEL SISTEMA (ADMIN)
echo ===================================================
echo.
echo Liberando la sesion en el servidor (192.168.18.33)...
echo.

curl -s -X POST http://192.168.18.33:8000/auth/emergencia/liberar-sesion ^
  -H "Content-Type: application/json" ^
  -d "{\"nombre_usuario\": \"admin\", \"clave_emergencia\": \"MattioliPablo\"}"

echo.
echo.
echo ===================================================
echo LISTO. Si dice "ok: true" arriba, ya podes
echo cerrar esta ventana y entrar al sistema.
echo ===================================================
echo.
pause
