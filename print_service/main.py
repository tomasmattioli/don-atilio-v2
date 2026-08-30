import logging
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from print_service.config import settings
from print_service.schemas import (
    TicketPayload,
    StatusResponse,
    TicketCierrePayload,
    TicketResumenPeriodoPayload,
)
from print_service.printer import printer_service, listar_impresoras_sistema, buscar_impresora_windows

# Configurar Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("print_service")

app = FastAPI(
    title="Mi Abejita - Servicio Local de Impresión de Tickets",
    description="Microservicio local de impresión térmica ESC/POS para cajas Windows",
    version="2.0.0"
)

# ── Configuración de CORS ──
# Permite que el navegador (localhost o IP de la VM/red) envíe peticiones directas
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_model=StatusResponse)
@app.get("/status", response_model=StatusResponse)
def estado_servicio():
    """Consulta el estado del servicio y las impresoras detectadas."""
    impresoras = listar_impresoras_sistema()
    printer_display = (
        buscar_impresora_windows(settings.PRINTER_NAME)
        if settings.PRINTER_DRIVER == "win32raw"
        else settings.PRINTER_NAME
    )
    return StatusResponse(
        status="online",
        printer_driver=settings.PRINTER_DRIVER,
        printer_name=printer_display,
        paper_width=settings.PAPER_CHARS,
        printers_detected=impresoras
    )

@app.get("/impresoras")
def obtener_impresoras():
    """Devuelve la lista de impresoras instaladas en el sistema operativo."""
    impresoras = listar_impresoras_sistema()
    return {
        "impresoras_disponibles": impresoras,
        "impresora_configurada": settings.PRINTER_NAME,
        "driver_actual": settings.PRINTER_DRIVER
    }

@app.post("/imprimir", status_code=status.HTTP_200_OK)
def imprimir_ticket(datos: TicketPayload):
    """Recibe la venta y emite el ticket físico por la impresora térmica."""
    logger.info(f"Petición de impresión recibida: Venta {datos.numero_ticket or datos.id_venta} - Total: ${datos.total}")
    try:
        resultado = printer_service.imprimir_ticket(datos)
        if resultado:
            return {"ok": True, "mensaje": "Ticket impreso correctamente"}
        else:
            raise HTTPException(status_code=500, detail="La impresora no confirmó la impresión")
    except Exception as e:
        logger.error(f"Error al imprimir ticket: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error en la impresora ({settings.PRINTER_NAME}): {str(e)}"
        )

@app.post("/imprimir/cierre-caja", status_code=status.HTTP_200_OK)
def imprimir_cierre_caja(datos: TicketCierrePayload):
    """Emite el ticket físico de Cierre de Turno / Caja por la impresora térmica."""
    logger.info(f"Petición de impresión de cierre recibida: Turno #{datos.id_session} - Vendedor: {datos.vendedor} - Total: ${datos.total_ventas}")
    try:
        resultado = printer_service.imprimir_cierre_caja(datos)
        if resultado:
            return {"ok": True, "mensaje": "Ticket de cierre de caja impreso correctamente"}
        else:
            raise HTTPException(status_code=500, detail="La impresora no confirmó la impresión del cierre")
    except Exception as e:
        logger.error(f"Error al imprimir ticket de cierre: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error en la impresora ({settings.PRINTER_NAME}): {str(e)}"
        )

@app.post("/imprimir/resumen-periodo", status_code=status.HTTP_200_OK)
def imprimir_resumen_periodo(datos: TicketResumenPeriodoPayload):
    """Emite un ticket resumen de ventas para un período seleccionado."""
    logger.info(f"Petición de impresión de resumen de ventas: {datos.fecha_desde} a {datos.fecha_hasta} - Total: ${datos.total_ventas}")
    try:
        resultado = printer_service.imprimir_resumen_periodo(datos)
        if resultado:
            return {"ok": True, "mensaje": "Ticket de resumen de ventas impreso correctamente"}
        else:
            raise HTTPException(status_code=500, detail="La impresora no confirmó la impresión del resumen")
    except Exception as e:
        logger.error(f"Error al imprimir ticket resumen: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error en la impresora ({settings.PRINTER_NAME}): {str(e)}"
        )

@app.post("/imprimir/prueba", status_code=status.HTTP_200_OK)
def imprimir_prueba():
    """Imprime un ticket de diagnóstico y prueba de hardware."""
    logger.info("Petición de impresión de prueba recibida")
    try:
        resultado = printer_service.imprimir_prueba()
        return {"ok": True, "mensaje": "Ticket de prueba emitido con éxito"}
    except Exception as e:
        logger.error(f"Error en ticket de prueba: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo imprimir prueba en '{settings.PRINTER_NAME}': {str(e)}"
        )

@app.post("/abrir-cajon", status_code=status.HTTP_200_OK)
def abrir_cajon_monedero():
    """Envía el comando ESC/POS para abrir el cajón monedero."""
    logger.info("Petición de apertura de cajón recibida")
    try:
        resultado = printer_service.abrir_cajon()
        return {"ok": True, "mensaje": "Cajón monedero abierto"}
    except Exception as e:
        logger.error(f"Error al abrir cajón: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error al abrir cajón: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    print(f"Iniciando Servicio de Impresión en http://{settings.HOST}:{settings.PORT}...")
    uvicorn.run("print_service.main:app", host=settings.HOST, port=settings.PORT, reload=False)
