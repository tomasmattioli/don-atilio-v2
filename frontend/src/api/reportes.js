import { API_URL, getHeaders } from "./client";

export async function getDashboard() {
  const response = await fetch(`${API_URL}/reportes/dashboard`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error("Error al obtener datos del dashboard");
  return response.json();
}

export async function getReportePeriodo(params = {}) {
  const query = new URLSearchParams();
  if (params.fecha_desde) query.append("fecha_desde", params.fecha_desde);
  if (params.fecha_hasta) query.append("fecha_hasta", params.fecha_hasta);
  if (params.id_usuario) query.append("id_usuario", params.id_usuario);

  const queryString = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`${API_URL}/reportes/periodo${queryString}`, {
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Error al obtener reporte del período");
  return data;
}

export async function getVentasPorDia(params = {}) {
  const query = new URLSearchParams();
  if (params.desde) query.append("desde", params.desde);
  if (params.hasta) query.append("hasta", params.hasta);

  const queryString = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`${API_URL}/reportes/ventas-por-dia${queryString}`, {
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Error al obtener ventas por día");
  return data;
}

export async function getReporteProducto(params = {}) {
  const query = new URLSearchParams();
  query.append("id_producto", params.id_producto);
  if (params.fecha_desde) query.append("fecha_desde", params.fecha_desde);
  if (params.fecha_hasta) query.append("fecha_hasta", params.fecha_hasta);

  const response = await fetch(`${API_URL}/reportes/producto?${query.toString()}`, {
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Error al obtener reporte de producto");
  return data;
}
