import { API_URL, getHeaders } from "./client";

export async function getCategorias() {
  const response = await fetch(`${API_URL}/catalogo/categorias`, {
    headers: getHeaders(false),
  });
  if (!response.ok) throw new Error("Error al obtener categorías");
  return response.json();
}

export async function crearCategoria(categoria) {
  const response = await fetch(`${API_URL}/catalogo/categorias`, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify(categoria),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Error al crear categoría");
  return data;
}

export async function actualizarCategoria(id_categoria, categoria) {
  const response = await fetch(`${API_URL}/catalogo/categorias/${id_categoria}`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify(categoria),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Error al actualizar categoría");
  return data;
}

export async function toggleEstadoCategoria(id_categoria) {
  const response = await fetch(`${API_URL}/catalogo/categorias/${id_categoria}/estado`, {
    method: "PATCH",
    headers: getHeaders(false),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Error al cambiar estado de la categoría");
  return data;
}

export async function eliminarCategoria(id_categoria) {
  const response = await fetch(`${API_URL}/catalogo/categorias/${id_categoria}`, {
    method: "DELETE",
    headers: getHeaders(false),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Error al eliminar categoría");
  return data;
}

export async function getProductos({ buscar = "", id_categoria = "", codigo_barras = "", solo_activos = false } = {}) {
  const params = new URLSearchParams();
  if (buscar) params.append("buscar", buscar);
  if (id_categoria) params.append("id_categoria", id_categoria);
  if (codigo_barras) params.append("codigo_barras", codigo_barras);
  if (solo_activos) params.append("solo_activos", "true");

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`${API_URL}/catalogo/productos${query}`, {
    headers: getHeaders(false),
  });
  if (!response.ok) throw new Error("Error al obtener productos");
  return response.json();
}

export async function getProductoByCodigo(codigo) {
  const productos = await getProductos({ codigo_barras: codigo, solo_activos: true });
  return productos.length > 0 ? productos[0] : null;
}

export async function crearProducto(producto) {
  const response = await fetch(`${API_URL}/catalogo/productos`, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify(producto),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Error al crear producto");
  return data;
}

export async function actualizarProducto(id_producto, producto) {
  const response = await fetch(`${API_URL}/catalogo/productos/${id_producto}`, {
    method: "PUT",
    headers: getHeaders(true),
    body: JSON.stringify(producto),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Error al actualizar producto");
  return data;
}

export async function toggleEstadoProducto(id_producto) {
  const response = await fetch(`${API_URL}/catalogo/productos/${id_producto}/estado`, {
    method: "PATCH",
    headers: getHeaders(false),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Error al cambiar estado del producto");
  return data;
}

export async function ingresarStock(id_producto, cantidad) {
  const response = await fetch(`${API_URL}/inventario/ingresar`, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify({ id_producto, cantidad }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Error al ingresar stock");
  return data;
}

export async function ajustarStock(id_producto, cantidad_nueva) {
  const response = await fetch(`${API_URL}/inventario/ajustar`, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify({ id_producto, cantidad_nueva }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Error al ajustar stock");
  return data;
}

export async function eliminarProducto(id_producto) {
  const response = await fetch(`${API_URL}/catalogo/productos/${id_producto}`, {
    method: "DELETE",
    headers: getHeaders(false),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Error al eliminar producto");
  return data;
}
