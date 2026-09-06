import { API_URL, getHeaders } from "./client";

export async function crearVenta(venta) {
  const response = await fetch(`${API_URL}/ventas`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(venta),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Error al crear la venta');
  }
  return data;
}

export async function getVentas(params = {}) {
  const query = new URLSearchParams();
  if (params.fecha_desde) query.append("fecha_desde", params.fecha_desde);
  if (params.fecha_hasta) query.append("fecha_hasta", params.fecha_hasta);
  if (params.id_usuario) query.append("id_usuario", params.id_usuario);
  if (params.id_session) query.append("id_session", params.id_session);
  if (params.limit) query.append("limit", params.limit);

  const queryString = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`${API_URL}/ventas${queryString}`, {
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Error al consultar historial de ventas");
  }
  return data;
}

export async function getVentaDetalle(id_venta) {
  const response = await fetch(`${API_URL}/ventas/${id_venta}`, {
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Error al obtener detalle de la venta");
  }
  return data;
}

export async function getResumenABorrar(params = {}) {
  const query = new URLSearchParams();
  if (params.fecha_desde) query.append("fecha_desde", params.fecha_desde);
  if (params.fecha_hasta) query.append("fecha_hasta", params.fecha_hasta);
  const qs = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`${API_URL}/ventas/resumen-a-borrar${qs}`, {
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Error al obtener resumen");
  return data; // { cantidad_ventas, monto_total }
}

export async function limpiarVentas(params = {}) {
  const query = new URLSearchParams();
  if (params.fecha_desde) query.append("fecha_desde", params.fecha_desde);
  if (params.fecha_hasta) query.append("fecha_hasta", params.fecha_hasta);
  const qs = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`${API_URL}/ventas/limpiar${qs}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Error al limpiar ventas");
  return data; // { ventas_borradas, detalles_borrados, pagos_borrados, monto_total }
}
