import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip as MuiTooltip,
  ButtonGroup,
  Button,
  useTheme,
  Stack,
} from "@mui/material";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import BarChartIcon from "@mui/icons-material/BarChart";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import EventNoteIcon from "@mui/icons-material/EventNote";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { getVentasPorDia } from "../../api/reportes";

// ── Formateadores ─────────────────────────────────────────────────────────────
function fmtCurrency(val) {
  const num = parseFloat(val ?? 0);
  return `$${num.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtCurrencyShort(val) {
  const num = parseFloat(val ?? 0);
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1).replace(".", ",")}M`;
  }
  if (num >= 10000) {
    return `$${(num / 1000).toFixed(0)}k`;
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(1).replace(".", ",")}k`;
  }
  return `$${num.toFixed(0)}`;
}

function parseDate(fechaStr) {
  if (!fechaStr) return new Date();
  const [y, m, d] = fechaStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtXAxis(fechaStr) {
  if (!fechaStr) return "";
  const d = parseDate(fechaStr);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}`;
}

function fmtTooltipDate(fechaStr) {
  if (!fechaStr) return "";
  const d = parseDate(fechaStr);
  return d.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

// ── Tooltip personalizado para Recharts ───────────────────────────────────────
function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    const total = parseFloat(dataPoint.total || 0);
    const cant = dataPoint.cantidad_ventas || 0;

    return (
      <Box
        sx={{
          bgcolor: "#0F172A",
          color: "#FFFFFF",
          p: 1.5,
          borderRadius: 2,
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          minWidth: 160,
          pointerEvents: "none",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: "#94A3B8",
            textTransform: "capitalize",
            display: "block",
            mb: 0.75,
            fontWeight: 600,
          }}
        >
          {fmtTooltipDate(label)}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 2 }}>
          <Typography variant="body2" sx={{ color: "#E2E8F0", fontSize: "0.8rem" }}>
            Total vendido:
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#34D399" }}>
            {fmtCurrency(total)}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mt: 0.5 }}>
          <Typography variant="caption" sx={{ color: "#94A3B8" }}>
            Operaciones:
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "#F8FAFC" }}>
            {cant === 1 ? "1 venta" : `${cant} ventas`}
          </Typography>
        </Box>
      </Box>
    );
  }
  return null;
}

