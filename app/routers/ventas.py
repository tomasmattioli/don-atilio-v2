from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from app import models, schemas, auth
from app.database.database import get_db

router = APIRouter(prefix="/ventas", tags=["Ventas"])

METODOS_VALIDOS = {m.value for m in models.MetodoPago}


def _construir_venta_response(v: models.Venta, db: Session) -> schemas.VentaResponse:
    detalles_resp = []
    for d in v.detalles:
        nombre = d.nombre_producto or (d.producto.nombre if d.producto else f"Producto #{d.id_producto}")
        detalles_resp.append(schemas.DetalleVentaResponse(
            id_detalle=d.id_detalle,
            id_producto=d.id_producto,
            nombre_producto=nombre,
            cantidad=d.cantidad,
            precio_unitario=d.precio_unitario,
            subtotal=d.cantidad * d.precio_unitario,
        ))

    pagos_resp = [
        schemas.VentaPagoResponse(
            id_pago=p.id_pago,
            metodo=p.metodo.value if hasattr(p.metodo, 'value') else str(p.metodo),
            monto=p.monto,
            referencia=p.referencia
        ) for p in v.pagos
    ]

    nombre_usuario = None
    if v.usuario:
        nombre_usuario = v.usuario.nombre
    else:
        u = db.query(models.Usuario).filter(models.Usuario.id_usuario == v.id_usuario).first()
        if u:
            nombre_usuario = u.nombre

    return schemas.VentaResponse(
        id_venta=v.id_venta,
        fecha=v.fecha,
        total=v.total,
        estado=v.estado.value if hasattr(v.estado, 'value') else str(v.estado),
        id_usuario=v.id_usuario,
        nombre_usuario=nombre_usuario,
        id_session=v.id_session,
        detalles=detalles_resp,
        pagos=pagos_resp
    )


