from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal

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
