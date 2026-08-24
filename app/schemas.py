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

class CategoriaResponse(CategoriaBase):
    id_categoria: int

    class Config:
        from_attributes = True

# --- PRODUCTOS ---
class ProductoBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    descripcion: Optional[str] = None
    precio: Decimal = Field(..., decimal_places=2)
    es_pesable: bool = False
    codigo_barras: Optional[str] = None
    activo: bool = True
    id_categoria: Optional[int] = None

class ProductoCreate(ProductoBase):
    pass

class ProductoResponse(ProductoBase):
    id_producto: int

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
    id_usuario: int
    monto_apertura: Decimal = Field(..., decimal_places=2)

class CerrarCajaRequest(BaseModel):
    id_usuario_cierre: int
    efectivo_contado: Decimal = Field(..., decimal_places=2)
    observaciones_cierre: Optional[str] = None

class CajaSessionResponse(BaseModel):
    id_session: int
    fecha_apertura: datetime
    monto_apertura: Decimal
    estado: str
    tipo_caja: str
    id_usuario_apertura: int

    class Config:
        from_attributes = True

# --- VENTAS ---
class DetalleVentaCreate(BaseModel):
    id_producto: Optional[int] = None
    nombre_producto: Optional[str] = Field(None, max_length=120)
    cantidad: Decimal = Field(..., decimal_places=3)
    precio_unitario: Decimal = Field(..., decimal_places=2)

class DetalleVentaResponse(BaseModel):
    id_detalle: int
    id_producto: Optional[int]
    nombre_producto: Optional[str]
    cantidad: Decimal
    precio_unitario: Decimal

    class Config:
        from_attributes = True

class VentaPagoCreate(BaseModel):
    metodo: str  # efectivo | transferencia | tarjeta_debito | tarjeta_credito
    monto: Decimal = Field(..., decimal_places=2)
    referencia: Optional[str] = None

class VentaPagoResponse(BaseModel):
    id_pago: int
    metodo: str
    monto: Decimal
    referencia: Optional[str]

    class Config:
        from_attributes = True

class VentaCreate(BaseModel):
    id_session: int
    id_usuario: int
    items: List[DetalleVentaCreate]
    pagos: List[VentaPagoCreate]

class VentaResponse(BaseModel):
    id_venta: int
    fecha: datetime
    total: Decimal
    estado: str
    id_usuario: Optional[int]
    detalle: List[DetalleVentaResponse] = []
    pagos: List[VentaPagoResponse] = []

    class Config:
        from_attributes = True
