from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal

from app import models, schemas
from app.database.database import get_db

router = APIRouter(prefix="/ventas", tags=["Ventas"])

METODOS_VALIDOS = {m.value for m in models.MetodoPago}


@router.post("", response_model=schemas.VentaResponse, status_code=201)
def crear_venta(datos: schemas.VentaCreate, db: Session = Depends(get_db)):
    # 1. Validar que la sesión de caja esté abierta
    caja = db.query(models.CajaSession).filter(
        models.CajaSession.id_session == datos.id_session,
        models.CajaSession.estado == models.EstadoCaja.abierta
    ).first()
    if not caja:
        raise HTTPException(status_code=400, detail="La sesión de caja no existe o está cerrada")

    # 2. Validar que haya al menos un ítem y un pago
    if not datos.items:
        raise HTTPException(status_code=400, detail="La venta debe tener al menos un ítem")
    if not datos.pagos:
        raise HTTPException(status_code=400, detail="La venta debe tener al menos un pago")

    # 3. Validar métodos de pago
    for pago in datos.pagos:
        if pago.metodo not in METODOS_VALIDOS:
            raise HTTPException(status_code=400, detail=f"Método de pago inválido: {pago.metodo}. Válidos: {METODOS_VALIDOS}")

    # 4. Calcular total de la venta
    total = sum(item.cantidad * item.precio_unitario for item in datos.items)

    # 5. Validar que los pagos cubran el total
    total_pagado = sum(p.monto for p in datos.pagos)
    if total_pagado < total:
        raise HTTPException(
            status_code=400,
            detail=f"El total pagado ({total_pagado}) no cubre el total de la venta ({total})"
        )

    # 6. Crear la venta — todo lo siguiente es una sola transacción
    venta = models.Venta(
        id_usuario=datos.id_usuario,
        id_session=datos.id_session,
        total=total,
        estado=models.EstadoVenta.completada,
    )
    db.add(venta)
    db.flush()  # Obtiene el id_venta sin hacer commit todavía

    # 7. Crear los ítems y descontar stock
    for item in datos.items:
        # Validar que producto libre tenga nombre
        if item.id_producto is None and not item.nombre_producto:
            raise HTTPException(status_code=400, detail="Un ítem sin producto registrado debe tener nombre_producto")

        detalle = models.DetalleVenta(
            id_venta=venta.id_venta,
            id_producto=item.id_producto,
            nombre_producto=item.nombre_producto,
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,
        )
        db.add(detalle)

        # Descontar stock si el producto está registrado
        if item.id_producto is not None:
            inventario = db.query(models.Inventario).filter(
                models.Inventario.id_producto == item.id_producto
            ).first()
            if inventario:
                inventario.cantidad = max(Decimal("0"), inventario.cantidad - item.cantidad)

    # 8. Crear los pagos
    for pago in datos.pagos:
        db.add(models.VentaPago(
            id_venta=venta.id_venta,
            metodo=models.MetodoPago(pago.metodo),
            monto=pago.monto,
            referencia=pago.referencia,
        ))

    # 9. Commit único — si algo falló arriba, nada se guardó
    db.commit()
    db.refresh(venta)
    return venta


@router.get("", response_model=List[schemas.VentaResponse])
def listar_ventas(db: Session = Depends(get_db)):
    return db.query(models.Venta).order_by(models.Venta.fecha.desc()).limit(100).all()


@router.get("/{id_venta}", response_model=schemas.VentaResponse)
def obtener_venta(id_venta: int, db: Session = Depends(get_db)):
    venta = db.query(models.Venta).filter(models.Venta.id_venta == id_venta).first()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    return venta
