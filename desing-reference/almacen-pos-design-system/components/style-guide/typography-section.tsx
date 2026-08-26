"use client"

import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Divider from "@mui/material/Divider"

type Row = { label: string; specs: string; node: React.ReactNode }

const ROWS: Row[] = [
  { label: "Título de pantalla", specs: "h1 · 28px · 700", node: <Typography variant="h1">Caja / Ventas</Typography> },
  { label: "Título de sección", specs: "h2 · 22px · 700", node: <Typography variant="h2">Resumen del día</Typography> },
  { label: "Subtítulo", specs: "h3 · 18px · 600", node: <Typography variant="h3">Detalle de productos</Typography> },
  { label: "Cuerpo", specs: "body1 · 15px", node: <Typography variant="body1">Texto general de párrafos e instrucciones.</Typography> },
  { label: "Texto de tabla", specs: "tableCell · 14px · tnum", node: <Typography variant="tableCell">Coca-Cola 1.5L — $1.850,00</Typography> },
  { label: "Botón", specs: "button · 15px · 600", node: <Typography variant="button">Confirmar venta</Typography> },
]

export function TypographySection() {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        bgcolor: "background.paper",
        p: { xs: 2, sm: 3 },
      }}
    >
      {ROWS.map((r, i) => (
        <Box key={r.label}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "180px 1fr" },
              gap: { xs: 0.5, sm: 3 },
              alignItems: "baseline",
              py: 2,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>{r.label}</Typography>
              <Typography variant="caption" sx={{ fontFamily: "monospace" }}>{r.specs}</Typography>
            </Box>
            <Box>{r.node}</Box>
          </Box>
          {i < ROWS.length - 1 && <Divider />}
        </Box>
      ))}

      <Divider sx={{ my: 3 }} />

      {/* Número grande destacado — "Total a cobrar" */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "flex-end" }}>
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Total a cobrar · moneyDisplay
          </Typography>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
            <Typography variant="moneyDisplay" sx={{ color: "primary.main" }}>
              $12.480
            </Typography>
            <Typography variant="h3" sx={{ color: "text.secondary" }}>,00</Typography>
          </Box>
        </Box>
        <Typography variant="caption" sx={{ maxWidth: 240 }}>
          Números tabulares (tnum) para que las columnas y totales queden siempre alineados.
        </Typography>
      </Box>
    </Box>
  )
}

export default TypographySection
