from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from datetime import datetime, date, timedelta
from pydantic import BaseModel
from typing import List, Optional

from app import models, auth
from app.database.database import get_db

router = APIRouter(prefix="/reportes", tags=["Reportes"])


# ── Schemas de respuesta ───────────────────────────────────────────────────────
class ResumenMetodoPago(BaseModel):
    efectivo: Decimal
    transferencia: Decimal
    debito: Decimal
    credito: Decimal


class ResumenDia(BaseModel):
    fecha: str
    cantidad_ventas: int
    total: Decimal
    efectivo: Decimal
    transferencia: Decimal
    debito: Decimal
    credito: Decimal


class VentasPorDiaItem(BaseModel):
    fecha: str
    total: Decimal
    cantidad_ventas: int


class ResumenCategoria(BaseModel):
    categoria: str
    unidades: Decimal
    total: Decimal


class PeriodoResponse(BaseModel):
    fecha_desde: Optional[str]
    fecha_hasta: Optional[str]
    cajero: Optional[str]
    total_recaudado: Decimal
    cantidad_ventas: int
    metodos: ResumenMetodoPago
    desglose_dias: List[ResumenDia]
    desglose_categorias: List[ResumenCategoria]


class ProductoMasVendido(BaseModel):
    id_producto: Optional[int]
    nombre: str
    unidades_vendidas: Decimal
    total_recaudado: Decimal


class ProductoStockBajo(BaseModel):
    id_producto: int
    nombre: str
    cantidad_actual: Decimal
    stock_minimo: int


class CajaAbiertaResumen(BaseModel):
    id_session: int
    cajero: str
    desde: datetime
    monto_apertura: Decimal = Decimal("0")
    total_ventas: Decimal = Decimal("0")
    efectivo_actual: Decimal = Decimal("0")


class DashboardResponse(BaseModel):
    # Métricas del día
    ventas_hoy: int
    total_hoy: Decimal
    metodos_hoy: ResumenMetodoPago
    # Cajas abiertas ahora
    cajas_abiertas: List[CajaAbiertaResumen]
    # Top 5 productos del mes
    top_productos_mes: List[ProductoMasVendido]
    # Alertas de stock bajo
    stock_bajo: List[ProductoStockBajo]


