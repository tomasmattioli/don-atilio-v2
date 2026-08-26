"use client"

import { useState } from "react"
import Box from "@mui/material/Box"
import Container from "@mui/material/Container"
import Typography from "@mui/material/Typography"
import ToggleButton from "@mui/material/ToggleButton"
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup"
import Button from "@mui/material/Button"
import GuideSection from "@/components/style-guide/section"
import PaletteSection from "@/components/style-guide/palette-section"
import TypographySection from "@/components/style-guide/typography-section"
import ComponentsSection from "@/components/style-guide/components-section"
import TableSection from "@/components/style-guide/table-section"
import AppShell, { type Role } from "@/components/pos/app-shell"

export default function StyleGuidePage() {
  const [role, setRole] = useState<Role>("admin")

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100dvh" }}>
      {/* Encabezado */}
      <Box sx={{ bgcolor: "primary.main", color: "primary.contrastText", py: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          <Typography variant="subtitle2" sx={{ color: "secondary.light", mb: 1 }}>
            Design System · Almacén POS
          </Typography>
          <Typography variant="h1" sx={{ color: "#fff", mb: 1.5, fontSize: { xs: "1.75rem", md: "2.25rem" } }}>
            Guía de estilo compartida
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.72)", maxWidth: 620 }}>
            Base visual reutilizable para todas las pantallas del sistema (Login, Caja/Ventas,
            Inventario, Administración). Todo se deriva del tema de Material UI en{" "}
            <Box component="code" sx={{ fontFamily: "monospace", bgcolor: "rgba(255,255,255,0.12)", px: 0.75, py: 0.25, borderRadius: 1 }}>
              lib/theme.ts
            </Box>
            .
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <GuideSection
          title="01 · Paleta de colores"
          description="Primario navy para estructura, esmeralda como acento para acciones clave, y una escala semántica de estado con buen contraste."
        >
          <PaletteSection />
        </GuideSection>

        <GuideSection
          title="02 · Tipografía"
          description="Inter en toda la interfaz. Escala clara para títulos, tablas y el número grande del total a cobrar, con cifras tabulares."
        >
          <TypographySection />
        </GuideSection>

        <GuideSection
          title="03 · Componentes base"
          description="Botones, campos, cards y etiquetas de estado listos para reutilizar tal cual en las próximas pantallas."
        >
          <ComponentsSection />
        </GuideSection>

        <GuideSection
          title="04 · Tabla de datos"
          description="Patrón para listar productos, ventas y usuarios: encabezado tenue, filas con hover, números alineados y acciones a la derecha."
        >
          <TableSection />
        </GuideSection>

        <GuideSection
          title="05 · Layout y navegación"
          description="Barra superior + navegación lateral. El menú se filtra por rol: el Vendedor solo ve Ventas; el Admin ve todo."
        >
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Typography variant="subtitle1">Ver como:</Typography>
            <ToggleButtonGroup
              value={role}
              exclusive
              size="small"
              onChange={(_, v) => v && setRole(v)}
              color="primary"
            >
              <ToggleButton value="admin">Admin</ToggleButton>
              <ToggleButton value="vendedor">Vendedor</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <AppShell role={role} userName={role === "admin" ? "María López" : "Juan Pérez"}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 420 }}>
              <Typography variant="h3">Contenido de la pantalla</Typography>
              <Typography variant="body2">
                Cada pantalla del sistema se monta dentro de este shell. El área de contenido
                hereda el fondo gris claro y respeta el espaciado estándar.
              </Typography>
              <Box>
                <Button variant="contained" color="secondary">Acción de la pantalla</Button>
              </Box>
            </Box>
          </AppShell>
        </GuideSection>
      </Container>
    </Box>
  )
}
