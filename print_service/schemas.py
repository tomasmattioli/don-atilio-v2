from pydantic import BaseModel, Field
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

class TicketItem(BaseModel):
    nombre_producto: str
    cantidad: Decimal
    precio_unitario: Decimal
    subtotal: Optional[Decimal] = None

class TicketPago(BaseModel):
    metodo: str  # efectivo, transferencia, tarjeta_debito, tarjeta_credito
    monto: Decimal
    referencia: Optional[str] = None

class TicketPayload(BaseModel):
    id_venta: Optional[int] = None
    numero_ticket: Optional[str] = None
    fecha: Optional[datetime] = None
    vendedor: Optional[str] = "Vendedor"
    items: List[TicketItem]
    total: Decimal
    pagos: List[TicketPago]
    abrir_cajon: Optional[bool] = False
    cliente: Optional[str] = "Consumidor Final"

class TicketCierrePayload(BaseModel):
    id_session: int
    vendedor: Optional[str] = "Cajero"
    fecha_apertura: datetime
    fecha_cierre: Optional[datetime] = None
    monto_apertura: Decimal = Decimal("0")
    total_ventas: Decimal = Decimal("0")
    cantidad_ventas: int = 0
    total_efectivo: Decimal = Decimal("0")
    total_transferencia: Decimal = Decimal("0")
    total_debito: Decimal = Decimal("0")
    total_credito: Decimal = Decimal("0")
    efectivo_esperado: Optional[Decimal] = Decimal("0")
    efectivo_contado: Optional[Decimal] = Decimal("0")
    diferencia: Optional[Decimal] = Decimal("0")
    observaciones: Optional[str] = None

class ItemCategoriaResumen(BaseModel):
    categoria: str
    unidades: Decimal
    total: Decimal

class TicketResumenPeriodoPayload(BaseModel):
    titulo: Optional[str] = "RESUMEN DE VENTAS"
    fecha_desde: Optional[str] = None
    fecha_hasta: Optional[str] = None
    usuario: Optional[str] = "Todos"
    total_ventas: Decimal = Decimal("0")
    cantidad_ventas: int = 0
    total_efectivo: Decimal = Decimal("0")
    total_transferencia: Decimal = Decimal("0")
    total_debito: Decimal = Decimal("0")
    total_credito: Decimal = Decimal("0")
    categorias: Optional[List[ItemCategoriaResumen]] = []

class StatusResponse(BaseModel):
    status: str
    printer_driver: str
    printer_name: Optional[str] = None
    paper_width: int
    printers_detected: List[str] = []