export default function VentasPorDiaChart() {
  const theme = useTheme();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartType, setChartType] = useState("area"); // 'area' | 'bar'

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getVentasPorDia();
      setData(res || []);
    } catch (err) {
      setError(err.message || "Error al cargar gráfico de ventas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Métricas calculadas para los últimos 30 días ─────────────────────────────
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return { total: 0, promedio: 0, maxDia: null, diasConVenta: 0 };
    }
    let total = 0;
    let maxTotal = -1;
    let maxDia = null;
    let diasConVenta = 0;

    data.forEach((d) => {
      const t = parseFloat(d.total || 0);
      total += t;
      if (t > 0) diasConVenta++;
      if (t > maxTotal) {
        maxTotal = t;
        maxDia = d;
      }
    });

    const promedio = data.length > 0 ? total / data.length : 0;
    return { total, promedio, maxDia, diasConVenta };
  }, [data]);

  const primaryColor = theme.palette.primary.main || "#16324F";
  const accentColor = "#059669"; // Verde esmeralda para finanzas

  return (
    <Card
      sx={{
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "#FFFFFF",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
      }}
    >
      <CardContent
        sx={{
          p: { xs: 2, sm: 2.5 },
          flex: 1,
          display: "flex",
          flexDirection: "column",
          "&:last-child": { pb: { xs: 2, sm: 2.5 } },
        }}
      >
        {/* ── Encabezado y Controles ───────────────────────────────────────── */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: 2,
            mb: 2.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: "#EFF6FF",
                color: "#2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <TrendingUpIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h6" fontWeight={800} sx={{ color: "text.primary", lineHeight: 1.2 }}>
                  Ventas de los Últimos 30 Días
                </Typography>
                <Chip
                  label="Últimos 30 días"
                  size="small"
                  variant="outlined"
                  sx={{
                    fontWeight: 600,
                    fontSize: "0.7rem",
                    height: 22,
                    borderColor: "#CBD5E1",
                    color: "text.secondary",
                    display: { xs: "none", md: "inline-flex" },
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Evolución diaria de facturación y tendencia comercial
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" alignSelf={{ xs: "flex-end", sm: "center" }}>
            <ButtonGroup size="small" variant="outlined" sx={{ height: 32 }}>
              <Button
                variant={chartType === "area" ? "contained" : "outlined"}
                onClick={() => setChartType("area")}
                startIcon={<ShowChartIcon sx={{ fontSize: "16px !important" }} />}
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  bgcolor: chartType === "area" ? primaryColor : undefined,
                  color: chartType === "area" ? "#fff" : "text.secondary",
                  borderColor: "#CBD5E1",
                  "&:hover": {
                    bgcolor: chartType === "area" ? primaryColor : "#F8FAFC",
                  },
                }}
              >
                Línea
              </Button>
              <Button
                variant={chartType === "bar" ? "contained" : "outlined"}
                onClick={() => setChartType("bar")}
                startIcon={<BarChartIcon sx={{ fontSize: "16px !important" }} />}
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  bgcolor: chartType === "bar" ? primaryColor : undefined,
                  color: chartType === "bar" ? "#fff" : "text.secondary",
                  borderColor: "#CBD5E1",
                  "&:hover": {
                    bgcolor: chartType === "bar" ? primaryColor : "#F8FAFC",
                  },
                }}
              >
                Barras
              </Button>
            </ButtonGroup>

            <MuiTooltip title="Actualizar datos">
              <span>
                <IconButton
                  size="small"
                  onClick={fetchData}
                  disabled={loading}
                  sx={{
                    border: "1px solid #CBD5E1",
                    borderRadius: 1.5,
                    width: 32,
                    height: 32,
                  }}
                >
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </MuiTooltip>
          </Stack>
        </Box>

        {/* ── KPIs Rápidos de los 30 Días ─────────────────────────────────── */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            gap: 1.5,
            mb: 2.5,
            p: 1.5,
            bgcolor: "#F8FAFC",
            borderRadius: 2,
            border: "1px solid #E2E8F0",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: "#DCFCE7",
                color: "#15803D",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <EventNoteIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                Total acumulado 30 días
              </Typography>
              <Typography variant="subtitle1" fontWeight={800} sx={{ color: "text.primary", lineHeight: 1.2 }}>
                {fmtCurrency(stats.total)}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 1,
              borderLeft: { sm: "1px solid #E2E8F0" },
              borderRight: { sm: "1px solid #E2E8F0" },
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: "#DBEAFE",
                color: "#1D4ED8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <TrendingUpIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                Promedio diario
              </Typography>
              <Typography variant="subtitle1" fontWeight={800} sx={{ color: "text.primary", lineHeight: 1.2 }}>
                {fmtCurrency(stats.promedio)}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: "#FEF3C7",
                color: "#B45309",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <EmojiEventsIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                Día récord {stats.maxDia && parseFloat(stats.maxDia.total) > 0 ? `(${fmtXAxis(stats.maxDia.fecha)})` : ""}
              </Typography>
              <Typography variant="subtitle1" fontWeight={800} sx={{ color: "text.primary", lineHeight: 1.2 }}>
                {stats.maxDia && parseFloat(stats.maxDia.total) > 0 ? fmtCurrency(stats.maxDia.total) : "—"}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* ── Cuerpo del Gráfico / Estados de Carga y Error ────────────────── */}
        {loading ? (
          <Box
            sx={{
              height: 280,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
            }}
          >
            <CircularProgress size={36} />
            <Typography variant="caption" color="text.secondary">
              Cargando métricas de ventas...
            </Typography>
          </Box>
        ) : error ? (
          <Alert
            severity="warning"
            action={
              <Button color="inherit" size="small" onClick={fetchData}>
                Reintentar
              </Button>
            }
          >
            {error}
          </Alert>
        ) : data.length === 0 ? (
          <Box
            sx={{
              height: 260,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "#F8FAFC",
              borderRadius: 2,
              border: "1px dashed #CBD5E1",
            }}
          >
            <ShowChartIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
            <Typography variant="body2" fontWeight={600} color="text.secondary">
              Sin datos de ventas en los últimos 30 días
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Las ventas registradas se graficarán automáticamente aquí día a día.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ width: "100%", flex: 1, minHeight: 260, mt: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart
                  data={data}
                  margin={{ top: 10, right: 15, left: 5, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="ventasGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={accentColor} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={accentColor} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E2E8F0"
                  />
                  <XAxis
                    dataKey="fecha"
                    tickFormatter={fmtXAxis}
                    tick={{ fill: "#64748B", fontSize: 11, fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: "#CBD5E1" }}
                    minTickGap={20}
                  />
                  <YAxis
                    tickFormatter={fmtCurrencyShort}
                    tick={{ fill: "#64748B", fontSize: 11, fontWeight: 500 }}
                    tickLine={false}
                    axisLine={false}
                    width={55}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total Recaudado"
                    stroke={accentColor}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#ventasGradient)"
                    activeDot={{ r: 6, stroke: "#FFFFFF", strokeWidth: 2, fill: accentColor }}
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={data}
                  margin={{ top: 10, right: 15, left: 5, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E2E8F0"
                  />
                  <XAxis
                    dataKey="fecha"
                    tickFormatter={fmtXAxis}
                    tick={{ fill: "#64748B", fontSize: 11, fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: "#CBD5E1" }}
                    minTickGap={20}
                  />
                  <YAxis
                    tickFormatter={fmtCurrencyShort}
                    tick={{ fill: "#64748B", fontSize: 11, fontWeight: 500 }}
                    tickLine={false}
                    axisLine={false}
                    width={55}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar
                    dataKey="total"
                    name="Total Recaudado"
                    fill={accentColor}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