@router.post("", response_model=schemas.VentaResponse, status_code=201)
def crear_venta(
    datos: schemas.VentaCreate,
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if datos.id_usuario is not None and datos.id_usuario != user_id_jwt:
        raise HTTPException(status_code=403, detail="No podés registrar una venta a nombre de otro usuario")

    # 1. Validar que la sesión de caja esté abierta y pertenezca al usuario
    caja = db.query(models.CajaSession).filter(
        models.CajaSession.id_session == datos.id_session,
        models.CajaSession.estado == models.EstadoCaja.abierta
    ).first()
    if not caja:
        raise HTTPException(status_code=400, detail="La sesión de caja no existe o está cerrada")
    if caja.id_usuario_apertura != user_id_jwt:
        raise HTTPException(status_code=403, detail="La sesión de caja indicada pertenece a otro usuario")

    # 2. Validar que haya al menos un ítem y un pago
    if not datos.items:
        raise HTTPException(status_code=400, detail="La venta debe tener al menos un ítem")
    if not datos.pagos:
        raise HTTPException(status_code=400, detail="La venta debe tener al menos un pago")

    # 3. Validar métodos de pago
    for pago in datos.pagos:
        if pago.metodo not in METODOS_VALIDOS:
            raise HTTPException(status_code=400, detail=f"Método de pago inválido: {pago.metodo}. Válidos: {METODOS_VALIDOS}")

    # 4. Calcular total de la venta (redondeado a 2 decimales)
    total = sum(
        (item.cantidad * item.precio_unitario).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        for item in datos.items
    )

    # 5. Validar que los pagos cubran exactamente el total
    total_pagado = sum(p.monto for p in datos.pagos)
    if total_pagado != total:
        raise HTTPException(
            status_code=400,
            detail=f"El total pagado (${total_pagado}) no coincide con el total de la venta (${total})"
        )

    # 6. Crear la venta — todo lo siguiente es una sola transacción
    venta = models.Venta(
        id_usuario=user_id_jwt,
        id_session=datos.id_session,
        total=total,
        estado=models.EstadoVenta.completada,
    )
    db.add(venta)
    db.flush()  # Obtiene el id_venta sin hacer commit todavía

    # 7. Crear los ítems y descontar stock
    for item in datos.items:
        nombre_prod = item.nombre_producto
        if not nombre_prod and item.id_producto is not None:
            prod = db.query(models.Producto).filter(models.Producto.id_producto == item.id_producto).first()
            if prod:
                nombre_prod = prod.nombre

        # Validar que producto libre tenga nombre válido
        if item.id_producto is None and (not nombre_prod or not nombre_prod.strip()):
            raise HTTPException(status_code=400, detail="Un ítem sin producto registrado debe tener un nombre válido")

        detalle = models.DetalleVenta(
            id_venta=venta.id_venta,
            id_producto=item.id_producto,
            nombre_producto=nombre_prod,
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

    return _construir_venta_response(venta, db)


@router.get("", response_model=List[schemas.VentaResponse])
def listar_ventas(
    fecha_desde: Optional[date] = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    fecha_hasta: Optional[date] = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    id_usuario: Optional[int] = Query(None, description="Filtrar por vendedor"),
    id_session: Optional[int] = Query(None, description="Filtrar por sesión de caja"),
    limit: int = Query(200, le=1000),
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Venta).options(
        joinedload(models.Venta.detalles).joinedload(models.DetalleVenta.producto),
        joinedload(models.Venta.pagos),
        joinedload(models.Venta.usuario)
    )

    if fecha_desde:
        query = query.filter(func.date(models.Venta.fecha) >= fecha_desde)
    if fecha_hasta:
        query = query.filter(func.date(models.Venta.fecha) <= fecha_hasta)
    if id_usuario:
        query = query.filter(models.Venta.id_usuario == id_usuario)
    if id_session:
        query = query.filter(models.Venta.id_session == id_session)

    ventas = query.order_by(models.Venta.fecha.desc()).limit(limit).all()
    return [_construir_venta_response(v, db) for v in ventas]


# ── Helpers de limpieza ───────────────────────────────────────────────────────

def _filtro_ventas_por_rango(query, fecha_desde: Optional[date], fecha_hasta: Optional[date]):
    """Aplica filtros de fecha a una query de Venta. Sin fechas = todas."""
    if fecha_desde:
        query = query.filter(func.date(models.Venta.fecha) >= fecha_desde)
    if fecha_hasta:
        query = query.filter(func.date(models.Venta.fecha) <= fecha_hasta)
    return query


@router.get("/resumen-a-borrar", response_model=schemas.LimpiezaResumen)
def resumen_a_borrar(
    fecha_desde: Optional[date] = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    fecha_hasta: Optional[date] = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Vista previa: cuántas ventas y por cuánto monto se borrarían con el filtro dado. No modifica nada."""
    auth.exigir_admin(user_id_jwt, db)

    query = db.query(
        func.count(models.Venta.id_venta),
        func.coalesce(func.sum(models.Venta.total), 0),
    )
    query = _filtro_ventas_por_rango(query, fecha_desde, fecha_hasta)
    cantidad, monto = query.one()

    return schemas.LimpiezaResumen(
        cantidad_ventas=int(cantidad),
        monto_total=monto,
    )


@router.delete("/limpiar", response_model=schemas.LimpiezaResultado)
def limpiar_ventas(
    fecha_desde: Optional[date] = Query(None, description="Fecha inicio (YYYY-MM-DD). Sin valor = sin límite."),
    fecha_hasta: Optional[date] = Query(None, description="Fecha fin (YYYY-MM-DD). Sin valor = sin límite."),
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """
    Borra ventas, sus ítems (detalle_ventas) y sus pagos (venta_pagos) dentro del rango indicado.
    Si no se especifica ninguna fecha, borra TODAS las ventas.
    Opera en una sola transacción: si algo falla, nada queda a medias.
    Stock e inventario NO se tocan. Turnos de caja (caja_sessions) NO se tocan.
    Solo accesible para Admin (rol 1).
    """
    auth.exigir_admin(user_id_jwt, db)

    # 1. Obtener IDs y totales de ventas a borrar según el filtro
    venta_query = db.query(models.Venta.id_venta, models.Venta.total)
    venta_query = _filtro_ventas_por_rango(venta_query, fecha_desde, fecha_hasta)
    ventas_a_borrar = venta_query.all()

    if not ventas_a_borrar:
        return schemas.LimpiezaResultado(
            ventas_borradas=0,
            detalles_borrados=0,
            pagos_borrados=0,
            monto_total=Decimal("0.00"),
        )

    ids = [v.id_venta for v in ventas_a_borrar]
    monto_total = sum(v.total for v in ventas_a_borrar)

    # 2. Borrar ítems y pagos primero (FK → ventas), luego las ventas.
    #    Todo en la misma transacción implícita de SQLAlchemy.
    pagos_borrados = (
        db.query(models.VentaPago)
        .filter(models.VentaPago.id_venta.in_(ids))
        .delete(synchronize_session=False)
    )
    detalles_borrados = (
        db.query(models.DetalleVenta)
        .filter(models.DetalleVenta.id_venta.in_(ids))
        .delete(synchronize_session=False)
    )
    ventas_borradas = (
        db.query(models.Venta)
        .filter(models.Venta.id_venta.in_(ids))
        .delete(synchronize_session=False)
    )

    # 3. Un único commit — si algo falló arriba, esto lanza excepción y nada se persiste
    db.commit()

    return schemas.LimpiezaResultado(
        ventas_borradas=ventas_borradas,
        detalles_borrados=detalles_borrados,
        pagos_borrados=pagos_borrados,
        monto_total=monto_total,
    )


# ── Ruta con parámetro dinámico — debe ir DESPUÉS de todas las rutas fijas ────

@router.get("/{id_venta}", response_model=schemas.VentaResponse)
def obtener_venta(
    id_venta: int,
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    venta = db.query(models.Venta).options(
        joinedload(models.Venta.detalles).joinedload(models.DetalleVenta.producto),
        joinedload(models.Venta.pagos),
        joinedload(models.Venta.usuario)
    ).filter(models.Venta.id_venta == id_venta).first()

    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    return _construir_venta_response(venta, db)
