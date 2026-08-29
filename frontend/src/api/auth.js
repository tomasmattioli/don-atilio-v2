import { API_URL, getHeaders } from "./client";

export async function login(nombre, contrasena) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, "contraseña": contrasena }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || 'Error al iniciar sesión');
  }

  return data;
}

export async function logout() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: getHeaders(),
    });
  } catch {
    // Si falla la red al hacer logout (ej. sesión ya expirada), lo ignoramos silenciosamente.
    // El token local se borra de todas formas.
  }
}
