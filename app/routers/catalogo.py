from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from decimal import Decimal

from app import models, schemas, auth
from app.database.database import get_db

router = APIRouter(prefix="/catalogo", tags=["Catálogo"])

# --- CATEGORÍAS ---
@router.post("/categorias", response_model=schemas.CategoriaResponse)
def crear_categoria(
    categoria: schemas.CategoriaCreate,
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    auth.exigir_admin(user_id_jwt, db)
    nombre_limpio = categoria.nombre.strip()
    if db.query(models.Categoria).filter(models.Categoria.nombre == nombre_limpio).first():
        raise HTTPException(status_code=400, detail="Ya existe una categoría con ese nombre")
    
    atajo_limpio = categoria.atajo_teclado.strip().upper() if categoria.atajo_teclado else None
    if atajo_limpio:
        cat_con_atajo = db.query(models.Categoria).filter(models.Categoria.atajo_teclado == atajo_limpio).first()
        if cat_con_atajo:
            raise HTTPException(
                status_code=400,
                detail=f"El atajo {atajo_limpio} ya está asignado a la categoría '{cat_con_atajo.nombre}'"
            )

    cat_data = categoria.model_dump()
    cat_data["nombre"] = nombre_limpio
    cat_data["atajo_teclado"] = atajo_limpio

    db_cat = models.Categoria(**cat_data)
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.get("/categorias", response_model=List[schemas.CategoriaResponse])
def listar_categorias(
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(models.Categoria).order_by(models.Categoria.nombre.asc()).all()

@router.put("/categorias/{id_categoria}", response_model=schemas.CategoriaResponse)
def actualizar_categoria(
    id_categoria: int,
    categoria_update: schemas.CategoriaUpdate,
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    auth.exigir_admin(user_id_jwt, db)
    cat = db.query(models.Categoria).filter(models.Categoria.id_categoria == id_categoria).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    update_data = categoria_update.model_dump(exclude_unset=True)

    if "nombre" in update_data and update_data["nombre"] is not None:
        nombre_limpio = update_data["nombre"].strip()
        existente = db.query(models.Categoria).filter(
            models.Categoria.nombre == nombre_limpio,
            models.Categoria.id_categoria != id_categoria
        ).first()
        if existente:
            raise HTTPException(status_code=400, detail="Ya existe otra categoría con ese nombre")
        cat.nombre = nombre_limpio

    if "atajo_teclado" in update_data:
        raw_atajo = update_data["atajo_teclado"]
        atajo_limpio = raw_atajo.strip().upper() if raw_atajo and raw_atajo.strip() else None
        if atajo_limpio:
            cat_con_atajo = db.query(models.Categoria).filter(
                models.Categoria.atajo_teclado == atajo_limpio,
                models.Categoria.id_categoria != id_categoria
            ).first()
            if cat_con_atajo:
                raise HTTPException(
                    status_code=400,
                    detail=f"El atajo {atajo_limpio} ya está asignado a la categoría '{cat_con_atajo.nombre}'"
                )
        cat.atajo_teclado = atajo_limpio

    if "descripcion" in update_data:
        cat.descripcion = update_data["descripcion"]

    if "activa" in update_data and update_data["activa"] is not None:
        cat.activa = update_data["activa"]

    db.commit()
    db.refresh(cat)
    return cat

@router.patch("/categorias/{id_categoria}/estado", response_model=schemas.CategoriaResponse)
def toggle_estado_categoria(
    id_categoria: int,
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    auth.exigir_admin(user_id_jwt, db)
    cat = db.query(models.Categoria).filter(models.Categoria.id_categoria == id_categoria).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    cat.activa = not cat.activa
    # Si se desactiva, liberamos el atajo de teclado para que no quede retenido
    if not cat.activa:
        cat.atajo_teclado = None
    db.commit()
    db.refresh(cat)
    return cat

@router.delete("/categorias/{id_categoria}")
def eliminar_categoria(
    id_categoria: int,
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    auth.exigir_admin(user_id_jwt, db)
    cat = db.query(models.Categoria).filter(models.Categoria.id_categoria == id_categoria).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    productos_asociados = db.query(models.Producto).filter(models.Producto.id_categoria == id_categoria).count()
    if productos_asociados > 0:
        cat.activa = False
        cat.atajo_teclado = None
        db.commit()
        return {"mensaje": "Categoría desactivada porque contiene productos asociados", "desactivada": True}

    db.delete(cat)
    db.commit()
    return {"mensaje": "Categoría eliminada exitosamente", "eliminada": True}


# --- PRODUCTOS (ABM) ---
@router.post("/productos", response_model=schemas.ProductoResponse)
def crear_producto(
    producto: schemas.ProductoCreate,
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    auth.exigir_admin(user_id_jwt, db)
    prod_data = producto.model_dump()
    stock_inicial = prod_data.pop("stock_inicial", Decimal("0.000")) or Decimal("0.000")
    
    db_prod = models.Producto(**prod_data)
    db.add(db_prod)
    db.flush()
    
    # Crear registro inicial de inventario si no existe
    db_inv = models.Inventario(
        id_producto=db_prod.id_producto,
        cantidad=stock_inicial,
        stock_minimo=5,
        stock_maximo=100
    )
    db.add(db_inv)
    db.commit()
    db.refresh(db_prod)
    
    resp = schemas.ProductoResponse.model_validate(db_prod)
    if db_prod.categoria:
        resp.nombre_categoria = db_prod.categoria.nombre
    resp.stock_actual = stock_inicial
    return resp

@router.get("/productos", response_model=List[schemas.ProductoResponse])
def listar_productos(
    codigo_barras: Optional[str] = None,
    id_categoria: Optional[int] = None,
    buscar: Optional[str] = None,
    solo_activos: bool = False,
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Producto).options(
        joinedload(models.Producto.categoria),
        joinedload(models.Producto.inventario)
    )
    if codigo_barras:
        query = query.filter(models.Producto.codigo_barras == codigo_barras)
    if id_categoria:
        query = query.filter(models.Producto.id_categoria == id_categoria)
    if buscar:
        termino = f"%{buscar}%"
        query = query.filter(
            (models.Producto.nombre.ilike(termino)) |
            (models.Producto.codigo_barras.ilike(termino)) |
            (models.Producto.descripcion.ilike(termino))
        )
    if solo_activos:
        query = query.filter(models.Producto.activo == True)
        
    productos = query.order_by(models.Producto.nombre.asc()).all()
    
    resultado = []
    for p in productos:
        item = schemas.ProductoResponse.model_validate(p)
        item.nombre_categoria = p.categoria.nombre if p.categoria else None
        item.stock_actual = p.inventario.cantidad if p.inventario else Decimal("0.000")
        item.stock_minimo = p.inventario.stock_minimo if p.inventario else 5
        item.stock_maximo = p.inventario.stock_maximo if p.inventario else 100
        resultado.append(item)
    return resultado

@router.get("/productos/{id_producto}", response_model=schemas.ProductoResponse)
def obtener_producto(
    id_producto: int,
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    p = db.query(models.Producto).options(
        joinedload(models.Producto.categoria),
        joinedload(models.Producto.inventario)
    ).filter(models.Producto.id_producto == id_producto).first()
    
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
        
    item = schemas.ProductoResponse.model_validate(p)
    item.nombre_categoria = p.categoria.nombre if p.categoria else None
    item.stock_actual = p.inventario.cantidad if p.inventario else Decimal("0.000")
    item.stock_minimo = p.inventario.stock_minimo if p.inventario else 5
    item.stock_maximo = p.inventario.stock_maximo if p.inventario else 100
    return item

@router.put("/productos/{id_producto}", response_model=schemas.ProductoResponse)
def actualizar_producto(
    id_producto: int,
    producto_update: schemas.ProductoUpdate,
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    auth.exigir_admin(user_id_jwt, db)
    p = db.query(models.Producto).options(
        joinedload(models.Producto.categoria),
        joinedload(models.Producto.inventario)
    ).filter(models.Producto.id_producto == id_producto).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
        
    update_data = producto_update.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(p, field, val)
        
    db.commit()
    db.refresh(p)
    
    item = schemas.ProductoResponse.model_validate(p)
    item.nombre_categoria = p.categoria.nombre if p.categoria else None
    item.stock_actual = p.inventario.cantidad if p.inventario else Decimal("0.000")
    item.stock_minimo = p.inventario.stock_minimo if p.inventario else 5
    item.stock_maximo = p.inventario.stock_maximo if p.inventario else 100
    return item

@router.patch("/productos/{id_producto}/estado", response_model=schemas.ProductoResponse)
def toggle_estado_producto(
    id_producto: int,
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    auth.exigir_admin(user_id_jwt, db)
    p = db.query(models.Producto).filter(models.Producto.id_producto == id_producto).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
        
    p.activo = not p.activo
    db.commit()
    db.refresh(p)
    
    item = schemas.ProductoResponse.model_validate(p)
    item.nombre_categoria = p.categoria.nombre if p.categoria else None
    item.stock_actual = p.inventario.cantidad if p.inventario else Decimal("0.000")
    return item

@router.delete("/productos/{id_producto}")
def eliminar_o_desactivar_producto(
    id_producto: int,
    user_id_jwt: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    auth.exigir_admin(user_id_jwt, db)
    p = db.query(models.Producto).filter(models.Producto.id_producto == id_producto).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
        
    # Verificar si tiene ventas registradas
    ventas_count = db.query(models.DetalleVenta).filter(models.DetalleVenta.id_producto == id_producto).count()
    if ventas_count > 0:
        p.activo = False
        db.commit()
        return {"mensaje": "Producto desactivado (posee historial de ventas asociadas)", "activo": False}
    else:
        db.query(models.Inventario).filter(models.Inventario.id_producto == id_producto).delete()
        db.delete(p)
        db.commit()
        return {"mensaje": "Producto eliminado exitosamente", "eliminado": True}
