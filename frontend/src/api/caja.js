import { API_URL, getHeaders } from "./client";

export async function getCajaActiva(id_usuario) {
  const params = id_usuario ? `?id_usuario=${id_usuario}` : '';
  const response = await fetch(`${API_URL}/caja/activa${params}`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('No hay ninguna caja abierta');
  return response.json();
}

export async function getAbiertas() {
  const response = await fetch(`${API_URL}/caja/abiertas`, {
    headers: getHeaders()
  });
  if (!response.ok) throw new Error('Error al consultar cajas abiertas');
  return response.json();
}

export async function abrirCaja(id_usuario, monto_apertura) {
  const response = await fetch(`${API_URL}/caja/abrir`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ id_usuario, monto_apertura }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Error al abrir la caja');
  return data;
}

export async function cerrarCaja(id_session, id_usuario_cierre, efectivo_contado, observaciones_cierre) {
  const response = await fetch(`${API_URL}/caja/cerrar/${id_session}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ id_usuario_cierre, efectivo_contado, observaciones_cierre: observaciones_cierre || null }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Error al cerrar la caja');
  return data;
}

export async function getHistorialTurnos(params = {}) {
  const query = new URLSearchParams();
  if (params.fecha_desde) query.append("fecha_desde", params.fecha_desde);
  if (params.fecha_hasta) query.append("fecha_hasta", params.fecha_hasta);
  if (params.id_usuario) query.append("id_usuario", params.id_usuario);
  if (params.limit) query.append("limit", params.limit);

  const queryString = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`${API_URL}/caja/historial${queryString}`, {
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Error al cargar el historial de turnos');
  return data;
}

export async function getCajeros() {
  const response = await fetch(`${API_URL}/usuarios/cajeros`, {
    headers: getHeaders(),
  });
  if (!response.ok) return [];
  return response.json();
}


