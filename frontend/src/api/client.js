export const API_URL = "http://localhost:8000";

/**
 * Limpia la sesión del usuario en localStorage y redirige al /login.
 */
export function handleUnauthorized() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

/**
 * Retorna los headers estándar con JWT si existe en localStorage.
 */
export function getHeaders(includeContentType = true) {
  const token = localStorage.getItem("token");
  return {
    ...(includeContentType ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── Interceptor Global de Fetch ──────────────────────────────────────────────
// Intercepta todas las respuestas 401 (token expirado o inválido) en cualquier
// lugar de la app para desloguear y redirigir automáticamente al /login.
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const response = await originalFetch.apply(this, args);

  if (response.status === 401) {
    const input = args[0];
    const url = typeof input === "string" ? input : (input?.url || "");
    // Si la llamada fue específicamente al endpoint de login (credenciales inválidas), no forzar auto-logout
    if (!url.includes("/auth/login")) {
      handleUnauthorized();
    }
  }

  return response;
};

/**
 * Wrapper para fetch con API_URL y headers automáticos.
 */
export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`;
  const isFormData = options.body instanceof FormData;
  
  const headers = {
    ...getHeaders(!isFormData && options.body !== undefined),
    ...(options.headers || {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Wrapper para llamadas JSON que lanza error en caso de fallo (!res.ok).
 */
export async function apiJson(endpoint, options = {}) {
  const response = await apiFetch(endpoint, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Error en la solicitud");
  }
  return data;
}
