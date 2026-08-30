#!/usr/bin/env bash
# =============================================================================
#  instalar_linux.sh — Instalador del Servicio de Impresión para Linux
#  Zorin OS / Linux Mint / Ubuntu
# =============================================================================
# Uso: bash instalar_linux.sh
# Requiere: conexión a internet, permisos sudo para apt.
# =============================================================================

set -euo pipefail

# ── Configuración del negocio (editá estos valores antes de correr) ──────────
BUSINESS_NAME="BEE"
BUSINESS_ADDRESS="Ruta 1"
SERVER_IP="192.168.1.100"      # IP del servidor central (backend/frontend)
SERVER_PORT="8000"
PRINT_SERVICE_PORT="9100"
# ─────────────────────────────────────────────────────────────────────────────

REPO_URL="https://github.com/TU_USUARIO/TU_REPO.git"   # ← Ajustar
INSTALL_DIR="$HOME/don-atilio-v2"
VENV_DIR="$INSTALL_DIR/venv_print"
PRINT_SERVICE_DIR="$INSTALL_DIR/print_service"
SERVICE_NAME="print_service"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[AVISO]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
section() { echo -e "\n${YELLOW}══ $* ══${NC}"; }

# =============================================================================
# 1. Verificar/instalar dependencias del sistema
# =============================================================================
section "1. Verificando dependencias del sistema"

PKGS_NEEDED=()
command -v git    >/dev/null 2>&1 || PKGS_NEEDED+=(git)
command -v python3 >/dev/null 2>&1 || PKGS_NEEDED+=(python3)
python3 -m venv --help >/dev/null 2>&1 || PKGS_NEEDED+=(python3-venv)
command -v lsusb  >/dev/null 2>&1 || PKGS_NEEDED+=(usbutils)

