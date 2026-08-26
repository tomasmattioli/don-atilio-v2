"use client"

import Chip from "@mui/material/Chip"
import Box from "@mui/material/Box"
import { alpha } from "@mui/material/styles"

/**
 * StatusBadge — etiqueta de estado reutilizable.
 * Uso: <StatusBadge status="open" label="Caja abierta" />
 */
export type StatusTone = "open" | "closed" | "active" | "inactive" | "pending" | "neutral"

const TONE_COLOR: Record<StatusTone, string> = {
  open: "#16A34A", // caja abierta / éxito
  active: "#16A34A", // activo
  closed: "#DC2626", // caja cerrada
  inactive: "#64748B", // inactivo / deshabilitado
  pending: "#D97706", // pendiente / advertencia
  neutral: "#2563EB", // informativo
}

export function StatusBadge({
  status,
  label,
  withDot = true,
}: {
  status: StatusTone
  label: string
  withDot?: boolean
}) {
  const color = TONE_COLOR[status]

  return (
    <Chip
      label={label}
      variant="outlined"
      icon={
        withDot ? (
          <Box
            component="span"
            sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, ml: 0.5 }}
          />
        ) : undefined
      }
      sx={{
        color,
        borderColor: alpha(color, 0.35),
        bgcolor: alpha(color, 0.08),
        "& .MuiChip-icon": { color },
      }}
    />
  )
}

export default StatusBadge
