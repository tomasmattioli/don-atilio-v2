import os
from pathlib import Path
from dotenv import load_dotenv

# Cargar variables de entorno desde .env si existe en el directorio local
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

class Settings:
    # ── Datos del Negocio y Encabezado ──
    TICKET_TITLE: str = os.getenv("TICKET_TITLE", "PRESUPUESTO ORIGINAL")
    BUSINESS_NAME: str = os.getenv("BUSINESS_NAME", "BEE")
    BUSINESS_SUBTITLE: str = os.getenv("BUSINESS_SUBTITLE", "DISTRIBUIDORA")
    BUSINESS_ADDRESS: str = os.getenv("BUSINESS_ADDRESS", "Ruta 1")
    BUSINESS_PHONE: str = os.getenv("BUSINESS_PHONE", "")
    BUSINESS_CUIT: str = os.getenv("BUSINESS_CUIT", "")
    FOOTER_THANKS: str = os.getenv("FOOTER_THANKS", "¡Muchas gracias por su compra!")
    FOOTER_LEGAL: str = os.getenv("FOOTER_LEGAL", "COMPROBANTE NO VALIDO COMO FACTURA")

    # ── Configuración de la Impresora ──
    # Opciones: "win32raw" (Recomendado en Windows), "usb" (PyUSB/Zadig), "dummy" (Simulador de consola), "network"
    PRINTER_DRIVER: str = os.getenv("PRINTER_DRIVER", "win32raw").lower()

    # Nombre de la impresora en Windows (si PRINTER_DRIVER="win32raw")
    PRINTER_NAME: str = os.getenv("PRINTER_NAME", "SAM4S GIANT-100")

    # Parámetros USB directos (si PRINTER_DRIVER="usb")
    USB_VENDOR_ID: int = int(os.getenv("USB_VENDOR_ID", "0x1504"), 16 if os.getenv("USB_VENDOR_ID", "").startswith("0x") else 10)
    USB_PRODUCT_ID: int = int(os.getenv("USB_PRODUCT_ID", "0x0006"), 16 if os.getenv("USB_PRODUCT_ID", "").startswith("0x") else 10)

    # Parámetros Red Ethernet/WiFi (si PRINTER_DRIVER="network")
    NETWORK_HOST: str = os.getenv("NETWORK_HOST", "192.168.1.100")
    NETWORK_PORT: int = int(os.getenv("NETWORK_PORT", "9100"))

    # ── Parámetros del Formato de Ticket ──
    # Columnas de ancho para papel de 80mm: 42 o 48 caracteres
    PAPER_CHARS: int = int(os.getenv("PAPER_CHARS", "42"))
    CUT_PAPER: bool = os.getenv("CUT_PAPER", "true").lower() in ("true", "1", "yes")
    OPEN_DRAWER: bool = os.getenv("OPEN_DRAWER", "false").lower() in ("true", "1", "yes")
    CODEPAGE: str = os.getenv("CODEPAGE", "cp850")

    # ── Servidor Local ──
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "9100"))

settings = Settings()
