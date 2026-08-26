import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Grid, Card, CardContent, Alert, CircularProgress, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, Paper, Button, Avatar, Tooltip
} from "@mui/material";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import StarIcon from "@mui/icons-material/Star";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import { API_URL, getHeaders } from "../api/client";

function fmt(val) {
  return `$${parseFloat(val ?? 0).toFixed(2)}`;
}

function MetricCard({ icon: Icon, label, value, iconColor, iconBg, children }) {
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
        justifyContent: "space-between",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
        transition: "box-shadow 0.2s, transform 0.15s",
        "&:hover": {
          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.07)",
        },
      }}
    >
      <CardContent
        sx={{
          p: 2.5,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          "&:last-child": { pb: 2.5 },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={700}
              sx={{ textTransform: "uppercase", letterSpacing: "0.04em", display: "block" }}
            >
              {label}
            </Typography>
            <Typography
              variant="h3"
              fontWeight={800}
              sx={{ lineHeight: 1.15, mt: 0.5, color: "text.primary", letterSpacing: "-0.02em" }}
            >
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: iconBg,
              color: iconColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon sx={{ fontSize: 24 }} />
          </Box>
        </Box>

        <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
          {children}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/reportes/dashboard`, { headers: getHeaders() })
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar el dashboard (sesión expirada o no autorizada)");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const metodosActivos = data
    ? [
        { label: "Efectivo", val: data.metodos_hoy.efectivo, color: "success" },
        { label: "Transf.", val: data.metodos_hoy.transferencia, color: "info" },
        { label: "Débito", val: data.metodos_hoy.debito, color: "warning" },
        { label: "Crédito", val: data.metodos_hoy.credito, color: "secondary" },
      ].filter((m) => parseFloat(m.val || 0) > 0)
    : [];

  return (
    <Box sx={{ p: { xs: 2, md: 3.5 }, width: "100%", boxSizing: "border-box" }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Dashboard de Control
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Métricas y estado del negocio en tiempo real.
        </Typography>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert>}

      {!data && !error ? (
        <Box display="flex" justifyContent="center" mt={6}>
          <CircularProgress />
        </Box>
      ) : data ? (
        <Grid container spacing={3}>
          {/* ── Tarjeta 1: Ventas de hoy ─────────────────────────── */}
          <Grid item xs={12} sm={6} md={4}>
            <MetricCard
              icon={PointOfSaleIcon}
              label="Ventas del Día"
              value={data.ventas_hoy}
              iconColor="#2563EB"
              iconBg="#EFF6FF"
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                {data.ventas_hoy === 1 ? "1 ticket emitido hoy" : `${data.ventas_hoy} tickets emitidos hoy`}
              </Typography>
            </MetricCard>
          </Grid>

          {/* ── Tarjeta 2: Recaudado hoy ─────────────────────────── */}
          <Grid item xs={12} sm={6} md={4}>
            <MetricCard
              icon={AttachMoneyIcon}
              label="Recaudado Hoy"
              value={fmt(data.total_hoy)}
              iconColor="#059669"
              iconBg="#ECFDF5"
            >
              {metodosActivos.length > 0 ? (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {metodosActivos.map((m) => (
                    <Chip
                      key={m.label}
                      size="small"
                      label={`${m.label}: ${fmt(m.val)}`}
                      variant="outlined"
                      color={m.color}
                      sx={{ fontSize: "0.75rem", height: 22, fontWeight: 600 }}
                    />
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Sin cobros registrados hoy aún
                </Typography>
              )}
            </MetricCard>
          </Grid>

          {/* ── Tarjeta 3: Cajas abiertas ────────────────────────── */}
          <Grid item xs={12} sm={12} md={4}>
            <MetricCard
              icon={LockOpenIcon}
              label="Cajas Abiertas Ahora"
              value={data.cajas_abiertas.length}
              iconColor={data.cajas_abiertas.length > 0 ? "#D97706" : "#64748B"}
              iconBg={data.cajas_abiertas.length > 0 ? "#FFFBEB" : "#F1F5F9"}
            >
              {data.cajas_abiertas.length > 0 ? (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  {data.cajas_abiertas.map((c) => (
                    <Tooltip
                      key={c.id_session}
                      title={`Inicio: $${Number(c.monto_apertura || 0).toLocaleString("es-AR")} | Efectivo en caja: $${Number(c.efectivo_actual || 0).toLocaleString("es-AR")} | Total turno: $${Number(c.total_ventas || 0).toLocaleString("es-AR")}`}
                      arrow
                    >
                      <Chip
                        size="small"
                        avatar={
                          <Avatar
                            sx={{
                              width: 18,
                              height: 18,
                              fontSize: "0.65rem",
                              bgcolor: "#16324F",
                              color: "#fff",
                            }}
                          >
                            {c.cajero[0]?.toUpperCase()}
                          </Avatar>
                        }
                        label={`${c.cajero} · $${Number(c.total_ventas || 0).toLocaleString("es-AR")}`}
                        variant="outlined"
                        sx={{ height: 26, fontSize: "0.75rem", fontWeight: 600 }}
                      />
                    </Tooltip>
                  ))}
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Ninguna caja en operación actualmente
                </Typography>
              )}
            </MetricCard>
          </Grid>

          {/* ── Tarjeta 4: Top 5 más vendidos (Mitad Izquierda) ──── */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                borderRadius: 2.5,
                border: "1px solid",
                borderColor: "divider",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                bgcolor: "#FFFFFF",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <CardContent
                sx={{
                  p: 2.5,
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  "&:last-child": { pb: 2.5 },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        bgcolor: "#FEF3C7",
                        color: "#D97706",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <StarIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Top 5 Más Vendidos
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Ranking mensual por volumen y recaudación
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label="Este mes"
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600, fontSize: "0.7rem", height: 22 }}
                  />
                </Box>

                {data.top_productos_mes.length === 0 ? (
                  <Box
                    sx={{
                      py: 4,
                      px: 2,
                      textAlign: "center",
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "#F8FAFC",
                      borderRadius: 2,
                      border: "1px dashed #CBD5E1",
                    }}
                  >
                    <ShoppingBagIcon sx={{ fontSize: 32, color: "text.disabled", mb: 1 }} />
                    <Typography variant="body2" fontWeight={600} color="text.secondary">
                      Sin ventas registradas este mes
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      Las estadísticas de los artículos más vendidos aparecerán aquí automáticamente.
                    </Typography>
                  </Box>
                ) : (
                  <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 2, flex: 1 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: "action.hover" }}>
                        <TableRow>
                          <TableCell sx={{ width: 36, py: 1 }}>#</TableCell>
                          <TableCell sx={{ py: 1 }}>Producto</TableCell>
                          <TableCell align="right" sx={{ py: 1 }}>Unidades</TableCell>
                          <TableCell align="right" sx={{ py: 1 }}>Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.top_productos_mes.map((p, i) => {
                          const rankColor = i === 0 ? "#B45309" : i === 1 ? "#475569" : i === 2 ? "#92400E" : "#64748B";
                          const rankBg = i === 0 ? "#FEF3C7" : i === 1 ? "#F1F5F9" : i === 2 ? "#FFEDD5" : "#F8FAFC";
                          return (
                            <TableRow key={p.id_producto || i} hover>
                              <TableCell sx={{ py: 1 }}>
                                <Box
                                  sx={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: "50%",
                                    bgcolor: rankBg,
                                    color: rankColor,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                  }}
                                >
                                  {i + 1}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600, py: 1 }}>
                                {p.nombre}
                              </TableCell>
                              <TableCell align="right" sx={{ py: 1 }}>
                                <Chip
                                  label={parseFloat(p.unidades_vendidas).toFixed(p.unidades_vendidas % 1 !== 0 ? 3 : 0)}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontWeight: 600, height: 22, fontSize: "0.75rem" }}
                                />
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, color: "primary.main", py: 1 }}>
                                {fmt(p.total_recaudado)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Paper>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* ── Tarjeta 5: Alertas de Stock (Mitad Derecha) ────────── */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                borderRadius: 2.5,
                border: "1px solid",
                borderColor: "divider",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                bgcolor: "#FFFFFF",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <CardContent
                sx={{
                  p: 2.5,
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  "&:last-child": { pb: 2.5 },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        bgcolor: data.stock_bajo.length > 0 ? "#FEE2E2" : "#DCFCE7",
                        color: data.stock_bajo.length > 0 ? "#DC2626" : "#16A34A",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {data.stock_bajo.length > 0 ? (
                        <WarningAmberIcon sx={{ fontSize: 20 }} />
                      ) : (
                        <CheckCircleIcon sx={{ fontSize: 20 }} />
                      )}
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Alertas de Stock
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Artículos que requieren reposición
                      </Typography>
                    </Box>
                  </Box>
                  {data.stock_bajo.length > 0 ? (
                    <Chip
                      label={`${data.stock_bajo.length} críticos`}
                      size="small"
                      color="error"
                      sx={{ fontWeight: 700, fontSize: "0.7rem", height: 22 }}
                    />
                  ) : (
                    <Chip
                      label="Stock Óptimo"
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ fontWeight: 600, fontSize: "0.7rem", height: 22 }}
                    />
                  )}
                </Box>

                {data.stock_bajo.length === 0 ? (
                  <Box
                    sx={{
                      py: 4,
                      px: 2,
                      textAlign: "center",
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "#F8FAFC",
                      borderRadius: 2,
                      border: "1px dashed #CBD5E1",
                    }}
                  >
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        bgcolor: "#DCFCE7",
                        color: "#16A34A",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 1.5,
                      }}
                    >
                      <CheckCircleIcon sx={{ fontSize: 26 }} />
                    </Box>
                    <Typography variant="subtitle2" fontWeight="bold" color="text.primary">
                      Inventario al día
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5, maxWidth: 320, lineHeight: 1.4 }}
                    >
                      Todos los artículos activos cuentan con existencias por encima del stock mínimo.
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => navigate("/productos")}
                      sx={{ mt: 2, fontSize: "0.75rem", minHeight: 32 }}
                    >
                      Ver Catálogo Completo
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <Paper variant="outlined" sx={{ overflow: "hidden", borderRadius: 2, flex: 1 }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: "action.hover" }}>
                          <TableRow>
                            <TableCell sx={{ py: 1 }}>Producto</TableCell>
                            <TableCell align="right" sx={{ py: 1 }}>Stock actual</TableCell>
                            <TableCell align="right" sx={{ py: 1 }}>Mínimo</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {data.stock_bajo.map((s) => {
                            const agotado = parseFloat(s.cantidad_actual) <= 0;
                            return (
                              <TableRow key={s.id_producto} hover>
                                <TableCell sx={{ fontWeight: 600, py: 1 }}>
                                  {s.nombre}
                                </TableCell>
                                <TableCell align="right" sx={{ py: 1 }}>
                                  <Chip
                                    label={parseFloat(s.cantidad_actual).toFixed(
                                      s.cantidad_actual % 1 !== 0 ? 3 : 0
                                    )}
                                    size="small"
                                    color={agotado ? "error" : "warning"}
                                    sx={{ fontWeight: 700, height: 22, fontSize: "0.75rem" }}
                                  />
                                </TableCell>
                                <TableCell align="right" sx={{ py: 1, color: "text.secondary", fontSize: "0.8rem" }}>
                                  {s.stock_minimo}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Paper>
                    <Box sx={{ mt: 1.5, display: "flex", justifyContent: "flex-end" }}>
                      <Button
                        size="small"
                        onClick={() => navigate("/productos")}
                        sx={{ fontSize: "0.75rem" }}
                      >
                        Gestionar Stock en Catálogo →
                      </Button>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : null}
    </Box>
  );
}
