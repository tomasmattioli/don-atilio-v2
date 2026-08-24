from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal

from app import models, schemas
from app.database.database import get_db

router = APIRouter(prefix="/caja", tags=["Caja"])


@router.post("/abrir", response_model=schemas.CajaSessionResponse)
def abrir_caja(datos: schemas.AbrirCajaRequest, db: Session = Depends(get_db)):
    # Verificar que no haya ya una caja abierta
    abierta = db.query(models.CajaSession).filter(
        models.CajaSession.estado == models.EstadoCaja.abierta
    ).first()
    if abierta:
        raise HTTPException(status_code=409, detail=f"Ya hay una caja abierta (ID: {abierta.id_session})")

    usuario = db.query(models.Usuario).filter(models.Usuario.id_usuario == datos.id_usuario).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    session = models.CajaSession(
        id_usuario_apertura=datos.id_usuario,
        monto_apertura=datos.monto_apertura,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/activa", response_model=schemas.CajaSessionResponse)
def caja_activa(db: Session = Depends(get_db)):
    session = db.query(models.CajaSession).filter(
        models.CajaSession.estado == models.EstadoCaja.abierta
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="No hay ninguna caja abierta")
    return session


@router.post("/cerrar/{id_session}", response_model=schemas.CajaSessionResponse)
def cerrar_caja(id_session: int, datos: schemas.CerrarCajaRequest, db: Session = Depends(get_db)):
    session = db.query(models.CajaSession).filter(
        models.CajaSession.id_session == id_session,
        models.CajaSession.estado == models.EstadoCaja.abierta
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesión de caja no encontrada o ya cerrada")

    # Calcular el total esperado en efectivo sumando ventas de la sesión
    ventas = db.query(models.Venta).filter(
        models.Venta.id_session == id_session,
        models.Venta.estado == models.EstadoVenta.completada
    ).all()

    efectivo_ventas = Decimal("0")
    for venta in ventas:
        for pago in venta.pagos:
            if pago.metodo == models.MetodoPago.efectivo:
                efectivo_ventas += pago.monto

    efectivo_esperado = session.monto_apertura + efectivo_ventas
    diferencia = datos.efectivo_contado - efectivo_esperado

    session.id_usuario_cierre = datos.id_usuario_cierre
    session.efectivo_contado = datos.efectivo_contado
    session.efectivo_esperado = efectivo_esperado
    session.diferencia = diferencia
    session.observaciones_cierre = datos.observaciones_cierre
    session.estado = models.EstadoCaja.cerrada

    from sqlalchemy.sql import func
    session.fecha_cierre = func.now()

    db.commit()
    db.refresh(session)
    return session
