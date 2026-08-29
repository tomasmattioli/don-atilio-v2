from sqlalchemy import Column, Integer, String, Boolean, Numeric, ForeignKey, TIMESTAMP, Enum, DateTime
from app.database.database import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

class Categoria(Base):
    __tablename__ = "categorias"

    id_categoria = Column(Integer, primary_key=True, autoincrement=True)

    nombre = Column(String(50), nullable=False, unique=True)

    descripcion = Column(String(200))

    atajo_teclado = Column(String(10), unique=True)

    activa = Column(Boolean, default=True)

    margen_ganancia = Column(Numeric(5, 2), default=30.00)
    productos = relationship("Producto", back_populates="categoria")


class Rol(Base):
    __tablename__ = "roles"

    id_rol = Column(Integer, primary_key=True, autoincrement=True)

    nombre = Column(String(50), nullable=False, unique=True)
    descripcion = Column(String(200))
    fecha_creacion = Column(TIMESTAMP, server_default=func.now())

    usuarios = relationship("Usuario", back_populates="rol")


class Usuario(Base):
    __tablename__ = "usuarios"
    id_usuario = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50), nullable=False, unique=True)
    contraseña = Column(String(128), nullable=False)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(TIMESTAMP, server_default=func.now())
    ultimo_acceso = Column(TIMESTAMP, server_default=func.now())

    # Sesión única — jti del token activo y su fecha de expiración
    sesion_jti = Column(String(64), nullable=True, default=None)
    sesion_expira = Column(DateTime, nullable=True, default=None)

    id_rol = Column(Integer, ForeignKey("roles.id_rol"), nullable=False)

    rol = relationship("Rol", back_populates="usuarios")
    
class Producto(Base):
    __tablename__ = "productos"

    id_producto = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(200))
    precio = Column(Numeric(10, 2), nullable=False)
    es_pesable = Column(Boolean, default=False)
    codigo_barras = Column(String(32), unique=False)
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(TIMESTAMP, server_default=func.now())

    id_categoria = Column(Integer, ForeignKey("categorias.id_categoria"), nullable=True)

    categoria = relationship("Categoria", back_populates="productos")
    inventario = relationship("Inventario", back_populates="producto", uselist=False)

class Inventario(Base):
    __tablename__ = "inventarios"

    id_inventario = Column(Integer, primary_key=True, autoincrement=True)
    cantidad = Column(Numeric(10, 3), default=0)
    stock_minimo = Column(Integer, default=5)
    stock_maximo = Column(Integer, default=100)

    id_producto = Column(Integer, ForeignKey("productos.id_producto"), nullable=False)

    producto = relationship("Producto", back_populates="inventario")

class EstadoCaja(enum.Enum):
    abierta = "abierta"
    cerrada = "cerrada"

class TipoCaja(enum.Enum):
    turno = "turno"
    administrativa = "administrativa"

class CajaSession(Base):
    __tablename__ = "caja_sessions"

    id_session = Column(Integer, primary_key=True, autoincrement=True)
    fecha_apertura = Column(DateTime, server_default=func.now())
    monto_apertura = Column(Numeric(10, 2), nullable=False)
    fecha_cierre = Column(DateTime, nullable=True)
    efectivo_esperado = Column(Numeric(10, 2), nullable=True)
    efectivo_contado = Column(Numeric(10, 2), nullable=True)
    diferencia = Column(Numeric(10, 2), nullable=True)
    observaciones_cierre = Column(String(500), nullable=True)
    estado = Column(Enum(EstadoCaja), default=EstadoCaja.abierta)
    tipo_caja = Column(Enum(TipoCaja), default=TipoCaja.turno)

    id_usuario_apertura = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    id_usuario_cierre = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)

    usuario_apertura = relationship("Usuario", foreign_keys=[id_usuario_apertura])
    usuario_cierre = relationship("Usuario", foreign_keys=[id_usuario_cierre])

class MetodoPago(enum.Enum):
    efectivo = "efectivo"
    transferencia = "transferencia"
    tarjeta_debito = "tarjeta_debito"
    tarjeta_credito = "tarjeta_credito"

class EstadoVenta(enum.Enum):
    pendiente = "pendiente"
    completada = "completada"
    cancelada = "cancelada"

class Venta(Base):
    __tablename__ = "ventas"

    id_venta = Column(Integer, primary_key=True, autoincrement=True)
    fecha = Column(TIMESTAMP, server_default=func.now())
    total = Column(Numeric(10,2), default=0.00)
    estado = Column(Enum(EstadoVenta), default=EstadoVenta.pendiente)

    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)

    id_session = Column(Integer, ForeignKey("caja_sessions.id_session"), nullable=False)


    usuario = relationship("Usuario", foreign_keys=[id_usuario])
    session = relationship("CajaSession")
    pagos = relationship("VentaPago", back_populates="venta")
    detalles = relationship("DetalleVenta", back_populates="venta")
    
class VentaPago(Base):
    __tablename__ = "venta_pagos"
    
    id_pago = Column(Integer, primary_key=True, autoincrement=True)
    monto = Column(Numeric(10,2), nullable=False)
    metodo = Column(Enum(MetodoPago), nullable=False)

    referencia = Column(String(100), nullable=True)

    id_venta = Column(Integer, ForeignKey("ventas.id_venta"), nullable=False)

    venta = relationship("Venta", back_populates="pagos")
    
class DetalleVenta(Base):
    __tablename__ = "detalle_ventas"
    
    id_detalle = Column(Integer, primary_key=True, autoincrement=True)
    cantidad = Column(Numeric(10, 3), nullable=False)
    precio_unitario = Column(Numeric(10,2), nullable=False)

    id_producto = Column(Integer, ForeignKey("productos.id_producto"), nullable=True)

    nombre_producto = Column(String(120), nullable=True)

    id_venta = Column(Integer, ForeignKey("ventas.id_venta"), nullable=False)
    
    producto = relationship("Producto")
    venta = relationship("Venta", back_populates="detalles")

