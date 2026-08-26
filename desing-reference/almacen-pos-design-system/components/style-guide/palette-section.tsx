"use client"

import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"

type Swatch = { name: string; hex: string; note: string; dark?: boolean }

const SWATCHES: Swatch[] = [
  { name: "Primary", hex: "#16324F", note: "Navegación, encabezados", dark: true },
  { name: "Accent", hex: "#059669", note: "Confirmar venta / guardar", dark: true },
  { name: "Success", hex: "#16A34A", note: "Caja abierta, activo", dark: true },
  { name: "Error", hex: "#DC2626", note: "Anular, eliminar", dark: true },
  { name: "Warning", hex: "#D97706", note: "Stock bajo, pendiente", dark: true },
  { name: "Info", hex: "#2563EB", note: "Mensajes informativos", dark: true },
  { name: "Fondo", hex: "#F1F5F9", note: "Fondo de pantalla", dark: false },
  { name: "Superficie", hex: "#FFFFFF", note: "Cards, tablas, paneles", dark: false },
]

export function PaletteSection() {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
        gap: 2,
      }}
    >
      {SWATCHES.map((s) => (
        <Box
          key={s.name}
          sx={{
            borderRadius: 2.5,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Box
            sx={{
              height: 76,
              bgcolor: s.hex,
              display: "flex",
              alignItems: "flex-end",
              p: 1,
              border: s.dark ? "none" : "1px solid #E2E8F0",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.7rem",
                fontWeight: 700,
                fontFamily: "monospace",
                color: s.dark ? "rgba(255,255,255,0.85)" : "#334155",
              }}
            >
              {s.hex}
            </Typography>
          </Box>
          <Box sx={{ p: 1.25 }}>
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>{s.name}</Typography>
            <Typography variant="caption">{s.note}</Typography>
          </Box>
        </Box>
      ))}
    </Box>
  )
}

export default PaletteSection
