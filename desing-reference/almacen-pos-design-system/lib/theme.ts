"use client"

import { createTheme } from "@mui/material/styles"

/**
 * ─────────────────────────────────────────────────────────────
 *  ALMACÉN POS — DESIGN SYSTEM
 * ─────────────────────────────────────────────────────────────
 *  Tema base compartido para todas las pantallas del sistema
 *  (Login, Caja/Ventas, Inventario, Administración).
 *
 *  Dirección visual: profesional, denso pero legible, pensado
 *  para PCs de local. Referencias: Square / Toast / Stripe.
 *
 *  Paleta:
 *   - primary  #16324F  Navy acero  → navegación, botones neutros
 *   - accent   #059669  Esmeralda   → acciones clave ("Confirmar venta")
 *   - success/error/warning/info con buen contraste
 *   - fondos gris frío muy claro + paper blanco
 * ─────────────────────────────────────────────────────────────
 */

// Permite usar <Typography variant="moneyDisplay" /> y "tableCell"
declare module "@mui/material/styles" {
  interface TypographyVariants {
    moneyDisplay: React.CSSProperties
    tableCell: React.CSSProperties
  }
  interface TypographyVariantsOptions {
    moneyDisplay?: React.CSSProperties
    tableCell?: React.CSSProperties
  }
}
declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    moneyDisplay: true
    tableCell: true
  }
}

const FONT_STACK = [
  "var(--font-inter)",
  "Inter",
  "-apple-system",
  "BlinkMacSystemFont",
  '"Segoe UI"',
  "Roboto",
  "Arial",
  "sans-serif",
].join(",")

// Números tabulares para totales y tablas (columnas alineadas)
const TABULAR = '"tnum" 1, "lnum" 1' as const

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "light",
    primary: {
      main: "#16324F", // navy acero
      light: "#31567C",
      dark: "#0C2138",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#059669", // esmeralda — acción principal / confirmar
      light: "#10B981",
      dark: "#047857",
      contrastText: "#FFFFFF",
    },
    success: { main: "#16A34A", light: "#DCFCE7", dark: "#15803D" },
    error: { main: "#DC2626", light: "#FEE2E2", dark: "#B91C1C" },
    warning: { main: "#D97706", light: "#FEF3C7", dark: "#B45309" },
    info: { main: "#2563EB", light: "#DBEAFE", dark: "#1D4ED8" },
    background: {
      default: "#F1F5F9", // gris frío muy claro
      paper: "#FFFFFF",
    },
    text: {
      primary: "#0F172A",
      secondary: "#64748B",
    },
    divider: "#E2E8F0",
  },

  shape: { borderRadius: 10 },

  typography: {
    fontFamily: FONT_STACK,
    // Título de pantalla
    h1: { fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 },
    // Título de sección grande
    h2: { fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.25 },
    // Subtítulo
    h3: { fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.3 },
    h4: { fontSize: "1rem", fontWeight: 600, lineHeight: 1.4 },
    subtitle1: { fontSize: "0.9375rem", fontWeight: 600, color: "#334155" },
    subtitle2: { fontSize: "0.8125rem", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" },
    body1: { fontSize: "0.9375rem", lineHeight: 1.55 },
    body2: { fontSize: "0.8125rem", lineHeight: 1.5, color: "#475569" },
    button: { fontSize: "0.9375rem", fontWeight: 600, textTransform: "none", letterSpacing: 0 },
    caption: { fontSize: "0.75rem", color: "#64748B" },
    // Números grandes: "Total a cobrar"
    moneyDisplay: {
      fontFamily: FONT_STACK,
      fontSize: "3rem",
      fontWeight: 800,
      lineHeight: 1,
      letterSpacing: "-0.03em",
      fontFeatureSettings: TABULAR,
    },
    // Texto de celda de tabla (números alineados)
    tableCell: {
      fontFamily: FONT_STACK,
      fontSize: "0.875rem",
      lineHeight: 1.4,
      fontFeatureSettings: TABULAR,
    },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: "#F1F5F9" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, paddingInline: 18, paddingBlock: 8, minHeight: 42 },
        sizeLarge: { minHeight: 52, fontSize: "1rem", paddingInline: 26 },
        sizeSmall: { minHeight: 34, paddingInline: 12 },
        outlined: { borderWidth: 1.5, "&:hover": { borderWidth: 1.5 } },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: "1px solid #E2E8F0",
          borderRadius: 12,
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        title: { fontSize: "1.0625rem", fontWeight: 700 },
        subheader: { fontSize: "0.8125rem", color: "#64748B" },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small", variant: "outlined" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: "#FFFFFF",
          "& fieldset": { borderColor: "#CBD5E1" },
          "&:hover fieldset": { borderColor: "#94A3B8" },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { fontSize: "0.9375rem" } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: "#E2E8F0", fontSize: "0.875rem", paddingBlock: 12 },
        head: {
          fontSize: "0.75rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "#64748B",
          backgroundColor: "#F8FAFC",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { "&:hover": { backgroundColor: "#F8FAFC" } },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: "0.75rem", height: 26, borderRadius: 7 },
        label: { paddingInline: 10 },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "default" },
      styleOverrides: {
        root: {
          backgroundColor: "#16324F",
          color: "#FFFFFF",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { fontSize: "0.75rem", backgroundColor: "#0F172A" },
      },
    },
  },
})

export default theme
