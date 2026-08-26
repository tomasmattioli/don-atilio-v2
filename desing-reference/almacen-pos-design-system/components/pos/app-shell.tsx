"use client"

import { useState, type ReactNode } from "react"
import AppBar from "@mui/material/AppBar"
import Toolbar from "@mui/material/Toolbar"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Avatar from "@mui/material/Avatar"
import Chip from "@mui/material/Chip"
import { alpha } from "@mui/material/styles"
import PointOfSaleIcon from "@mui/icons-material/PointOfSale"
import Inventory2Icon from "@mui/icons-material/Inventory2"
import GroupIcon from "@mui/icons-material/Group"
import StorefrontIcon from "@mui/icons-material/Storefront"
import type { SvgIconComponent } from "@mui/icons-material"

/**
 * AppShell — layout base con barra superior + navegación lateral.
 * El menú se filtra por rol: el Vendedor solo ve "Ventas".
 */
export type Role = "admin" | "vendedor"

type NavItem = {
  key: string
  label: string
  icon: SvgIconComponent
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  { key: "ventas", label: "Ventas", icon: PointOfSaleIcon, roles: ["admin", "vendedor"] },
  { key: "inventario", label: "Inventario", icon: Inventory2Icon, roles: ["admin"] },
  { key: "administracion", label: "Administración", icon: GroupIcon, roles: ["admin"] },
]

export function AppShell({
  role = "admin",
  userName = "María López",
  children,
  activeKey = "ventas",
}: {
  role?: Role
  userName?: string
  children?: ReactNode
  activeKey?: string
}) {
  const [active, setActive] = useState(activeKey)
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role))

  return (
    <Box sx={{ display: "flex", minHeight: 480, borderRadius: 3, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
      {/* Navegación lateral */}
      <Box
        component="nav"
        sx={{
          width: 232,
          flexShrink: 0,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 2.5, height: 64 }}>
          <StorefrontIcon sx={{ color: "secondary.light" }} />
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "0.95rem", lineHeight: 1 }}>Almacén POS</Typography>
            <Typography sx={{ fontSize: "0.7rem", color: alpha("#fff", 0.6) }}>Sucursal Centro</Typography>
          </Box>
        </Box>

        <Box sx={{ px: 1.5, py: 2, display: "flex", flexDirection: "column", gap: 0.5 }}>
          {visibleItems.map((item) => {
            const Icon = item.icon
            const selected = active === item.key
            return (
              <Box
                key={item.key}
                component="button"
                onClick={() => setActive(item.key)}
                sx={{
                  all: "unset",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 1.75,
                  py: 1.25,
                  borderRadius: 2,
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: selected ? "#fff" : alpha("#fff", 0.72),
                  bgcolor: selected ? alpha("#fff", 0.12) : "transparent",
                  boxShadow: selected ? `inset 3px 0 0 0 var(--mui-palette-secondary-light)` : "none",
                  transition: "background-color .15s, color .15s",
                  "&:hover": { bgcolor: alpha("#fff", 0.08), color: "#fff" },
                }}
              >
                <Icon sx={{ fontSize: 20 }} />
                {item.label}
              </Box>
            )
          })}
        </Box>

        <Box sx={{ mt: "auto", p: 2, display: "flex", alignItems: "center", gap: 1.25, borderTop: "1px solid", borderColor: alpha("#fff", 0.1) }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: "secondary.main", fontSize: "0.85rem", fontWeight: 700 }}>
            {userName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: "0.8rem", fontWeight: 600 }}>{userName}</Typography>
            <Typography sx={{ fontSize: "0.7rem", color: alpha("#fff", 0.6), textTransform: "capitalize" }}>{role}</Typography>
          </Box>
        </Box>
      </Box>

      {/* Contenido */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", bgcolor: "background.default", minWidth: 0 }}>
        <AppBar position="static">
          <Toolbar sx={{ minHeight: "64px !important", justifyContent: "space-between" }}>
            <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", textTransform: "capitalize" }}>{active}</Typography>
            <Chip
              size="small"
              label="Caja abierta"
              sx={{ bgcolor: alpha("#16A34A", 0.9), color: "#fff", fontWeight: 700 }}
            />
          </Toolbar>
        </AppBar>
        <Box sx={{ p: 3, flex: 1 }}>{children}</Box>
      </Box>
    </Box>
  )
}

export default AppShell
