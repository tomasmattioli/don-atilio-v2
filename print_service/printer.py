import logging
import textwrap
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

from escpos.printer import Dummy, Network, Serial, Usb, Win32Raw
from print_service.config import settings
from print_service.schemas import (
    TicketPayload,
    TicketItem,
    TicketPago,
    TicketCierrePayload,
    TicketResumenPeriodoPayload,
    ItemCategoriaResumen,
)

logger = logging.getLogger("print_service.printer")

def formatear_dinero(monto: Decimal) -> str:
    """Formatea un Decimal como moneda $X.XXX,XX sin usar float."""
    signo = "-" if monto < 0 else ""
    monto_abs = abs(monto)
    partes = f"{monto_abs:.2f}".split(".")
    entero = partes[0]
    decimal = partes[1]
    
    # Separador de miles con puntos
    entero_con_puntos = ""
    for i, c in enumerate(reversed(entero)):
        if i > 0 and i % 3 == 0:
            entero_con_puntos = "." + entero_con_puntos
        entero_con_puntos = c + entero_con_puntos
        
    return f"{signo}${entero_con_puntos},{decimal}"

def formatear_cantidad(cant: Decimal) -> str:
    """Formatea la cantidad: si es entera sin decimales, si es pesable con 3 decimales."""
    if cant % 1 == 0:
        return str(int(cant))
    return f"{cant:.3f}".replace(".", ",")

def ajustar_dos_columnas(izq: str, der: str, ancho: int) -> str:
    """Alinea texto a la izquierda y derecha en una misma línea."""
    espacios = ancho - len(izq) - len(der)
    if espacios < 1:
        return f"{izq} {der}"
    return izq + (" " * espacios) + der

def listar_impresoras_sistema() -> List[str]:
    """Lista las impresoras instaladas en Windows si win32print está disponible."""
    try:
        import win32print
        printers = [p[2] for p in win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS)]
        return printers
    except Exception as e:
        logger.warning(f"No se pudieron listar las impresoras del sistema: {e}")
        return []

def buscar_impresora_windows(nombre_configurado: str) -> Optional[str]:
    """Busca el nombre exacto o aproximado de la impresora en Windows."""
    impresoras = listar_impresoras_sistema()
    if not impresoras:
        return nombre_configurado
    
    # 1. Coincidencia exacta
    if nombre_configurado in impresoras:
        return nombre_configurado
    
    # 2. Coincidencia sin importar mayúsculas
    for p in impresoras:
        if p.lower() == nombre_configurado.lower():
            return p
            
    # 3. Coincidencia parcial (ej. 'SAM4S' dentro de 'SAM4S GIANT-100')
    for p in impresoras:
        if nombre_configurado.lower() in p.lower() or p.lower() in nombre_configurado.lower():
            return p
            
    return nombre_configurado

def obtener_instancia_impresora():
    """Crea y devuelve la instancia de impresora según la configuración."""
    driver = settings.PRINTER_DRIVER.lower()
    
    if driver == "win32raw":
        nombre = buscar_impresora_windows(settings.PRINTER_NAME)
        logger.info(f"Conectando a impresora Windows Win32Raw: '{nombre}'")
        return Win32Raw(printer_name=nombre)
        
    elif driver == "usb":
        logger.info(f"Conectando por PyUSB directo: Vendor=0x{settings.USB_VENDOR_ID:04x}, Product=0x{settings.USB_PRODUCT_ID:04x}")
        return Usb(settings.USB_VENDOR_ID, settings.USB_PRODUCT_ID, profile="default")
        
    elif driver == "network":
        logger.info(f"Conectando por Red: {settings.NETWORK_HOST}:{settings.NETWORK_PORT}")
        return Network(settings.NETWORK_HOST, settings.NETWORK_PORT)
        
    elif driver == "dummy":
        logger.info("Usando impresora virtual Dummy (salida en consola / memoria)")
        return Dummy()
        
    else:
        raise ValueError(f"Driver de impresora no soportado: '{driver}'. Use 'win32raw', 'usb', 'network' o 'dummy'.")

