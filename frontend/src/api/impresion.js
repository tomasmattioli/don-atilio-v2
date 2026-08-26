export const PRINT_SERVICE_URL = "http://127.0.0.1:9100";

/**
 * Envía la venta al microservicio local de impresión térmica (ESC/POS).
 * Timeout de 4 segundos para no bloquear la interfaz si el servicio está apagado.
 */
export async function imprimirTicket(datosTicket) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${PRINT_SERVICE_URL}/imprimir`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datosTicket),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error en el servicio de impresión");
    }
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Tiempo de espera agotado al conectar con la impresora local");
    }
    throw error;
  }
}

/**
 * Envía un ticket de diagnóstico y prueba a la impresora térmica.
 */
export async function imprimirPrueba() {
  const response = await fetch(`${PRINT_SERVICE_URL}/imprimir/prueba`, {
    method: "POST",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Error al emitir ticket de prueba");
  }
  return data;
}

/**
 * Envía los datos de Cierre de Caja / Turno para impresión térmica.
 */
export async function imprimirTicketCierre(datosCierre) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${PRINT_SERVICE_URL}/imprimir/cierre-caja`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datosCierre),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error en el servicio de impresión");
    }
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Tiempo de espera agotado al conectar con la impresora local");
    }
    throw error;
  }
}

/**
 * Envía un resumen de ventas por período para impresión en comandera.
 */
export async function imprimirTicketResumen(datosResumen) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${PRINT_SERVICE_URL}/imprimir/resumen-periodo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datosResumen),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Error en el servicio de impresión");
    }
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Tiempo de espera agotado al conectar con la impresora local");
    }
    throw error;
  }
}

/**
 * Consulta el estado del servicio local de impresión y la impresora conectada.
 */
export async function verificarEstadoImpresora() {
  const response = await fetch(`${PRINT_SERVICE_URL}/status`);
  return await response.json();
}
