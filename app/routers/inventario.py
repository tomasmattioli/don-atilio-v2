from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from decimal import Decimal
from pydantic import BaseModel, Field
from typing import Optional

from app import models, auth
from app.database.database import get_db

router = APIRouter(prefix="/inventario", tags=["Inventario"])


class InventarioItemResponse(BaseModel):
    id_inventario: int
    id_producto: int
    nombre_producto: str
    codigo_barras: Optional[str]
    cantidad: Decimal
    stock_minimo: int
    stock_maximo: int

    class Config:
        from_attributes = True


class IngresarStockRequest(BaseModel):
    id_producto: int
    cantidad: Decimal = Field(..., gt=0)


class AjustarStockRequest(BaseModel):
    id_producto: int
    cantidad_nueva: Decimal = Field(..., ge=0)


@router.get("", response_model=List[InventarioItemResponse])
def listar_inventario(
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    registros = db.query(models.Inventario).options(
        joinedload(models.Inventario.producto)
    ).all()
    return [
        InventarioItemResponse(
            id_inventario=r.id_inventario,
            id_producto=r.id_producto,
            nombre_producto=r.producto.nombre,
            codigo_barras=r.producto.codigo_barras,
            cantidad=r.cantidad,
            stock_minimo=r.stock_minimo,
            stock_maximo=r.stock_maximo,
        )
        for r in registros
    ]


@router.post("/ingresar")
def ingresar_stock(
    datos: IngresarStockRequest,
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Suma cantidad al stock de un producto. Si no tiene registro de inventario lo crea."""
    auth.exigir_admin(user_id_jwt, db)
    inventario = db.query(models.Inventario).filter(
        models.Inventario.id_producto == datos.id_producto
    ).first()

    if inventario:
        inventario.cantidad += datos.cantidad
    else:
        # Verificar que el producto exista
        producto = db.query(models.Producto).filter(
            models.Producto.id_producto == datos.id_producto
        ).first()
        if not producto:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        inventario = models.Inventario(
            id_producto=datos.id_producto,
            cantidad=datos.cantidad,
        )
        db.add(inventario)

    db.commit()
    db.refresh(inventario)
    return {"id_producto": datos.id_producto, "cantidad_actual": inventario.cantidad}


@router.post("/ajustar")
def ajustar_stock(
    datos: AjustarStockRequest,
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Fija el stock a un valor exacto (corrección manual)."""
    auth.exigir_admin(user_id_jwt, db)
    inventario = db.query(models.Inventario).filter(
        models.Inventario.id_producto == datos.id_producto
    ).first()

    if inventario:
        inventario.cantidad = datos.cantidad_nueva
    else:
        producto = db.query(models.Producto).filter(
            models.Producto.id_producto == datos.id_producto
        ).first()
        if not producto:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
        inventario = models.Inventario(
            id_producto=datos.id_producto,
            cantidad=datos.cantidad_nueva,
        )
        db.add(inventario)

    db.commit()
    db.refresh(inventario)
    return {"id_producto": datos.id_producto, "cantidad_actual": inventario.cantidad}