class TicketPrinter:
    def __init__(self):
        self.ancho = settings.PAPER_CHARS

    def _imprimir_items(self, p, items: List[TicketItem]):
        """Formatea e imprime la tabla de ítems con ajuste de columnas y word-wrap."""
        ancho = self.ancho
        col_cant = 5
        col_unit = 9
        col_tot = 10
        # Espacio disponible para descripción
        col_desc = ancho - col_cant - col_unit - col_tot - 3
        if col_desc < 12:
            col_desc = 12

        header_str = (
            "Cant".rjust(col_cant) + " " +
            "Descripcion".ljust(col_desc) + " " +
            "P.Unit".rjust(col_unit) + " " +
            "Total".rjust(col_tot)
        )
        p.set(align="left", bold=True)
        p.text(header_str + "\n")
        p.set(align="left", bold=False)
        p.text("-" * ancho + "\n")

        for item in items:
            cant_str = formatear_cantidad(item.cantidad).rjust(col_cant)
            unit_str = formatear_dinero(item.precio_unitario).rjust(col_unit)
            
            subtotal = item.subtotal if item.subtotal is not None else (item.cantidad * item.precio_unitario)
            tot_str = formatear_dinero(subtotal).rjust(col_tot)
            
            desc_completa = item.nombre_producto.strip()
            lineas_desc = textwrap.wrap(desc_completa, width=col_desc)
            
            if not lineas_desc:
                lineas_desc = [""]
                
            # Primera línea con cantidades y precios
            linea_1 = f"{cant_str} {lineas_desc[0].ljust(col_desc)} {unit_str} {tot_str}\n"
            p.text(linea_1)
            
            # Líneas restantes de la descripción (indentadas)
            indent = " " * (col_cant + 1)
            for chunk in lineas_desc[1:]:
                p.text(f"{indent}{chunk.ljust(col_desc)}\n")

    def imprimir_ticket(self, datos: TicketPayload) -> bool:
        """Arma e imprime el ticket completo usando comandos ESC/POS profesionales."""
        p = obtener_instancia_impresora()
        ancho = self.ancho
        
        try:
            # 1. Encabezado del negocio (Centrado)
            p.set(align="center", bold=True, double_height=True, double_width=True)
            p.text(f"{settings.BUSINESS_NAME}\n")
            
            p.set(align="center", bold=True, double_height=False, double_width=False)
            if settings.BUSINESS_SUBTITLE:
                p.text(f"{settings.BUSINESS_SUBTITLE}\n")
            p.set(align="center", bold=False, double_height=False, double_width=False)
            if settings.BUSINESS_ADDRESS:
                p.text(f"{settings.BUSINESS_ADDRESS}\n")
            if settings.BUSINESS_PHONE:
                p.text(f"{settings.BUSINESS_PHONE}\n")
            if settings.BUSINESS_CUIT:
                p.text(f"{settings.BUSINESS_CUIT}\n")
                
            p.text("=" * ancho + "\n")
            
            # 2. Identificación del tipo de ticket
            if settings.TICKET_TITLE:
                p.set(align="center", bold=True, double_height=False, double_width=False)
                p.text(f"{settings.TICKET_TITLE}\n")
                p.text("-" * ancho + "\n")
            
            # 2. Metadatos de la venta (Fecha, Ticket, Vendedor, Cliente)
            p.set(align="left", bold=False)
            fecha_dt = datos.fecha or datetime.now()
            fecha_str = fecha_dt.strftime("%d/%m/%Y %H:%M")
            num_tkt = datos.numero_ticket or (f"#{datos.id_venta:06d}" if datos.id_venta else "#000000")
            
            p.text(ajustar_dos_columnas(f"Fecha: {fecha_str}", f"Ticket: {num_tkt}", ancho) + "\n")
            
            vendedor_str = f"Vendedor: {datos.vendedor or 'Caja'}"
            cliente_str = f"Cliente: {datos.cliente or 'Cons. Final'}"
            p.text(ajustar_dos_columnas(vendedor_str, cliente_str, ancho) + "\n")
            
            p.text("-" * ancho + "\n")
            
            # 3. Lista de Ítems
            self._imprimir_items(p, datos.items)
            
            p.text("-" * ancho + "\n")
            
            # 4. Total destacado (Grande y Negrita)
            total_formateado = formatear_dinero(datos.total)
            
            # Línea de TOTAL
            p.set(align="right", bold=True, double_height=True, double_width=True)
            p.text(f"TOTAL: {total_formateado}\n")
            
            p.set(align="left", bold=False, double_height=False, double_width=False)
            p.text("=" * ancho + "\n")
            
            # 5. Desglose de Pagos Combinados
            p.set(align="left", bold=True)
            p.text("FORMA DE PAGO:\n")
            p.set(align="left", bold=False)
            
            nombres_metodos = {
                "efectivo": "Efectivo",
                "transferencia": "Transferencia",
                "tarjeta_debito": "Tarjeta Debito",
                "tarjeta_credito": "Tarjeta Credito",
            }
            
            for pago in datos.pagos:
                nombre_metodo = nombres_metodos.get(pago.metodo, pago.metodo.capitalize())
                monto_pago = formatear_dinero(pago.monto)
                linea_pago = ajustar_dos_columnas(f" - {nombre_metodo}:", monto_pago, ancho)
                p.text(linea_pago + "\n")
                    
            p.text("-" * ancho + "\n")
            
            # 6. Pie del Ticket
            p.set(align="center", bold=False)
            if settings.FOOTER_THANKS:
                p.text(f"{settings.FOOTER_THANKS}\n")
            if settings.FOOTER_LEGAL:
                p.set(align="center", bold=True)
                p.text(f"{settings.FOOTER_LEGAL}\n")
                p.set(align="center", bold=False)
                
            p.text("=" * ancho + "\n")
            
            # 7. Avance de papel y Corte automático
            p.text("\n\n")
            if settings.CUT_PAPER:
                p.cut()
                
            # 8. Apertura de cajón si corresponde
            if datos.abrir_cajon or settings.OPEN_DRAWER:
                try:
                    p.cashdraw(2)
                except Exception as e_cajon:
                    logger.warning(f"No se pudo abrir el cajon de dinero: {e_cajon}")

            # Si es dummy, mostramos salida en logs
            if isinstance(p, Dummy):
                logger.info("Ticket generado en Dummy:")

            return True

        finally:
            try:
                p.close()
            except Exception:
                pass

    def imprimir_prueba(self) -> bool:
        """Imprime un ticket de diagnóstico y prueba de hardware."""
        p = obtener_instancia_impresora()
        ancho = self.ancho
        
        try:
            p.set(align="center", bold=True, double_height=True)
            p.text("PRUEBA DE IMPRESORA\n")
            p.set(align="center", bold=False, double_height=False)
            p.text(f"{settings.BUSINESS_NAME}\n")
            p.text(f"Fecha: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n")
            p.text("=" * ancho + "\n")
            
            p.set(align="left", bold=False)
            p.text(f"Driver: {settings.PRINTER_DRIVER}\n")
            p.text(f"Nombre: {settings.PRINTER_NAME}\n")
            p.text(f"Ancho configurado: {ancho} cols\n")
            p.text("-" * ancho + "\n")
            
            p.text("Prueba de estilos de texto:\n")
            p.set(bold=True)
            p.text(" - Texto en Negrita (Bold)\n")
            p.set(bold=False, underline=1)
            p.text(" - Texto Subrayado (Underline)\n")
            p.set(underline=0, double_height=True)
            p.text(" - Doble Altura (Double Height)\n")
            p.set(double_height=False, double_width=True)
            p.text(" - Doble Ancho\n")
            p.set(double_width=False)
            
            p.text("-" * ancho + "\n")
            p.set(align="center")
            p.text("Alineacion centrada\n")
            p.set(align="right")
            p.text("Alineacion derecha\n")
            p.set(align="left")
            p.text("Caracteres: $ 0123456789\n")
            p.text("Espanol: Cancion Arbol Cafe Ano Nino\n")
            
            p.text("=" * ancho + "\n")
            p.set(align="center", bold=True)
            p.text("¡IMPRESION DE PRUEBA EXITOSA!\n")
            p.text("\n\n")
            
            if settings.CUT_PAPER:
                p.cut()
                
            return True
        finally:
            try:
                p.close()
            except Exception:
                pass

    def imprimir_cierre_caja(self, datos: TicketCierrePayload) -> bool:
        """Arma e imprime el ticket de Cierre de Turno / Arqueo de Caja."""
        p = obtener_instancia_impresora()
        ancho = self.ancho
        
        try:
            # 1. Encabezado
            p.set(align="center", bold=True, double_height=True)
            p.text(f"{settings.BUSINESS_NAME}\n")
            p.set(align="center", bold=True, double_height=False)
            p.text("CIERRE DE CAJA / TURNO\n")
            p.set(align="center", bold=False)
            if settings.BUSINESS_ADDRESS:
                p.text(f"{settings.BUSINESS_ADDRESS}\n")
            p.text("=" * ancho + "\n")
            
            # 2. Datos del Turno y Cajero
            p.set(align="left", bold=False)
            p.text(ajustar_dos_columnas(f"Turno: #{datos.id_session}", f"Cajero: {datos.vendedor or 'Cajero'}", ancho) + "\n")
            
            f_ape = datos.fecha_apertura.strftime("%d/%m/%Y %H:%M") if datos.fecha_apertura else "-"
            f_cie = datos.fecha_cierre.strftime("%d/%m/%Y %H:%M") if datos.fecha_cierre else datetime.now().strftime("%d/%m/%Y %H:%M")
            p.text(f"Apertura: {f_ape}\n")
            p.text(f"Cierre:   {f_cie}\n")
            p.text("-" * ancho + "\n")
            
            # 3. Resumen de Ventas
            p.set(align="left", bold=True)
            p.text("RESUMEN DE VENTAS\n")
            p.set(align="left", bold=False)
            
            p.text(ajustar_dos_columnas("Cantidad de Ventas:", str(datos.cantidad_ventas), ancho) + "\n")
            p.text(ajustar_dos_columnas("Total Facturado:", formatear_dinero(datos.total_ventas), ancho) + "\n")
            p.text("-" * ancho + "\n")
            
            # 4. Desglose por Método de Pago
            p.set(align="left", bold=True)
            p.text("COBROS POR MEDIO DE PAGO:\n")
            p.set(align="left", bold=False)
            p.text(ajustar_dos_columnas(" - Efectivo:", formatear_dinero(datos.total_efectivo), ancho) + "\n")
            p.text(ajustar_dos_columnas(" - Debito:", formatear_dinero(datos.total_debito), ancho) + "\n")
            p.text(ajustar_dos_columnas(" - Credito:", formatear_dinero(datos.total_credito), ancho) + "\n")
            p.text(ajustar_dos_columnas(" - Transferencia:", formatear_dinero(datos.total_transferencia), ancho) + "\n")
            p.text("-" * ancho + "\n")
            
            # 5. Arqueo de Efectivo
            p.set(align="left", bold=True)
            p.text("ARQUEO DE EFECTIVO (GAVETA):\n")
            p.set(align="left", bold=False)
            p.text(ajustar_dos_columnas(" (+) Fondo Inicial:", formatear_dinero(datos.monto_apertura), ancho) + "\n")
            p.text(ajustar_dos_columnas(" (+) Ventas Efectivo:", formatear_dinero(datos.total_efectivo), ancho) + "\n")
            p.text(ajustar_dos_columnas(" (=) Ef. Esperado:", formatear_dinero(datos.efectivo_esperado or Decimal("0")), ancho) + "\n")
            p.text(ajustar_dos_columnas(" (=) Ef. Declarado:", formatear_dinero(datos.efectivo_contado or Decimal("0")), ancho) + "\n")
            
            dif = datos.diferencia or Decimal("0")
            dif_str = formatear_dinero(dif)
            if dif > 0:
                dif_str = f"+{dif_str}"
            p.set(align="left", bold=True)
            p.text(ajustar_dos_columnas(" DIFERENCIA:", dif_str, ancho) + "\n")
            p.set(align="left", bold=False)
            
            if datos.observaciones:
                p.text("-" * ancho + "\n")
                p.text(f"Obs: {datos.observaciones.strip()}\n")
                
            p.text("=" * ancho + "\n")
            p.text("\n\n")
            p.set(align="center")
            p.text("--------------------------------\n")
            p.text(f"Firma: {datos.vendedor or 'Cajero'}\n")
            p.text("\n\n")
            
            if settings.CUT_PAPER:
                p.cut()
                
            return True
        finally:
            try:
                p.close()
            except Exception:
                pass

    def imprimir_resumen_periodo(self, datos: TicketResumenPeriodoPayload) -> bool:
        """Arma e imprime el ticket de Resumen de Ventas por Período."""
        p = obtener_instancia_impresora()
        ancho = self.ancho
        
        try:
            # 1. Encabezado
            p.set(align="center", bold=True, double_height=True)
            p.text(f"{settings.BUSINESS_NAME}\n")
            p.set(align="center", bold=True, double_height=False)
            p.text(f"{datos.titulo or 'RESUMEN DE VENTAS'}\n")
            p.set(align="center", bold=False)
            p.text("=" * ancho + "\n")
            
            p.set(align="left", bold=False)
            if datos.fecha_desde and datos.fecha_hasta:
                p.text(f"Periodo: {datos.fecha_desde} al {datos.fecha_hasta}\n")
            elif datos.fecha_desde:
                p.text(f"Fecha: {datos.fecha_desde}\n")
            
            if datos.usuario and datos.usuario != "Todos":
                p.text(f"Cajero: {datos.usuario}\n")
            p.text(f"Emitido: {datetime.now().strftime('%d/%m/%Y %H:%M')}\n")
            p.text("-" * ancho + "\n")
            
            # 2. Totales
            p.set(align="left", bold=True)
            p.text(ajustar_dos_columnas("Ventas Realizadas:", str(datos.cantidad_ventas), ancho) + "\n")
            p.set(align="left", bold=True, double_height=True)
            p.text(ajustar_dos_columnas("TOTAL RECAUDADO:", formatear_dinero(datos.total_ventas), ancho) + "\n")
            p.set(align="left", bold=False, double_height=False)
            p.text("-" * ancho + "\n")
            
            # 3. Desglose Medios de Pago
            p.set(align="left", bold=True)
            p.text("DESGLOSE POR MEDIO DE PAGO:\n")
            p.set(align="left", bold=False)
            p.text(ajustar_dos_columnas(" - Efectivo:", formatear_dinero(datos.total_efectivo), ancho) + "\n")
            p.text(ajustar_dos_columnas(" - Debito:", formatear_dinero(datos.total_debito), ancho) + "\n")
            p.text(ajustar_dos_columnas(" - Credito:", formatear_dinero(datos.total_credito), ancho) + "\n")
            p.text(ajustar_dos_columnas(" - Transferencia:", formatear_dinero(datos.total_transferencia), ancho) + "\n")
            
            # 4. Categorías si están presentes
            if datos.categorias and len(datos.categorias) > 0:
                p.text("-" * ancho + "\n")
                p.set(align="left", bold=True)
                p.text("VENTAS POR CATEGORIA:\n")
                p.set(align="left", bold=False)
                for cat in datos.categorias:
                    linea_cat = f"{cat.categoria} ({formatear_cantidad(cat.unidades)}u)"
                    p.text(ajustar_dos_columnas(linea_cat, formatear_dinero(cat.total), ancho) + "\n")
                    
            p.text("=" * ancho + "\n\n\n")
            
            if settings.CUT_PAPER:
                p.cut()
                
            return True
        finally:
            try:
                p.close()
            except Exception:
                pass

    def abrir_cajon(self) -> bool:
        """Envía el pulso para abrir el cajón monedero."""
        p = obtener_instancia_impresora()
        try:
            p.cashdraw(2)
            return True
        finally:
            try:
                p.close()
            except Exception:
                pass

printer_service = TicketPrinter()
