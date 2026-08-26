from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date
from decimal import Decimal

from app import models, schemas, auth
from app.database.database import get_db

router = APIRouter(prefix="/caja", tags=["Caja"])


@router.post("/abrir", response_model=schemas.CajaSessionResponse)
def abrir_caja(
    datos: schemas.AbrirCajaRequest,
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    usuario = db.query(models.Usuario).filter(models.Usuario.id_usuario == user_id_jwt).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if usuario.id_rol == 1:
        raise HTTPException(status_code=403, detail="El administrador no realiza ventas ni opera cajas")

    # Verificar que ESTE usuario autenticado no tenga ya una caja abierta
    abierta = db.query(models.CajaSession).filter(
        models.CajaSession.estado == models.EstadoCaja.abierta,
        models.CajaSession.id_usuario_apertura == user_id_jwt,
    ).first()
    if abierta:
        raise HTTPException(status_code=409, detail=f"Ya tenés una caja abierta (ID: {abierta.id_session})")

    session = models.CajaSession(
        id_usuario_apertura=user_id_jwt,
        monto_apertura=datos.monto_apertura,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/activa", response_model=schemas.CajaSessionResponse)
def caja_activa(
    id_usuario: Optional[int] = Query(None, description="ID del usuario (opcional)"),
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    if id_usuario is not None and id_usuario != user_id_jwt:
        raise HTTPException(status_code=403, detail="No podés consultar la caja de otro usuario")

    query = db.query(models.CajaSession).filter(
        models.CajaSession.estado == models.EstadoCaja.abierta,
        models.CajaSession.id_usuario_apertura == user_id_jwt
    )
    session = query.first()
    if not session:
        raise HTTPException(status_code=404, detail="No hay ninguna caja abierta")
    usuario = db.query(models.Usuario).filter(
        models.Usuario.id_usuario == session.id_usuario_apertura
    ).first()
    result = schemas.CajaSessionResponse.model_validate(session)
    result.nombre_usuario_apertura = usuario.nombre if usuario else None
    return result


@router.get("/abiertas")
def cajas_abiertas(
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    sessions = db.query(models.CajaSession).filter(
        models.CajaSession.estado == models.EstadoCaja.abierta
    ).all()
    resultado = []
    for s in sessions:
        usuario = db.query(models.Usuario).filter(
            models.Usuario.id_usuario == s.id_usuario_apertura
        ).first()
        item = schemas.CajaSessionResponse.model_validate(s)
        item.nombre_usuario_apertura = usuario.nombre if usuario else None
        resultado.append(item)
    return resultado


@router.post("/cerrar/{id_session}", response_model=schemas.TurnoHistorialResponse)
def cerrar_caja(
    id_session: int,
    datos: schemas.CerrarCajaRequest,
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if datos.id_usuario_cierre is not None and datos.id_usuario_cierre != user_id_jwt:
        raise HTTPException(status_code=403, detail="No podés cerrar la caja de otro usuario")

    session = db.query(models.CajaSession).filter(
        models.CajaSession.id_session == id_session,
        models.CajaSession.estado == models.EstadoCaja.abierta
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesión de caja no encontrada o ya cerrada")

    # Calcular ventas y desgloses de la sesión
    ventas = db.query(models.Venta).filter(
        models.Venta.id_session == id_session,
        models.Venta.estado == models.EstadoVenta.completada
    ).all()

    total_ventas = Decimal("0")
    cantidad_ventas = len(ventas)
    totales = {m: Decimal("0") for m in models.MetodoPago}
    for venta in ventas:
        total_ventas += venta.total
        for pago in venta.pagos:
            totales[pago.metodo] += pago.monto

    efectivo_ventas = totales[models.MetodoPago.efectivo]
    efectivo_esperado = session.monto_apertura + efectivo_ventas
    diferencia = datos.efectivo_contado - efectivo_esperado

    session.id_usuario_cierre = user_id_jwt
    session.efectivo_contado = datos.efectivo_contado
    session.efectivo_esperado = efectivo_esperado
    session.diferencia = diferencia
    session.observaciones_cierre = datos.observaciones_cierre
    session.estado = models.EstadoCaja.cerrada
    session.fecha_cierre = func.now()

    db.commit()
    db.refresh(session)

    u_apertura = db.query(models.Usuario).filter(models.Usuario.id_usuario == session.id_usuario_apertura).first()
    u_cierre = db.query(models.Usuario).filter(models.Usuario.id_usuario == user_id_jwt).first()

    return schemas.TurnoHistorialResponse(
        id_session=session.id_session,
        fecha_apertura=session.fecha_apertura,
        fecha_cierre=session.fecha_cierre,
        monto_apertura=session.monto_apertura,
        efectivo_esperado=session.efectivo_esperado,
        efectivo_contado=session.efectivo_contado,
        diferencia=session.diferencia,
        observaciones_cierre=session.observaciones_cierre,
        nombre_usuario_apertura=u_apertura.nombre if u_apertura else None,
        nombre_usuario_cierre=u_cierre.nombre if u_cierre else None,
        total_ventas=total_ventas,
        cantidad_ventas=cantidad_ventas,
        total_efectivo=totales[models.MetodoPago.efectivo],
        total_transferencia=totales[models.MetodoPago.transferencia],
        total_debito=totales[models.MetodoPago.tarjeta_debito],
        total_credito=totales[models.MetodoPago.tarjeta_credito],
    )


@router.get("/historial", response_model=List[schemas.TurnoHistorialResponse])
def historial_turnos(
    fecha_desde: Optional[date] = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    fecha_hasta: Optional[date] = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    id_usuario: Optional[int] = Query(None, description="Filtrar por cajero"),
    limit: int = Query(100, le=500),
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Devuelve los turnos cerrados con resumen de ventas por método de pago."""
    query = db.query(models.CajaSession).filter(
        models.CajaSession.estado == models.EstadoCaja.cerrada
    )
    if fecha_desde:
        query = query.filter(func.date(models.CajaSession.fecha_apertura) >= fecha_desde)
    if fecha_hasta:
        query = query.filter(func.date(models.CajaSession.fecha_apertura) <= fecha_hasta)
    if id_usuario:
        query = query.filter(models.CajaSession.id_usuario_apertura == id_usuario)

    sessions = query.order_by(models.CajaSession.fecha_apertura.desc()).limit(limit).all()

    resultado = []
    for s in sessions:
        # Usuarios
        u_apertura = db.query(models.Usuario).filter(models.Usuario.id_usuario == s.id_usuario_apertura).first()
        u_cierre = None
        if s.id_usuario_cierre:
            u_cierre = db.query(models.Usuario).filter(models.Usuario.id_usuario == s.id_usuario_cierre).first()

        # Ventas del turno
        ventas = db.query(models.Venta).filter(
            models.Venta.id_session == s.id_session,
            models.Venta.estado == models.EstadoVenta.completada
        ).all()

        total_ventas = Decimal("0")
        cantidad_ventas = len(ventas)
        totales = {m: Decimal("0") for m in models.MetodoPago}
        for v in ventas:
            total_ventas += v.total
            for p in v.pagos:
                totales[p.metodo] += p.monto

        resultado.append(schemas.TurnoHistorialResponse(
            id_session=s.id_session,
            fecha_apertura=s.fecha_apertura,
            fecha_cierre=s.fecha_cierre,
            monto_apertura=s.monto_apertura,
            efectivo_esperado=s.efectivo_esperado,
            efectivo_contado=s.efectivo_contado,
            diferencia=s.diferencia,
            observaciones_cierre=s.observaciones_cierre,
            nombre_usuario_apertura=u_apertura.nombre if u_apertura else None,
            nombre_usuario_cierre=u_cierre.nombre if u_cierre else None,
            total_ventas=total_ventas,
            cantidad_ventas=cantidad_ventas,
            total_efectivo=totales[models.MetodoPago.efectivo],
            total_transferencia=totales[models.MetodoPago.transferencia],
            total_debito=totales[models.MetodoPago.tarjeta_debito],
            total_credito=totales[models.MetodoPago.tarjeta_credito],
        ))

    return resultado

