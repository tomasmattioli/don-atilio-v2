from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from datetime import datetime

# --- CATEGORIAS ---
class CategoriaBase(BaseModel):
    nombre: str = Field(..., max_length=50)
    descripcion: Optional[str] = None
    atajo_teclado: Optional[str] = Field(None, max_length=10)
    activa: bool = True
    margen_ganancia: Decimal = Field(default=Decimal("30.00"), decimal_places=2)

class CategoriaCreate(CategoriaBase):
    pass

class CategoriaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=50)
    descripcion: Optional[str] = None
    atajo_teclado: Optional[str] = Field(None, max_length=10)
    activa: Optional[bool] = None

class CategoriaResponse(CategoriaBase):
    id_categoria: int

    class Config:
        from_attributes = True

# --- PRODUCTOS ---
class ProductoBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    descripcion: Optional[str] = None
    precio: Decimal = Field(..., gt=0, decimal_places=2)
    es_pesable: bool = False
    codigo_barras: Optional[str] = None
    activo: bool = True
    id_categoria: Optional[int] = None

class ProductoCreate(ProductoBase):
    stock_inicial: Optional[Decimal] = Field(default=Decimal("0.000"), ge=0)

class ProductoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100)
    descripcion: Optional[str] = None
    precio: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    es_pesable: Optional[bool] = None
    codigo_barras: Optional[str] = None
    activo: Optional[bool] = None
    id_categoria: Optional[int] = None

class ProductoResponse(ProductoBase):
    id_producto: int
    nombre_categoria: Optional[str] = None
    stock_actual: Optional[Decimal] = None
    stock_minimo: Optional[int] = 5
    stock_maximo: Optional[int] = 100

    class Config:
        from_attributes = True

# --- ROLES ---
class RolResponse(BaseModel):
    id_rol: int
    nombre: str

    class Config:
        from_attributes = True

# --- USUARIOS ---
class UsuarioCreate(BaseModel):
    nombre: str = Field(..., max_length=50)
    contraseña: str = Field(..., min_length=4)
    id_rol: int

class CambiarPasswordRequest(BaseModel):
    nueva_password: str = Field(..., min_length=4)

class UsuarioResponse(BaseModel):
    id_usuario: int
    nombre: str
    activo: bool
    id_rol: int

    class Config:
        from_attributes = True

# --- AUTH ---
class LoginRequest(BaseModel):
    nombre: str
    contraseña: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioResponse

# --- CAJA ---
class AbrirCajaRequest(BaseModel):
    id_usuario: Optional[int] = None
    monto_apertura: Decimal = Field(..., ge=0, decimal_places=2)

class CerrarCajaRequest(BaseModel):
    id_usuario_cierre: Optional[int] = None
    efectivo_contado: Decimal = Field(..., ge=0, decimal_places=2)
    observaciones_cierre: Optional[str] = None

class UsuarioSimpleResponse(BaseModel):
    id_usuario: int
    nombre: str

    class Config:
        from_attributes = True

class CajaSessionResponse(BaseModel):
    id_session: int
    fecha_apertura: datetime
    monto_apertura: Decimal
    estado: str
    tipo_caja: str
    id_usuario_apertura: int
    nombre_usuario_apertura: Optional[str] = None

    class Config:
        from_attributes = True

class TurnoHistorialResponse(BaseModel):
    id_session: int
    fecha_apertura: datetime
    fecha_cierre: Optional[datetime]
    monto_apertura: Decimal
    efectivo_esperado: Optional[Decimal]
    efectivo_contado: Optional[Decimal]
    diferencia: Optional[Decimal]
    observaciones_cierre: Optional[str]
    nombre_usuario_apertura: Optional[str]
    nombre_usuario_cierre: Optional[str]
    # Resumen de ventas del turno
    total_ventas: Decimal
    cantidad_ventas: int
    total_efectivo: Decimal
    total_transferencia: Decimal
    total_debito: Decimal
    total_credito: Decimal

    class Config:
        from_attributes = True

# --- VENTAS ---
class DetalleVentaCreate(BaseModel):
    id_producto: Optional[int] = None
    nombre_producto: Optional[str] = Field(None, max_length=120)
    cantidad: Decimal = Field(..., gt=0, decimal_places=3)
    precio_unitario: Decimal = Field(..., gt=0, decimal_places=2)

class DetalleVentaResponse(BaseModel):
    id_detalle: int
    id_producto: Optional[int]
    nombre_producto: Optional[str]
    cantidad: Decimal
    precio_unitario: Decimal
    subtotal: Optional[Decimal] = None

    class Config:
        from_attributes = True

class VentaPagoCreate(BaseModel):
    metodo: str  # efectivo | transferencia | tarjeta_debito | tarjeta_credito
    monto: Decimal = Field(..., gt=0, decimal_places=2)
    referencia: Optional[str] = None

class VentaPagoResponse(BaseModel):
    id_pago: int
    metodo: str
    monto: Decimal
    referencia: Optional[str] = None

    class Config:
        from_attributes = True

class VentaCreate(BaseModel):
    id_session: int
    id_usuario: Optional[int] = None
    items: List[DetalleVentaCreate]
    pagos: List[VentaPagoCreate]

class VentaResponse(BaseModel):
    id_venta: int
    fecha: datetime
    total: Decimal
    estado: str
    id_usuario: Optional[int]
    nombre_usuario: Optional[str] = None
    id_session: Optional[int] = None
    detalles: List[DetalleVentaResponse] = []
    pagos: List[VentaPagoResponse] = []

    class Config:
        from_attributes = True

