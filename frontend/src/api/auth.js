import { API_URL } from "./client";

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