if [ ${#PKGS_NEEDED[@]} -gt 0 ]; then
    warn "Instalando paquetes faltantes: ${PKGS_NEEDED[*]}"
    sudo apt-get update -qq
    sudo apt-get install -y -qq "${PKGS_NEEDED[@]}"
fi
info "Dependencias del sistema OK"

# =============================================================================
# 2. Clonar o actualizar el repo
# =============================================================================
section "2. Repositorio"

if [ -d "$INSTALL_DIR/.git" ]; then
    info "Repo ya existe en $INSTALL_DIR — actualizando..."
    git -C "$INSTALL_DIR" pull --ff-only
else
    info "Clonando repo en $INSTALL_DIR..."
    git clone "$REPO_URL" "$INSTALL_DIR"
fi

# =============================================================================
# 3. Crear entorno virtual e instalar dependencias del print_service
# =============================================================================
section "3. Entorno virtual Python"

if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
    info "Entorno virtual creado en $VENV_DIR"
fi

"$VENV_DIR/bin/pip" install --upgrade pip -q
"$VENV_DIR/bin/pip" install -r "$PRINT_SERVICE_DIR/requirements.txt" -q
info "Dependencias instaladas (pywin32 omitido automáticamente en Linux)"

# =============================================================================
# 4. Detectar impresora USB y obtener Vendor/Product ID
# =============================================================================
section "4. Detección de impresora USB"

echo ""
echo "Impresoras/dispositivos USB conectados actualmente:"
echo "─────────────────────────────────────────────────────"
USB_PRINTERS=$(lsusb | grep -iE "printer|sam4s|epson|star|bixolon|sewoo|citizen|thermal" || true)
if [ -z "$USB_PRINTERS" ]; then
    warn "No se detectaron impresoras con nombre reconocido. Listado completo de USB:"
    lsusb
else
    echo "$USB_PRINTERS"
fi
echo "─────────────────────────────────────────────────────"
echo ""
echo "Ingresá el Vendor ID de tu impresora (ej: 1504, con o sin 0x):"
read -rp "  USB_VENDOR_ID: " INPUT_VENDOR
echo "Ingresá el Product ID de tu impresora:"
read -rp "  USB_PRODUCT_ID: " INPUT_PRODUCT

normalize_hex() {
    local val="${1,,}"
    if [[ "$val" == 0x* ]]; then
        echo "$val"
    else
        echo "0x$val"
    fi
}
USB_VENDOR_ID=$(normalize_hex "$INPUT_VENDOR")
USB_PRODUCT_ID=$(normalize_hex "$INPUT_PRODUCT")

echo ""
echo "  Driver:     usb"
echo "  Vendor ID:  $USB_VENDOR_ID"
echo "  Product ID: $USB_PRODUCT_ID"
echo ""
read -rp "Confirmar estos valores? [S/n]: " CONFIRM
if [[ "${CONFIRM,,}" == "n" ]]; then
    error "Instalacion cancelada por el usuario."
    exit 1
fi

# Regla udev para acceso USB sin sudo
UDEV_RULE_FILE="/etc/udev/rules.d/99-thermal-printer.rules"
VENDOR_SHORT="${USB_VENDOR_ID#0x}"
PRODUCT_SHORT="${USB_PRODUCT_ID#0x}"
UDEV_RULE="SUBSYSTEM==\"usb\", ATTRS{idVendor}==\"${VENDOR_SHORT}\", ATTRS{idProduct}==\"${PRODUCT_SHORT}\", MODE=\"0666\", GROUP=\"plugdev\""

if [ ! -f "$UDEV_RULE_FILE" ] || ! grep -qF "$UDEV_RULE" "$UDEV_RULE_FILE" 2>/dev/null; then
    warn "Creando regla udev para acceso USB sin sudo..."
    echo "$UDEV_RULE" | sudo tee "$UDEV_RULE_FILE" > /dev/null
    sudo udevadm control --reload-rules
    sudo udevadm trigger
    info "Regla udev aplicada"
fi

if ! groups "$USER" | grep -qw plugdev; then
    warn "Agregando usuario '$USER' al grupo plugdev..."
    sudo usermod -aG plugdev "$USER"
fi

# =============================================================================
# 5. Generar el .env del print_service
# =============================================================================
section "5. Generando .env"

ENV_FILE="$PRINT_SERVICE_DIR/.env"

cat > "$ENV_FILE" <<EOF
# Generado automaticamente por instalar_linux.sh
BUSINESS_NAME=${BUSINESS_NAME}
BUSINESS_ADDRESS=${BUSINESS_ADDRESS}
FOOTER_THANKS=Muchas gracias por su compra!
FOOTER_LEGAL=DOCUMENTO NO FISCAL

PRINTER_DRIVER=usb
USB_VENDOR_ID=${USB_VENDOR_ID}
USB_PRODUCT_ID=${USB_PRODUCT_ID}

PAPER_CHARS=42
CUT_PAPER=true
OPEN_DRAWER=false
CODEPAGE=cp850

HOST=127.0.0.1
PORT=${PRINT_SERVICE_PORT}
EOF

info ".env generado en $ENV_FILE"

# =============================================================================
# 6. Acceso directo al POS (Chrome/Chromium en modo --app)
# =============================================================================
section "6. Acceso directo al POS (Chrome --app)"

SERVER_URL="http://${SERVER_IP}:${SERVER_PORT}"
PROFILE_DIR="$HOME/.config/pos-aislado"
DESKTOP_LAUNCHER="$HOME/Desktop/POS-Caja.desktop"

BROWSER_BIN=""
for candidate in \
    "google-chrome" \
    "google-chrome-stable" \
    "chromium-browser" \
    "chromium" \
    "/usr/bin/google-chrome" \
    "/usr/bin/chromium-browser" \
    "/snap/bin/chromium"
do
    if command -v "$candidate" >/dev/null 2>&1; then
        BROWSER_BIN="$candidate"
        break
    fi
done

if [ -z "$BROWSER_BIN" ]; then
    warn "No se encontro Chrome/Chromium. El acceso directo usara 'google-chrome'."
    BROWSER_BIN="google-chrome"
fi

mkdir -p "$HOME/Desktop"

cat > "$DESKTOP_LAUNCHER" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=POS Caja
Comment=Sistema de Punto de Venta
Exec=${BROWSER_BIN} --app=${SERVER_URL} --user-data-dir=${PROFILE_DIR} --no-first-run
Icon=application-x-executable
Terminal=false
Categories=Application;
EOF

chmod +x "$DESKTOP_LAUNCHER"
info "Acceso directo creado: $DESKTOP_LAUNCHER"

# =============================================================================
# 7. Autostart del servicio de impresion (systemd --user)
# =============================================================================
section "7. Autostart del servicio de impresion"

SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
SERVICE_FILE="$SYSTEMD_USER_DIR/${SERVICE_NAME}.service"

mkdir -p "$SYSTEMD_USER_DIR"

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Servicio de Impresion ESC/POS - POS Caja
After=network.target

[Service]
Type=simple
WorkingDirectory=${INSTALL_DIR}
ExecStart=${VENV_DIR}/bin/python -m uvicorn print_service.main:app --host 127.0.0.1 --port ${PRINT_SERVICE_PORT}
Restart=on-failure
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable "${SERVICE_NAME}.service"
systemctl --user start  "${SERVICE_NAME}.service"
info "Servicio systemd --user habilitado: ${SERVICE_NAME}"

if command -v loginctl >/dev/null 2>&1; then
    sudo loginctl enable-linger "$USER" 2>/dev/null && info "linger habilitado para '$USER'" || true
fi

# =============================================================================
# Resumen final
# =============================================================================
section "Instalacion completa"
echo ""
echo "  Directorio:        $INSTALL_DIR"
echo "  Entorno virtual:   $VENV_DIR"
echo "  Configuracion:     $ENV_FILE"
echo "  Servicio systemd:  ${SERVICE_NAME}.service"
echo "  Acceso directo:    $DESKTOP_LAUNCHER"
echo "  POS URL:           $SERVER_URL"
echo ""
warn "Si agregaste tu usuario al grupo plugdev, cerra y volve a abrir sesion."
echo ""
echo "Para ver logs del servicio:"
echo "  journalctl --user -u ${SERVICE_NAME} -f"
echo ""
