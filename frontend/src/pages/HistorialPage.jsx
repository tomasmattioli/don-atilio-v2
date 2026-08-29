import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Chip,
  Collapse,
  IconButton,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  ButtonGroup,
  Stack,
  Divider,
  Tooltip,
  Snackbar,
  Autocomplete,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import PaymentsIcon from "@mui/icons-material/Payments";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import PersonIcon from "@mui/icons-material/Person";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PrintIcon from "@mui/icons-material/Print";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import BarChartIcon from "@mui/icons-material/BarChart";

import { getVentas } from "../api/ventas";
import { getHistorialTurnos, getCajeros } from "../api/caja";
import { imprimirTicket, imprimirTicketCierre, imprimirTicketResumen } from "../api/impresion";
import { getReportePeriodo, getReporteProducto, getReporteProductosVendidos } from "../api/reportes";
import { getProductos } from "../api/catalogo";

// ── Helpers de formato ────────────────────────────────────────────────────────
function fmt(val) {
  const num = parseFloat(val ?? 0);
  return `$${num.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtFechaHora(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fmtFecha(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtHora(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function toISODateString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const METODO_LABELS = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta_debito: "Débito",
  tarjeta_credito: "Crédito",
};

const METODO_COLORS = {
  efectivo: { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC" },
  transferencia: { bg: "#DBEAFE", text: "#1D4ED8", border: "#93C5FD" },
  tarjeta_debito: { bg: "#FEF3C7", text: "#B45309", border: "#FCD34D" },
  tarjeta_credito: { bg: "#F3E8FF", text: "#7E22CE", border: "#D8B4FE" },
};

function MetodoChip({ metodo, monto }) {
  const style = METODO_COLORS[metodo] || { bg: "#F1F5F9", text: "#475569", border: "#CBD5E1" };
  const label = METODO_LABELS[metodo] || metodo;
  return (
    <Chip
      size="small"
      label={monto !== undefined ? `${label}: ${fmt(monto)}` : label}
      sx={{
        bgcolor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        fontWeight: 600,
        fontSize: "0.75rem",
      }}
    />
  );
}

function DiferenciaBadge({ valor }) {
  const n = parseFloat(valor ?? 0);
  if (n === 0) return <Chip label="$0.00" color="success" size="small" />;
  if (n > 0) return <Chip label={`+${fmt(n)}`} color="info" size="small" />;
  return <Chip label={fmt(n)} color="error" size="small" />;
}

// ── Exportación a Excel (CSV con codificación UTF-8 BOM) ──────────────────────
function exportarVentasCSV(ventas, fechaDesde, fechaHasta) {
  if (!ventas || ventas.length === 0) return;

  const separador = ";";
  let csv = "\uFEFF"; // BOM UTF-8 para compatibilidad nativa con Microsoft Excel
  csv += `Reporte de Ventas - MI ABEJITA\r\n`;
  csv += `Período: ${fechaDesde || "Inicio"} al ${fechaHasta || "Hoy"}\r\n`;
  csv += `Generado el: ${new Date().toLocaleString("es-AR")}\r\n\r\n`;

  csv += ["Nro Venta", "Fecha", "Hora", "Vendedor", "Turno", "Medios de Pago", "Detalle de Productos", "Total"].join(separador) + "\r\n";

  ventas.forEach((v) => {
    const f = new Date(v.fecha);
    const fechaStr = isNaN(f) ? "" : f.toLocaleDateString("es-AR");
    const horaStr = isNaN(f) ? "" : f.toLocaleTimeString("es-AR");
    const vendedor = (v.nombre_usuario || "").replace(/"/g, '""');
    const turno = v.id_session ? `#${v.id_session}` : "";

    const pagosStr = (v.pagos || [])
      .map((p) => `${METODO_LABELS[p.metodo] || p.metodo}: $${parseFloat(p.monto).toFixed(2)}`)
      .join(" + ");

    const itemsStr = (v.detalles || [])
      .map((d) => `${d.nombre_producto || "Prod"} (x${parseFloat(d.cantidad)})`)
      .join(" | ")
      .replace(/"/g, '""');

    const totalStr = parseFloat(v.total || 0).toFixed(2).replace(".", ",");

    const fila = [
      `#${String(v.id_venta).padStart(5, "0")}`,
      `"${fechaStr}"`,
      `"${horaStr}"`,
      `"${vendedor}"`,
      `"${turno}"`,
      `"${pagosStr}"`,
      `"${itemsStr}"`,
      `"${totalStr}"`,
    ];

    csv += fila.join(separador) + "\r\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Ventas_MiAbejita_${fechaDesde || "todas"}_al_${fechaHasta || "hoy"}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ── Exportación / Vista de Impresión PDF A4 ───────────────────────────────────
function generarReportePDF(dataPeriodo, fechaDesde, fechaHasta) {
  const win = window.open("", "_blank", "width=920,height=800");
  if (!win) {
    alert("Por favor habilite los popups en el navegador para generar el reporte imprimible/PDF.");
    return;
  }

  const fDesde = fechaDesde ? new Date(fechaDesde + "T00:00:00").toLocaleDateString("es-AR") : "Inicio";
  const fHasta = fechaHasta ? new Date(fechaHasta + "T00:00:00").toLocaleDateString("es-AR") : "Hoy";
  const emitido = new Date().toLocaleString("es-AR");

  const total = fmt(dataPeriodo.total_recaudado);
  const cantVentas = dataPeriodo.cantidad_ventas;
  const ticketPromedio = cantVentas > 0 ? fmt(parseFloat(dataPeriodo.total_recaudado) / cantVentas) : "$0.00";

  const ef = fmt(dataPeriodo.metodos?.efectivo || 0);
  const db = fmt(dataPeriodo.metodos?.debito || 0);
  const cr = fmt(dataPeriodo.metodos?.credito || 0);
  const tr = fmt(dataPeriodo.metodos?.transferencia || 0);

  const categoriasHtml = (dataPeriodo.desglose_categorias || []).map((c) => `
    <tr>
      <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0;">${c.categoria}</td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${parseFloat(c.unidades)}</td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">${fmt(c.total)}</td>
    </tr>
  `).join("");

  const diasHtml = (dataPeriodo.desglose_dias || []).map((d) => `
    <tr>
      <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0;">${new Date(d.fecha + "T00:00:00").toLocaleDateString("es-AR")}</td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${d.cantidad_ventas}</td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${fmt(d.efectivo)}</td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${fmt(d.debito)}</td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${fmt(d.credito)}</td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${fmt(d.transferencia)}</td>
      <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">${fmt(d.total)}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte de Ventas - MI ABEJITA</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 24px; color: #0f172a; background: #fff; line-height: 1.4; }
    .header { border-bottom: 2px solid #16324f; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 24px; font-weight: 800; color: #16324f; margin: 0; letter-spacing: -0.5px; }
    .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 500; }
    .meta { text-align: right; font-size: 12px; color: #475569; }
    .grid-kpi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
    .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; border-left: 5px solid #16324f; }
    .kpi-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-value { font-size: 22px; font-weight: 800; color: #16324f; margin-top: 4px; }
    .section-title { font-size: 14px; font-weight: 700; color: #16324f; margin: 24px 0 10px 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
    th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 700; color: #334155; border-bottom: 2px solid #cbd5e1; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .footer { margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; }
    @media print {
      body { margin: 12px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; background: #e0f2fe; padding: 12px 18px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #bae6fd;">
    <span style="font-size: 13px; color: #0369a1; font-weight: 600;">Reporte oficial generado listo para imprimir o guardar como PDF.</span>
    <button onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 8px 20px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 13px;">Imprimir / Guardar PDF</button>
  </div>

  <div class="header">
    <div>
      <h1 class="title">MI ABEJITA</h1>
      <div class="subtitle">Reporte Consolidado de Ventas y Auditoría</div>
    </div>
    <div class="meta">
      <div><strong>Período:</strong> ${fDesde} al ${fHasta}</div>
      <div><strong>Cajero:</strong> ${dataPeriodo.cajero || "Todos"}</div>
      <div><strong>Fecha de Emisión:</strong> ${emitido}</div>
    </div>
  </div>

  <div class="grid-kpi">
    <div class="kpi-card" style="border-left-color: #16324f;">
      <div class="kpi-title">Total Facturado</div>
      <div class="kpi-value">${total}</div>
    </div>
    <div class="kpi-card" style="border-left-color: #059669;">
      <div class="kpi-title">Cantidad de Ventas</div>
      <div class="kpi-value">${cantVentas}</div>
    </div>
    <div class="kpi-card" style="border-left-color: #2563eb;">
      <div class="kpi-title">Ticket Promedio</div>
      <div class="kpi-value">${ticketPromedio}</div>
    </div>
  </div>

  <div class="section-title">Desglose por Medios de Pago</div>
  <table>
    <thead>
      <tr>
        <th>Efectivo</th>
        <th>Tarjeta Débito</th>
        <th>Tarjeta Crédito</th>
        <th>Transferencia</th>
        <th class="text-right">Total Recaudado</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 10px; font-weight: 700; color: #15803d;">${ef}</td>
        <td style="padding: 10px; font-weight: 700; color: #b45309;">${db}</td>
        <td style="padding: 10px; font-weight: 700; color: #7e22ce;">${cr}</td>
        <td style="padding: 10px; font-weight: 700; color: #1d4ed8;">${tr}</td>
        <td style="padding: 10px; font-weight: 800; text-align: right; color: #16324f; font-size: 14px;">${total}</td>
      </tr>
    </tbody>
  </table>

  ${dataPeriodo.desglose_categorias && dataPeriodo.desglose_categorias.length > 0 ? `
    <div class="section-title">Ventas por Categoría de Producto</div>
    <table>
      <thead>
        <tr>
          <th>Categoría</th>
          <th class="text-center">Unidades / Kilos</th>
          <th class="text-right">Total Recaudado</th>
        </tr>
      </thead>
      <tbody>
        ${categoriasHtml}
      </tbody>
    </table>
  ` : ""}

  ${dataPeriodo.desglose_dias && dataPeriodo.desglose_dias.length > 1 ? `
    <div class="section-title">Evolución Día por Día</div>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th class="text-center">Operaciones</th>
          <th class="text-right">Efectivo</th>
          <th class="text-right">Débito</th>
          <th class="text-right">Crédito</th>
          <th class="text-right">Transferencia</th>
          <th class="text-right">Total Día</th>
        </tr>
      </thead>
      <tbody>
        ${diasHtml}
      </tbody>
    </table>
  ` : ""}

  <div class="footer">
    Almacén Mi Abejita &bull; Sistema Punto de Venta &bull; Documento no válido como factura fiscal
  </div>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

// ── Impresión de Comprobante Individual de Venta (PDF / A4 o Comprobante Digital)
function imprimirComprobanteVentaPDF(venta) {
  const win = window.open("", "_blank", "width=500,height=650");
  if (!win) {
    alert("Por favor habilite los popups en el navegador para ver el comprobante.");
    return;
  }

  const f = new Date(venta.fecha);
  const fechaStr = isNaN(f) ? "—" : f.toLocaleString("es-AR");
  const numVenta = `#${String(venta.id_venta).padStart(5, "0")}`;

  const itemsHtml = (venta.detalles || []).map((d) => {
    const cant = parseFloat(d.cantidad);
    const cantStr = cant % 1 === 0 ? cant : cant.toFixed(3);
    const unit = fmt(d.precio_unitario);
    const sub = fmt(d.subtotal || cant * parseFloat(d.precio_unitario));
    return `
      <tr>
        <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9;">${d.nombre_producto || "Producto"}</td>
        <td style="text-align: center; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">${cantStr}</td>
        <td style="text-align: right; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">${unit}</td>
        <td style="text-align: right; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700;">${sub}</td>
      </tr>
    `;
  }).join("");

  const pagosHtml = (venta.pagos || []).map((p) => `
    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px;">
      <span>- ${METODO_LABELS[p.metodo] || p.metodo}${p.referencia ? ` (${p.referencia})` : ""}:</span>
      <strong>${fmt(p.monto)}</strong>
    </div>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante ${numVenta} - MI ABEJITA</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 24px; font-size: 13px; color: #0f172a; background: #fff; line-height: 1.4; }
    .header { text-align: center; border-bottom: 2px solid #16324f; padding-bottom: 10px; margin-bottom: 12px; }
    .title { font-size: 20px; font-weight: 800; color: #16324f; margin: 0; }
    .meta { font-size: 12px; margin-bottom: 12px; color: #475569; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 12px 0; }
    th { border-bottom: 2px solid #cbd5e1; padding: 6px 0; text-align: left; color: #334155; font-weight: 700; }
    .total-box { border-top: 2px solid #16324f; border-bottom: 2px solid #16324f; padding: 10px 0; margin: 12px 0; display: flex; justify-content: space-between; font-size: 18px; font-weight: 800; color: #16324f; }
    .footer { text-align: center; font-size: 11px; margin-top: 24px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
    @media print {
      .no-print { display: none !important; }
      body { margin: 10px; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; text-align: center;">
    <button onclick="window.print()" style="background: #0284c7; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 13px;">Imprimir Comprobante</button>
  </div>
  <div class="header">
    <div class="title">MI ABEJITA</div>
    <div style="font-size: 12px; color: #64748b; font-weight: 600;">PRESUPUESTO / COMPROBANTE DE VENTA</div>
  </div>
  <div class="meta">
    <div><strong>Ticket:</strong> ${numVenta}</div>
    <div><strong>Fecha y Hora:</strong> ${fechaStr}</div>
    <div><strong>Vendedor:</strong> ${venta.nombre_usuario || "Vendedor"}</div>
    <div><strong>Turno de Caja:</strong> #${venta.id_session}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Detalle Producto</th>
        <th style="text-align: center;">Cant</th>
        <th style="text-align: right;">P. Unit</th>
        <th style="text-align: right;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
  <div class="total-box">
    <span>TOTAL FACTURADO:</span>
    <span>${fmt(venta.total)}</span>
  </div>
  <div style="margin-top: 8px;">
    <div style="font-size: 11px; font-weight: 700; margin-bottom: 4px; color: #64748b;">FORMA DE PAGO:</div>
    ${pagosHtml}
  </div>
  <div class="footer">
    ¡Muchas gracias por su compra en Almacén Mi Abejita!<br>
    COMPROBANTE NO VALIDO COMO FACTURA FISCAL
  </div>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

// ── Fila de Venta Individual (Expandible) ──────────────────────────────────────
function VentaRow({ venta, onNotificar }) {
  const [open, setOpen] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);

  const pagos = venta.pagos || [];
  const esCombinado = pagos.length > 1;

  const handleImprimirTermica = async (e) => {
    if (e) e.stopPropagation();
    setImprimiendo(true);
    try {
      const payload = {
        id_venta: venta.id_venta,
        numero_ticket: `#${String(venta.id_venta).padStart(5, "0")}`,
        fecha: venta.fecha,
        vendedor: venta.nombre_usuario || "Vendedor",
        items: (venta.detalles || []).map((d) => ({
          nombre_producto: d.nombre_producto || `Producto #${d.id_producto}`,
          cantidad: parseFloat(d.cantidad),
          precio_unitario: parseFloat(d.precio_unitario),
          subtotal: d.subtotal ? parseFloat(d.subtotal) : parseFloat(d.cantidad) * parseFloat(d.precio_unitario),
        })),
        total: parseFloat(venta.total),
        pagos: (venta.pagos || []).map((p) => ({
          metodo: p.metodo,
          monto: parseFloat(p.monto),
          referencia: p.referencia || undefined,
        })),
        abrir_cajon: false,
        cliente: "Consumidor Final",
      };

      await imprimirTicket(payload);
      if (onNotificar) onNotificar(`Ticket de Venta #${String(venta.id_venta).padStart(5, "0")} impreso en comandera térmica ✓`, "success");
    } catch (err) {
      console.warn("Error al imprimir ticket de venta:", err);
      if (onNotificar) onNotificar(`No se pudo imprimir el ticket: ${err.message}`, "error");
    } finally {
      setImprimiendo(false);
    }
  };

  const handleVerComprobantePDF = (e) => {
    if (e) e.stopPropagation();
    imprimirComprobanteVentaPDF(venta);
  };

  return (
    <>
      <TableRow
        hover
        onClick={() => setOpen(!open)}
        sx={{
          cursor: "pointer",
          bgcolor: open ? "action.selected" : "inherit",
          "& > td": { borderBottom: open ? "none" : undefined },
        }}
      >
        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontWeight: 700, fontFamily: "monospace" }}>
          #{String(venta.id_venta).padStart(5, "0")}
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {fmtFecha(venta.fecha)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {fmtHora(venta.fecha)}
          </Typography>
        </TableCell>
        <TableCell>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <PersonIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            <Typography variant="body2">{venta.nombre_usuario || "—"}</Typography>
          </Box>
        </TableCell>
        <TableCell>
          <Chip
            size="small"
            label={`Turno #${venta.id_session}`}
            variant="outlined"
            sx={{ fontSize: "0.75rem", height: 22 }}
          />
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
            {esCombinado ? (
              <Chip
                size="small"
                label={`Combinado (${pagos.length})`}
                color="secondary"
                sx={{ fontWeight: 600, fontSize: "0.75rem" }}
              />
            ) : pagos.length === 1 ? (
              <MetodoChip metodo={pagos[0].metodo} />
            ) : (
              <Typography variant="caption" color="text.secondary">—</Typography>
            )}
          </Stack>
        </TableCell>
        <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
          {fmt(venta.total)}
        </TableCell>
        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Imprimir Ticket Térmico de esta venta">
            <span>
              <IconButton
                size="small"
                color="primary"
                onClick={handleImprimirTermica}
                disabled={imprimiendo}
                sx={{ bgcolor: "#F1F5F9", border: "1px solid #CBD5E1" }}
              >
                <PrintIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0, bgcolor: "#F8FAFC", borderBottom: open ? "1px solid #E2E8F0" : "none" }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 2 }}>
              <Grid container spacing={3}>
                {/* Detalle de Productos */}
                <Grid item xs={12} md={7}>
                  <Typography variant="subtitle2" color="primary" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <ShoppingCartOutlinedIcon fontSize="small" />
                    Ítems de la Venta ({venta.detalles?.length || 0})
                  </Typography>

                  <Paper variant="outlined" sx={{ bgcolor: "#FFFFFF", overflow: "hidden" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "#F1F5F9" }}>
                          <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Producto</TableCell>
                          <TableCell align="center" sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Cant.</TableCell>
                          <TableCell align="right" sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Precio Unit.</TableCell>
                          <TableCell align="right" sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Subtotal</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {venta.detalles && venta.detalles.length > 0 ? (
                          venta.detalles.map((d) => {
                            const cantNum = parseFloat(d.cantidad);
                            const cantFmt = cantNum % 1 === 0 ? cantNum : cantNum.toFixed(3);
                            const precioUnit = parseFloat(d.precio_unitario);
                            const subtotal = d.subtotal ? parseFloat(d.subtotal) : cantNum * precioUnit;
                            return (
                              <TableRow key={d.id_detalle}>
                                <TableCell sx={{ fontWeight: 600 }}>
                                  {d.nombre_producto || `Producto #${d.id_producto}`}
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    size="small"
                                    label={`x ${cantFmt}`}
                                    sx={{ height: 20, fontSize: "0.75rem", fontWeight: 600 }}
                                  />
                                </TableCell>
                                <TableCell align="right">{fmt(precioUnit)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                  {fmt(subtotal)}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 2, color: "text.secondary" }}>
                              Sin ítems registrados
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                          <TableCell colSpan={3} sx={{ fontWeight: 700, textAlign: "right" }}>
                            Total de la Venta:
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: "primary.main", fontSize: "1rem" }}>
                            {fmt(venta.total)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Paper>
                </Grid>

                {/* Detalle de Pagos & Auditoría */}
                <Grid item xs={12} md={5}>
                  <Typography variant="subtitle2" color="primary" sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <PaymentsIcon fontSize="small" />
                    Métodos de Pago & Auditoría
                  </Typography>

                  <Paper variant="outlined" sx={{ p: 2, bgcolor: "#FFFFFF" }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={1}>
                      Desglose de Pago:
                    </Typography>
                    <Stack spacing={1} mb={2}>
                      {pagos.map((p) => (
                        <Box
                          key={p.id_pago}
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            p: 1,
                            borderRadius: 1,
                            bgcolor: "#F8FAFC",
                            border: "1px solid #E2E8F0",
                          }}
                        >
                          <Box>
                            <MetodoChip metodo={p.metodo} />
                            {p.referencia && (
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                                Ref: {p.referencia}
                              </Typography>
                            )}
                          </Box>
                          <Typography variant="body2" fontWeight={700}>
                            {fmt(p.monto)}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>

                    <Divider sx={{ my: 1.5 }} />

                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Vendedor
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {venta.nombre_usuario || "—"}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Sesión de Caja
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          #{venta.id_session}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Hora Exacta Registrada
                        </Typography>
                        <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <AccessTimeIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                          {fmtFechaHora(venta.fecha)}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Botones de Reimpresión de la Venta */}
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        startIcon={<PictureAsPdfIcon />}
                        variant="outlined"
                        size="small"
                        onClick={handleVerComprobantePDF}
                      >
                        Comprobante / PDF
                      </Button>
                      <Button
                        startIcon={<PrintIcon />}
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={handleImprimirTermica}
                        disabled={imprimiendo}
                      >
                        {imprimiendo ? "Imprimiendo..." : "Reimprimir Ticket"}
                      </Button>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ── Fila de Turno de Caja (Expandible) ─────────────────────────────────────────
function TurnoRow({ turno, onNotificar }) {
  const [open, setOpen] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);

  const handleImprimir = async (e) => {
    if (e) e.stopPropagation();
    setImprimiendo(true);
    try {
      await imprimirTicketCierre({
        id_session: turno.id_session,
        vendedor: turno.nombre_usuario_cierre || turno.nombre_usuario_apertura || "Cajero",
        fecha_apertura: turno.fecha_apertura,
        fecha_cierre: turno.fecha_cierre,
        monto_apertura: parseFloat(turno.monto_apertura || 0),
        total_ventas: parseFloat(turno.total_ventas || 0),
        cantidad_ventas: parseInt(turno.cantidad_ventas || 0),
        total_efectivo: parseFloat(turno.total_efectivo || 0),
        total_transferencia: parseFloat(turno.total_transferencia || 0),
        total_debito: parseFloat(turno.total_debito || 0),
        total_credito: parseFloat(turno.total_credito || 0),
        efectivo_esperado: parseFloat(turno.efectivo_esperado || 0),
        efectivo_contado: parseFloat(turno.efectivo_contado || 0),
        diferencia: parseFloat(turno.diferencia || 0),
        observaciones: turno.observaciones_cierre || "",
      });
      if (onNotificar) onNotificar(`Ticket de Turno #${turno.id_session} emitido por impresora térmica ✓`, "success");
    } catch (err) {
      console.warn("Error al imprimir turno:", err);
      if (onNotificar) onNotificar(`No se pudo imprimir ticket de turno: ${err.message}`, "error");
    } finally {
      setImprimiendo(false);
    }
  };

  return (
    <>
      <TableRow
        hover
        onClick={() => setOpen(!open)}
        sx={{
          cursor: "pointer",
          bgcolor: open ? "action.selected" : "inherit",
          "& > td": { borderBottom: open ? "none" : undefined },
        }}
      >
        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontWeight: 700, fontFamily: "monospace" }}>
          #{turno.id_session}
        </TableCell>
        <TableCell>{turno.nombre_usuario_apertura ?? "—"}</TableCell>
        <TableCell>{fmtFechaHora(turno.fecha_apertura)}</TableCell>
        <TableCell>{fmtFechaHora(turno.fecha_cierre)}</TableCell>
        <TableCell align="right" sx={{ fontWeight: 700 }}>
          {fmt(turno.total_ventas)}
        </TableCell>
        <TableCell align="right">{turno.cantidad_ventas}</TableCell>
        <TableCell align="center">
          <DiferenciaBadge valor={turno.diferencia} />
        </TableCell>
        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Imprimir Ticket Térmico de este turno">
            <span>
              <IconButton
                size="small"
                color="primary"
                onClick={handleImprimir}
                disabled={imprimiendo}
                sx={{ bgcolor: "#F1F5F9", border: "1px solid #CBD5E1" }}
              >
                <PrintIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={9} sx={{ py: 0, bgcolor: "#F8FAFC", borderBottom: open ? "1px solid #E2E8F0" : "none" }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ mx: 2, my: 2, display: "flex", gap: 4, flexWrap: "wrap" }}>
              <Box sx={{ minWidth: 260 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.75}>
                  Ventas por método
                </Typography>
                <Stack spacing={0.5}>
                  <MetodoChip metodo="efectivo" monto={turno.total_efectivo} />
                  <MetodoChip metodo="transferencia" monto={turno.total_transferencia} />
                  <MetodoChip metodo="tarjeta_debito" monto={turno.total_debito} />
                  <MetodoChip metodo="tarjeta_credito" monto={turno.total_credito} />
                </Stack>
              </Box>

              <Box sx={{ minWidth: 280 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.75}>
                  Arqueo de Efectivo
                </Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "#FFFFFF" }}>
                  <Typography variant="body2">
                    Apertura: <strong>{fmt(turno.monto_apertura)}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Esperado en caja: <strong>{fmt(turno.efectivo_esperado)}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Contado al cierre: <strong>{fmt(turno.efectivo_contado)}</strong>
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" fontWeight={700}>Diferencia:</Typography>
                    <DiferenciaBadge valor={turno.diferencia} />
                  </Box>
                </Paper>
              </Box>

              {turno.nombre_usuario_cierre && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.5}>
                    Cerrado por
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {turno.nombre_usuario_cierre}
                  </Typography>
                </Box>
              )}

              {turno.observaciones_cierre && (
                <Box sx={{ width: "100%" }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" mb={0.5}>
                    Observaciones
                  </Typography>
                  <Typography variant="body2" sx={{ fontStyle: "italic", bgcolor: "#FFFFFF", p: 1, borderRadius: 1, border: "1px solid #E2E8F0" }}>
                    "{turno.observaciones_cierre}"
                  </Typography>
                </Box>
              )}

              <Box sx={{ width: "100%", display: "flex", justifyContent: "flex-end", pt: 1 }}>
                <Button
                  startIcon={<PrintIcon />}
                  variant="outlined"
                  color="primary"
                  size="small"
                  onClick={handleImprimir}
                  disabled={imprimiendo}
                >
                  {imprimiendo ? "Imprimiendo..." : "Reimprimir Ticket de Turno"}
                </Button>
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ── Componente Principal: HistorialPage ───────────────────────────────────────
export default function HistorialPage() {
  const [tabActual, setTabActual] = useState(0); // 0: Ventas, 1: Turnos, 2: Por Producto

  // Filtros compartidos
  const todayStr = toISODateString(new Date());
  const [fechaDesde, setFechaDesde] = useState(todayStr);
  const [fechaHasta, setFechaHasta] = useState(todayStr);
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState("");
  const [atajoActivo, setAtajoActivo] = useState("hoy");

  // Datos
  const [ventas, setVentas] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [cajeros, setCajeros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Estado: Por Producto (Tab 2)
  const [productosVendidos, setProductosVendidos] = useState([]);
  const [cargandoProductosVendidos, setCargandoProductosVendidos] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");

  // Acciones y feedback
  const [imprimiendoResumen, setImprimiendoResumen] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, mensaje: "", severidad: "info" });

  const mostrarSnackbar = (mensaje, severidad = "info") => {
    setSnackbar({ open: true, mensaje, severidad });
  };

  // Cargar lista de vendedores para el selector
  useEffect(() => {
    getCajeros()
      .then(setCajeros)
      .catch((e) => console.warn("Error al cargar cajeros:", e));
  }, []);

  // Cargar reporte de productos vendidos cuando estamos en la tab 2 y cambian las fechas
  const cargarProductosVendidos = useCallback(async () => {
    if (tabActual !== 2) return;
    setCargandoProductosVendidos(true);
    try {
      const data = await getReporteProductosVendidos({
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
      });
      setProductosVendidos(data);
    } catch (e) {
      console.warn("Error al cargar reporte de productos:", e);
      setProductosVendidos([]);
    } finally {
      setCargandoProductosVendidos(false);
    }
  }, [tabActual, fechaDesde, fechaHasta]);

  useEffect(() => {
    cargarProductosVendidos();
  }, [cargarProductosVendidos]);


  // Función para cargar datos según filtros
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");

    const params = {};
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    if (vendedorSeleccionado) params.id_usuario = vendedorSeleccionado;

    try {
      if (tabActual === 0) {
        const dataVentas = await getVentas({ ...params, limit: 300 });
        setVentas(dataVentas);
      } else {
        const dataTurnos = await getHistorialTurnos({ ...params, limit: 100 });
        setTurnos(dataTurnos);
      }
    } catch (err) {
      setError(err.message || "Error al cargar los datos del historial");
    } finally {
      setCargando(false);
    }
  }, [tabActual, fechaDesde, fechaHasta, vendedorSeleccionado]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Manejo de atajos rápidos de fecha
  const aplicarAtajo = (tipo) => {
    setAtajoActivo(tipo);
    const now = new Date();
    const hoyStr = toISODateString(now);

    if (tipo === "hoy") {
      setFechaDesde(hoyStr);
      setFechaHasta(hoyStr);
    } else if (tipo === "ayer") {
      const ayer = new Date(now);
      ayer.setDate(ayer.getDate() - 1);
      const ayerStr = toISODateString(ayer);
      setFechaDesde(ayerStr);
      setFechaHasta(ayerStr);
    } else if (tipo === "semana") {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // lunes
      const lunes = new Date(d.setDate(diff));
      setFechaDesde(toISODateString(lunes));
      setFechaHasta(hoyStr);
    } else if (tipo === "mes") {
      const primerDia = new Date(now.getFullYear(), now.getMonth(), 1);
      setFechaDesde(toISODateString(primerDia));
      setFechaHasta(hoyStr);
    } else if (tipo === "todo") {
      setFechaDesde("");
      setFechaHasta("");
    }
  };

  const limpiarFiltros = () => {
    setAtajoActivo("todo");
    setFechaDesde("");
    setFechaHasta("");
    setVendedorSeleccionado("");
  };

  // Cálculo de KPIs de ventas para el período filtrado
  const metricasVentas = useMemo(() => {
    let total = 0;
    let efectivo = 0;
    let transferencia = 0;
    let debito = 0;
    let credito = 0;

    ventas.forEach((v) => {
      total += parseFloat(v.total || 0);
      (v.pagos || []).forEach((p) => {
        const monto = parseFloat(p.monto || 0);
        if (p.metodo === "efectivo") efectivo += monto;
        else if (p.metodo === "transferencia") transferencia += monto;
        else if (p.metodo === "tarjeta_debito") debito += monto;
        else if (p.metodo === "tarjeta_credito") credito += monto;
      });
    });

    const cantidad = ventas.length;
    const ticketPromedio = cantidad > 0 ? total / cantidad : 0;

    return {
      total,
      cantidad,
      ticketPromedio,
      efectivo,
      transferencia,
      debito,
      credito,
    };
  }, [ventas]);

  // Handler: Imprimir Ticket Resumen Térmico
  const handleImprimirResumenTermico = async () => {
    setImprimiendoResumen(true);
    try {
      const dataPeriodo = await getReportePeriodo({
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        id_usuario: vendedorSeleccionado || undefined,
      });

      const payload = {
        titulo: "RESUMEN DE VENTAS",
        fecha_desde: dataPeriodo.fecha_desde || fechaDesde || "Inicio",
        fecha_hasta: dataPeriodo.fecha_hasta || fechaHasta || "Hoy",
        usuario: dataPeriodo.cajero || "Todos",
        total_ventas: parseFloat(dataPeriodo.total_recaudado || 0),
        cantidad_ventas: parseInt(dataPeriodo.cantidad_ventas || 0),
        total_efectivo: parseFloat(dataPeriodo.metodos?.efectivo || 0),
        total_transferencia: parseFloat(dataPeriodo.metodos?.transferencia || 0),
        total_debito: parseFloat(dataPeriodo.metodos?.debito || 0),
        total_credito: parseFloat(dataPeriodo.metodos?.credito || 0),
        categorias: (dataPeriodo.desglose_categorias || []).map((c) => ({
          categoria: c.categoria,
          unidades: parseFloat(c.unidades || 0),
          total: parseFloat(c.total || 0),
        })),
      };

      await imprimirTicketResumen(payload);
      mostrarSnackbar("Ticket resumen enviado a la impresora térmica ✓", "success");
    } catch (err) {
      console.warn("Error al imprimir resumen:", err);
      mostrarSnackbar(`No se pudo imprimir ticket resumen: ${err.message}`, "error");
    } finally {
      setImprimiendoResumen(false);
    }
  };

  // Handler: Exportar PDF
  const handleExportarPDF = async () => {
    setExportandoPDF(true);
    try {
      const dataPeriodo = await getReportePeriodo({
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        id_usuario: vendedorSeleccionado || undefined,
      });
      generarReportePDF(dataPeriodo, fechaDesde, fechaHasta);
    } catch (err) {
      console.warn("Error al exportar PDF:", err);
      mostrarSnackbar(`Error al generar reporte PDF: ${err.message}`, "error");
    } finally {
      setExportandoPDF(false);
    }
  };

  // Handler: Exportar CSV
  const handleExportarCSV = () => {
    if (ventas.length === 0) {
      mostrarSnackbar("No hay ventas en la lista para exportar", "warning");
      return;
    }
    exportarVentasCSV(ventas, fechaDesde, fechaHasta);
    mostrarSnackbar("Listado de ventas exportado a Excel (CSV) ✓", "success");
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      {/* Encabezado y Selector de Vistas */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, flexDirection: { xs: "column", sm: "row" }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="primary.main">
            Historial de Operaciones
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Auditoría de ventas individuales y cierres de turno de caja &bull; Mi Abejita
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: 0.5, bgcolor: "#FFFFFF", borderRadius: 2 }}>
          <Tabs
            value={tabActual}
            onChange={(_, val) => setTabActual(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{ minHeight: 38 }}
          >
            <Tab
              icon={<ReceiptLongIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Detalle por Venta"
              sx={{ minHeight: 38, py: 0.75, fontWeight: 700, fontSize: "0.85rem" }}
            />
            <Tab
              icon={<PointOfSaleIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Turnos de Caja"
              sx={{ minHeight: 38, py: 0.75, fontWeight: 700, fontSize: "0.85rem" }}
            />
            <Tab
              icon={<BarChartIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Por Producto"
              sx={{ minHeight: 38, py: 0.75, fontWeight: 700, fontSize: "0.85rem" }}
            />
          </Tabs>
        </Paper>
      </Box>

      {/* Panel de Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Grid container spacing={2} alignItems="flex-start">
            {/* Atajos Rápidos */}
            <Grid item xs={12} sm="auto" md="auto">
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: "block", mb: 0.75 }}>
                  Período Rápido
                </Typography>
                <ButtonGroup
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 38,
                    "& .MuiButton-root": {
                      px: { xs: 1.25, md: 1.5 },
                      py: 0,
                      height: 38,
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      whiteSpace: "nowrap",
                    },
                  }}
                >
                  {[
                    { id: "hoy", label: "Hoy" },
                    { id: "ayer", label: "Ayer" },
                    { id: "semana", label: "Esta semana" },
                    { id: "mes", label: "Este mes" },
                    { id: "todo", label: "Todo" },
                  ].map((btn) => (
                    <Button
                      key={btn.id}
                      variant={atajoActivo === btn.id ? "contained" : "outlined"}
                      onClick={() => aplicarAtajo(btn.id)}
                    >
                      {btn.label}
                    </Button>
                  ))}
                </ButtonGroup>
              </Box>
            </Grid>

            {/* Inputs de Fecha */}
            <Grid item xs={6} sm={3} md="auto" sx={{ minWidth: { sm: 145, md: 155 } }}>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: "block", mb: 0.75 }}>
                  Desde
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => {
                    setFechaDesde(e.target.value);
                    setAtajoActivo("");
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      height: 38,
                    },
                  }}
                />
              </Box>
            </Grid>

            <Grid item xs={6} sm={3} md="auto" sx={{ minWidth: { sm: 145, md: 155 } }}>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: "block", mb: 0.75 }}>
                  Hasta
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => {
                    setFechaHasta(e.target.value);
                    setAtajoActivo("");
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      height: 38,
                    },
                  }}
                />
              </Box>
            </Grid>

            {/* Filtro por Vendedor */}
            {tabActual !== 2 && (
              <Grid item xs={12} sm={4} md sx={{ minWidth: { sm: 180, md: 200 } }}>
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: "block", mb: 0.75 }}>
                    Vendedor
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={vendedorSeleccionado}
                      onChange={(e) => setVendedorSeleccionado(e.target.value)}
                      displayEmpty
                      sx={{ height: 38 }}
                    >
                      <MenuItem value="">
                        <em>Todos los vendedores</em>
                      </MenuItem>
                      {cajeros.map((u) => (
                        <MenuItem key={u.id_usuario} value={u.id_usuario}>
                          {u.nombre}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Grid>
            )}

            {/* Botones de Acción de Filtro */}
            <Grid item xs={12} sm={2} md="auto">
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                <Typography
                  variant="caption"
                  sx={{ display: { xs: "none", sm: "block" }, mb: 0.75, visibility: "hidden" }}
                >
                  Acciones
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ height: 38 }}>
                  <Tooltip title="Recargar datos">
                    <IconButton
                      color="primary"
                      onClick={cargarDatos}
                      sx={{
                        height: 38,
                        width: 38,
                        borderRadius: 2,
                        bgcolor: "#F1F5F9",
                        border: "1px solid #CBD5E1",
                        "&:hover": { bgcolor: "#E2E8F0" },
                      }}
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {(fechaDesde || fechaHasta || vendedorSeleccionado) && (
                    <Tooltip title="Limpiar todos los filtros">
                      <IconButton
                        color="default"
                        onClick={limpiarFiltros}
                        sx={{
                          height: 38,
                          width: 38,
                          borderRadius: 2,
                          bgcolor: "#F1F5F9",
                          border: "1px solid #CBD5E1",
                          "&:hover": { bgcolor: "#E2E8F0" },
                        }}
                      >
                        <FilterAltOffIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Alerta de Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Resumen KPI para la Vista de Ventas */}
      {tabActual === 0 && !cargando && ventas.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: "#FFFFFF", borderLeft: "4px solid #16324F" }}>
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  TOTAL FACTURADO
                </Typography>
                <Typography variant="h5" fontWeight={800} color="primary.main" sx={{ fontFeatureSettings: '"tnum" 1' }}>
                  {fmt(metricasVentas.total)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  En el período seleccionado
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} sm={6} md={2.5}>
            <Card sx={{ bgcolor: "#FFFFFF", borderLeft: "4px solid #059669" }}>
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  CANTIDAD DE VENTAS
                </Typography>
                <Typography variant="h5" fontWeight={800} color="secondary.main" sx={{ fontFeatureSettings: '"tnum" 1' }}>
                  {metricasVentas.cantidad}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  operaciones registradas
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} sm={6} md={2.5}>
            <Card sx={{ bgcolor: "#FFFFFF", borderLeft: "4px solid #2563EB" }}>
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  TICKET PROMEDIO
                </Typography>
                <Typography variant="h5" fontWeight={800} color="info.main" sx={{ fontFeatureSettings: '"tnum" 1' }}>
                  {fmt(metricasVentas.ticketPromedio)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  por operación
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: "#FFFFFF" }}>
              <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
                  COBROS POR MÉTODO
                </Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.5}>
                  <MetodoChip metodo="efectivo" monto={metricasVentas.efectivo} />
                  <MetodoChip metodo="tarjeta_debito" monto={metricasVentas.debito} />
                  <MetodoChip metodo="tarjeta_credito" monto={metricasVentas.credito} />
                  <MetodoChip metodo="transferencia" monto={metricasVentas.transferencia} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Barra de Acciones de Exportación e Impresión */}
      {tabActual !== 2 && (
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            {tabActual === 0 ? `Ventas Registradas (${ventas.length})` : `Turnos de Caja Cerrados (${turnos.length})`}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<PrintIcon />}
            onClick={handleImprimirResumenTermico}
            disabled={cargando || imprimiendoResumen}
            sx={{ fontWeight: 700 }}
          >
            {imprimiendoResumen ? "Imprimiendo..." : "Ticket Resumen (Térmica)"}
          </Button>

          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleExportarPDF}
            disabled={cargando || exportandoPDF}
            sx={{ fontWeight: 700 }}
          >
            {exportandoPDF ? "Generando..." : "Exportar PDF (A4)"}
          </Button>

          {tabActual === 0 && (
            <Button
              variant="outlined"
              color="success"
              size="small"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportarCSV}
              disabled={cargando || ventas.length === 0}
              sx={{ fontWeight: 700 }}
            >
              Exportar Excel (CSV)
            </Button>
          )}
        </Stack>
      </Box>
      )}


      {/* Contenedor de Tablas con Indicador de Carga */}
      {cargando && tabActual !== 2 ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : tabActual === 0 ? (
        // ── TAB 0: VENTAS INDIVIDUALES ──────────────────────────────────────────
        <Box>
          {ventas.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: "center", bgcolor: "#FFFFFF" }}>
              <Typography color="text.secondary">
                No se encontraron ventas para los filtros aplicados.
              </Typography>
            </Paper>
          ) : (
            <Paper variant="outlined" sx={{ overflow: "hidden", bgcolor: "#FFFFFF" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>N° Venta</TableCell>
                    <TableCell>Fecha y Hora</TableCell>
                    <TableCell>Vendedor</TableCell>
                    <TableCell>Turno</TableCell>
                    <TableCell>Método de Pago</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="center">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ventas.map((v) => (
                    <VentaRow
                      key={v.id_venta}
                      venta={v}
                      onNotificar={(msg, sev) => mostrarSnackbar(msg, sev)}
                    />
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </Box>
      ) : tabActual === 1 ? (
        // ── TAB 1: TURNOS DE CAJA ───────────────────────────────────────────────
        <Box>
          {turnos.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: "center", bgcolor: "#FFFFFF" }}>
              <Typography color="text.secondary">
                No se encontraron turnos cerrados para los filtros aplicados.
              </Typography>
            </Paper>
          ) : (
            <Paper variant="outlined" sx={{ overflow: "hidden", bgcolor: "#FFFFFF" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>Turno</TableCell>
                    <TableCell>Cajero</TableCell>
                    <TableCell>Apertura</TableCell>
                    <TableCell>Cierre</TableCell>
                    <TableCell align="right">Total Vendido</TableCell>
                    <TableCell align="right">Ventas</TableCell>
                    <TableCell align="center">Diferencia</TableCell>
                    <TableCell align="center">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {turnos.map((t) => (
                    <TurnoRow
                      key={t.id_session}
                      turno={t}
                      onNotificar={(msg, sev) => mostrarSnackbar(msg, sev)}
                    />
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </Box>
      ) : (
        // ── TAB 2: POR PRODUCTO (TABLA) ──────────────────────────────────────────
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Ventas por Producto en el Período
            </Typography>
            <TextField
              size="small"
              placeholder="Buscar producto..."
              value={busquedaProducto}
              onChange={(e) => setBusquedaProducto(e.target.value)}
              sx={{ width: { xs: "100%", sm: 300 }, bgcolor: "#fff", borderRadius: 1 }}
            />
          </Box>

          {cargandoProductosVendidos ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Paper variant="outlined" sx={{ overflow: "hidden", bgcolor: "#FFFFFF" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell align="right">Cantidad Vendida</TableCell>
                    <TableCell align="right">Total Facturado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {productosVendidos
                    .filter((p) => p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()))
                    .map((p) => {
                      const qty = parseFloat(p.cantidad_total);
                      const facturado = parseFloat(p.total_facturado);
                      const isCero = qty === 0;

                      return (
                        <TableRow key={p.id_producto} hover sx={{ opacity: isCero ? 0.6 : 1 }}>
                          <TableCell sx={{ fontWeight: isCero ? 400 : 600 }}>{p.nombre}</TableCell>
                          <TableCell align="right">
                            {isCero ? "—" : (qty % 1 === 0 ? qty : qty.toFixed(3))}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: isCero ? 400 : 700, color: isCero ? "inherit" : "success.main" }}>
                            {isCero ? "—" : fmt(facturado)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {productosVendidos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 3, color: "text.secondary" }}>
                        No hay productos en el catálogo para mostrar.
                      </TableCell>
                    </TableRow>
                  )}
                  {productosVendidos.length > 0 && productosVendidos.filter((p) => p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 3, color: "text.secondary" }}>
                        Ningún producto coincide con la búsqueda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          )}
        </Box>
      )}


      {/* Snackbar de notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severidad}
          sx={{ width: "100%", boxShadow: 3 }}
        >
          {snackbar.mensaje}
        </Alert>
      </Snackbar>
    </Box>
  );
}