# ── Endpoint principal ─────────────────────────────────────────────────────────
@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(
    user_id: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    hoy = date.today()

    # --- Ventas de hoy ---
    ventas_hoy = db.query(models.Venta).filter(
        func.date(models.Venta.fecha) == hoy,
        models.Venta.estado == models.EstadoVenta.completada
    ).all()

    total_hoy = sum(v.total for v in ventas_hoy)
    metodos = {m: Decimal("0") for m in models.MetodoPago}
    for v in ventas_hoy:
        for p in v.pagos:
            metodos[p.metodo] += p.monto

    # --- Cajas abiertas ---
    cajas = db.query(models.CajaSession).filter(
        models.CajaSession.estado == models.EstadoCaja.abierta
    ).all()
    cajas_res = []
    for c in cajas:
        u = db.query(models.Usuario).filter(models.Usuario.id_usuario == c.id_usuario_apertura).first()

        ventas_turno = db.query(models.Venta).filter(
            models.Venta.id_session == c.id_session,
            models.Venta.estado == models.EstadoVenta.completada
        ).all()
        total_ventas = sum((v.total for v in ventas_turno), Decimal("0"))
        efectivo_ventas = Decimal("0")
        for v in ventas_turno:
            for p in v.pagos:
                if p.metodo == models.MetodoPago.efectivo:
                    efectivo_ventas += p.monto
        efectivo_actual = (c.monto_apertura or Decimal("0")) + efectivo_ventas

        cajas_res.append(CajaAbiertaResumen(
            id_session=c.id_session,
            cajero=u.nombre if u else f"Usuario #{c.id_usuario_apertura}",
            desde=c.fecha_apertura,
            monto_apertura=c.monto_apertura or Decimal("0"),
            total_ventas=total_ventas,
            efectivo_actual=efectivo_actual,
        ))

    # --- Top 5 productos del mes (por unidades vendidas) ---
    inicio_mes = hoy.replace(day=1)
    top = (
        db.query(
            models.DetalleVenta.id_producto,
            models.DetalleVenta.nombre_producto,
            func.sum(models.DetalleVenta.cantidad).label("unidades"),
            func.sum(models.DetalleVenta.cantidad * models.DetalleVenta.precio_unitario).label("recaudado"),
        )
        .join(models.Venta, models.DetalleVenta.id_venta == models.Venta.id_venta)
        .filter(
            func.date(models.Venta.fecha) >= inicio_mes,
            models.Venta.estado == models.EstadoVenta.completada,
        )
        .group_by(models.DetalleVenta.id_producto, models.DetalleVenta.nombre_producto)
        .order_by(func.sum(models.DetalleVenta.cantidad).desc())
        .limit(5)
        .all()
    )
    top_res = [
        ProductoMasVendido(
            id_producto=row.id_producto,
            nombre=row.nombre_producto or f"Producto #{row.id_producto}",
            unidades_vendidas=row.unidades,
            total_recaudado=row.recaudado,
        )
        for row in top
    ]

    # --- Stock bajo ---
    stock_bajo = (
        db.query(models.Inventario)
        .join(models.Producto, models.Inventario.id_producto == models.Producto.id_producto)
        .filter(
            models.Inventario.cantidad <= models.Inventario.stock_minimo,
            models.Producto.activo == True,
        )
        .all()
    )
    stock_res = [
        ProductoStockBajo(
            id_producto=s.id_producto,
            nombre=s.producto.nombre,
            cantidad_actual=s.cantidad,
            stock_minimo=s.stock_minimo,
        )
        for s in stock_bajo
    ]

    return DashboardResponse(
        ventas_hoy=len(ventas_hoy),
        total_hoy=total_hoy,
        metodos_hoy=ResumenMetodoPago(
            efectivo=metodos[models.MetodoPago.efectivo],
            transferencia=metodos[models.MetodoPago.transferencia],
            debito=metodos[models.MetodoPago.tarjeta_debito],
            credito=metodos[models.MetodoPago.tarjeta_credito],
        ),
        cajas_abiertas=cajas_res,
        top_productos_mes=top_res,
        stock_bajo=stock_res,
    )


@router.get("/periodo", response_model=PeriodoResponse)
def reporte_periodo(
    fecha_desde: Optional[date] = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    fecha_hasta: Optional[date] = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    id_usuario: Optional[int] = Query(None, description="Filtrar por cajero"),
    user_id: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Devuelve el resumen consolidado de ventas, medios de pago y categorías para un rango de fechas."""
    query = db.query(models.Venta).filter(
        models.Venta.estado == models.EstadoVenta.completada
    )
    if fecha_desde:
        query = query.filter(func.date(models.Venta.fecha) >= fecha_desde)
    if fecha_hasta:
        query = query.filter(func.date(models.Venta.fecha) <= fecha_hasta)
    if id_usuario:
        query = query.filter(models.Venta.id_usuario == id_usuario)

    ventas = query.order_by(models.Venta.fecha.asc()).all()

    total_recaudado = Decimal("0")
    metodos = {m: Decimal("0") for m in models.MetodoPago}
    dias_dict = {}

    for v in ventas:
        total_recaudado += v.total
        v_fecha_str = v.fecha.strftime("%Y-%m-%d") if v.fecha else "Sin fecha"
        if v_fecha_str not in dias_dict:
            dias_dict[v_fecha_str] = {
                "fecha": v_fecha_str,
                "cantidad_ventas": 0,
                "total": Decimal("0"),
                "efectivo": Decimal("0"),
                "transferencia": Decimal("0"),
                "debito": Decimal("0"),
                "credito": Decimal("0"),
            }
        dias_dict[v_fecha_str]["cantidad_ventas"] += 1
        dias_dict[v_fecha_str]["total"] += v.total

        for p in v.pagos:
            metodos[p.metodo] += p.monto
            if p.metodo == models.MetodoPago.efectivo:
                dias_dict[v_fecha_str]["efectivo"] += p.monto
            elif p.metodo == models.MetodoPago.transferencia:
                dias_dict[v_fecha_str]["transferencia"] += p.monto
            elif p.metodo == models.MetodoPago.tarjeta_debito:
                dias_dict[v_fecha_str]["debito"] += p.monto
            elif p.metodo == models.MetodoPago.tarjeta_credito:
                dias_dict[v_fecha_str]["credito"] += p.monto

    # Categorías agrupadas
    ventas_ids = [v.id_venta for v in ventas]
    desglose_categorias = []
    if ventas_ids:
        detalles = (
            db.query(
                models.Categoria.nombre.label("categoria_nombre"),
                func.sum(models.DetalleVenta.cantidad).label("unidades"),
                func.sum(models.DetalleVenta.cantidad * models.DetalleVenta.precio_unitario).label("total")
            )
            .select_from(models.DetalleVenta)
            .outerjoin(models.Producto, models.DetalleVenta.id_producto == models.Producto.id_producto)
            .outerjoin(models.Categoria, models.Producto.id_categoria == models.Categoria.id_categoria)
            .filter(models.DetalleVenta.id_venta.in_(ventas_ids))
            .group_by(models.Categoria.nombre)
            .order_by(func.sum(models.DetalleVenta.cantidad * models.DetalleVenta.precio_unitario).desc())
            .all()
        )
        for d in detalles:
            cat_name = d.categoria_nombre or "Varios / Sin Categoría"
            desglose_categorias.append(ResumenCategoria(
                categoria=cat_name,
                unidades=d.unidades or Decimal("0"),
                total=d.total or Decimal("0"),
            ))

    cajero_nombre = "Todos"
    if id_usuario:
        u = db.query(models.Usuario).filter(models.Usuario.id_usuario == id_usuario).first()
        if u:
            cajero_nombre = u.nombre

    desglose_dias = [ResumenDia(**d) for d in dias_dict.values()]

    return PeriodoResponse(
        fecha_desde=str(fecha_desde) if fecha_desde else None,
        fecha_hasta=str(fecha_hasta) if fecha_hasta else None,
        cajero=cajero_nombre,
        total_recaudado=total_recaudado,
        cantidad_ventas=len(ventas),
        metodos=ResumenMetodoPago(
            efectivo=metodos[models.MetodoPago.efectivo],
            transferencia=metodos[models.MetodoPago.transferencia],
            debito=metodos[models.MetodoPago.tarjeta_debito],
            credito=metodos[models.MetodoPago.tarjeta_credito],
        ),
        desglose_dias=desglose_dias,
        desglose_categorias=desglose_categorias,
    )


@router.get("/ventas-por-dia", response_model=List[VentasPorDiaItem])
def ventas_por_dia(
    desde: Optional[date] = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    hasta: Optional[date] = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    user_id: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Devuelve las ventas agrupadas por día para un rango de fechas (por defecto los últimos 30 días)."""
    hoy = date.today()
    fecha_fin = hasta or hoy
    fecha_inicio = desde or (fecha_fin - timedelta(days=29))

    ventas_agrupadas = (
        db.query(
            func.date(models.Venta.fecha).label("fecha_dia"),
            func.sum(models.Venta.total).label("total"),
            func.count(models.Venta.id_venta).label("cantidad_ventas")
        )
        .filter(
            models.Venta.estado == models.EstadoVenta.completada,
            func.date(models.Venta.fecha) >= fecha_inicio,
            func.date(models.Venta.fecha) <= fecha_fin
        )
        .group_by(func.date(models.Venta.fecha))
        .all()
    )

    dias_map = {}
    for row in ventas_agrupadas:
        f_key = str(row.fecha_dia)[:10]
        dias_map[f_key] = (row.total or Decimal("0"), row.cantidad_ventas or 0)

    resultado = []
    curr = fecha_inicio
    while curr <= fecha_fin:
        curr_str = curr.strftime("%Y-%m-%d")
        total_dia, cant = dias_map.get(curr_str, (Decimal("0"), 0))
        resultado.append(VentasPorDiaItem(
            fecha=curr_str,
            total=total_dia,
            cantidad_ventas=cant
        ))
        curr += timedelta(days=1)

    return resultado


# ── Reporte por Producto ────────────────────────────────────────────────────────
class ReporteProductoResponse(BaseModel):
    id_producto: int
    nombre_producto: str
    fecha_desde: Optional[str]
    fecha_hasta: Optional[str]
    cantidad_total: Decimal
    total_facturado: Decimal


@router.get("/producto", response_model=ReporteProductoResponse)
def reporte_por_producto(
    id_producto: int = Query(..., description="ID del producto a consultar"),
    fecha_desde: Optional[date] = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    fecha_hasta: Optional[date] = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    user_id: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Devuelve cantidad total vendida y total facturado de un producto en un rango de fechas."""
    producto = db.query(models.Producto).filter(models.Producto.id_producto == id_producto).first()
    if not producto:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    q = (
        db.query(
            func.sum(models.DetalleVenta.cantidad).label("cantidad_total"),
            func.sum(models.DetalleVenta.cantidad * models.DetalleVenta.precio_unitario).label("total_facturado"),
        )
        .join(models.Venta, models.DetalleVenta.id_venta == models.Venta.id_venta)
        .filter(
            models.DetalleVenta.id_producto == id_producto,
            models.Venta.estado == models.EstadoVenta.completada,
        )
    )
    if fecha_desde:
        q = q.filter(func.date(models.Venta.fecha) >= fecha_desde)
    if fecha_hasta:
        q = q.filter(func.date(models.Venta.fecha) <= fecha_hasta)

    row = q.one()

    return ReporteProductoResponse(
        id_producto=id_producto,
        nombre_producto=producto.nombre,
        fecha_desde=str(fecha_desde) if fecha_desde else None,
        fecha_hasta=str(fecha_hasta) if fecha_hasta else None,
        cantidad_total=row.cantidad_total or Decimal("0"),
        total_facturado=row.total_facturado or Decimal("0"),
    )


# ── Reporte: todos los productos con sus ventas en el período ───────────────────
class ProductoVendidoItem(BaseModel):
    id_producto: int
    nombre: str
    cantidad_total: Decimal
    total_facturado: Decimal


@router.get("/productos-vendidos", response_model=List[ProductoVendidoItem])
def reporte_productos_vendidos(
    fecha_desde: Optional[date] = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    fecha_hasta: Optional[date] = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    user_id: int = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Devuelve todos los productos con cantidad y total vendido en el período.
    Productos sin ventas aparecen con 0. Ordenados: mayor facturado primero, ceros al final."""

    # Subquery: sumar ventas por producto dentro del período
    ventas_q = (
        db.query(
            models.DetalleVenta.id_producto.label("id_producto"),
            func.sum(models.DetalleVenta.cantidad).label("cantidad_total"),
            func.sum(
                models.DetalleVenta.cantidad * models.DetalleVenta.precio_unitario
            ).label("total_facturado"),
        )
        .join(models.Venta, models.DetalleVenta.id_venta == models.Venta.id_venta)
        .filter(
            models.Venta.estado == models.EstadoVenta.completada,
            models.DetalleVenta.id_producto.isnot(None),
        )
    )
    if fecha_desde:
        ventas_q = ventas_q.filter(func.date(models.Venta.fecha) >= fecha_desde)
    if fecha_hasta:
        ventas_q = ventas_q.filter(func.date(models.Venta.fecha) <= fecha_hasta)

    ventas_subq = ventas_q.group_by(models.DetalleVenta.id_producto).subquery()

    # LEFT JOIN: todos los productos, con sus totales (NULL → 0 en Python)
    total_col = func.coalesce(ventas_subq.c.total_facturado, 0)
    rows = (
        db.query(
            models.Producto.id_producto,
            models.Producto.nombre,
            func.coalesce(ventas_subq.c.cantidad_total, 0).label("cantidad_total"),
            total_col.label("total_facturado"),
        )
        .outerjoin(ventas_subq, models.Producto.id_producto == ventas_subq.c.id_producto)
        .order_by(total_col.desc(), models.Producto.nombre.asc())
        .all()
    )

    return [
        ProductoVendidoItem(
            id_producto=r.id_producto,
            nombre=r.nombre,
            cantidad_total=Decimal(str(r.cantidad_total)),
            total_facturado=Decimal(str(r.total_facturado)),
        )
        for r in rows
    ]
