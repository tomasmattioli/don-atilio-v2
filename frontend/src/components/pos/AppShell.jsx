import { useNavigate, useLocation } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import { alpha } from "@mui/material/styles";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import GroupIcon from "@mui/icons-material/Group";
import StorefrontIcon from "@mui/icons-material/Storefront";
import LogoutIcon from "@mui/icons-material/Logout";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

/**
 * AppShell — layout base con navegación lateral + barra superior.
 *
 * Uso: envolvé el contenido de cada página autenticada con este componente.
 * Lee usuario/rol desde localStorage["usuario"] (seteado en LoginPage).
 *
 * Menú filtrado por rol:
 *   admin   → Ventas + Inventario + Administración
 *   vendedor → solo Ventas
 */

import DashboardIcon from "@mui/icons-material/Dashboard";
import HistoryIcon from "@mui/icons-material/History";

const NAV_ITEMS = [
  // Vendedor
  { key: "ventas",         label: "Ventas",            icon: PointOfSaleIcon,  path: "/ventas",         roles: ["vendedor"] },
  // Admin
  { key: "dashboard",      label: "Dashboard",          icon: DashboardIcon,    path: "/dashboard",      roles: ["admin"] },
  { key: "productos",      label: "Productos y Stock",  icon: Inventory2Icon,   path: "/productos",      roles: ["admin"] },
  { key: "historiales",    label: "Historiales",        icon: HistoryIcon,      path: "/historiales",    roles: ["admin"] },
  { key: "administracion", label: "Administración",     icon: GroupIcon,        path: "/administracion", roles: ["admin"] },
];

// Mapea pathname → key de menú (soporta subrutas)
function pathToKey(pathname) {
  const match = NAV_ITEMS.find((item) => pathname.startsWith(item.path));
  return match?.key ?? "ventas";
}

export function AppShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const usuario = (() => {
    try {
      return JSON.parse(localStorage.getItem("usuario") || "{}");
    } catch {
      return {};
    }
  })();

  // El backend devuelve role "admin" o "vendedor" en el objeto usuario
  const role = (usuario.id_rol === 1 || usuario.rol === "admin" || usuario.role === "admin") ? "admin" : "vendedor";
  const userName = usuario.nombre ?? usuario.name ?? "Usuario";
  const isVendedor = role === "vendedor";
  const sidebarWidth = isVendedor ? 72 : 232;

  const activeKey = pathToKey(location.pathname);
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const activeLabel = NAV_ITEMS.find((item) => item.key === activeKey)?.label ?? "";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login", { replace: true });
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* ── Navegación lateral ─────────────────────────────────────── */}
      <Box
        component="nav"
        sx={{
          width: sidebarWidth,
          flexShrink: 0,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: (theme) => theme.zIndex.drawer,
          transition: "width 0.2s ease-in-out",
        }}
      >
        {/* Logo / nombre */}
        {isVendedor ? (
          <Tooltip title="Mi Abejita POS" placement="right">
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 64 }}>
              <StorefrontIcon sx={{ color: "secondary.light", fontSize: 28 }} />
            </Box>
          </Tooltip>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 2.5, height: 64 }}>
            <StorefrontIcon sx={{ color: "secondary.light" }} />
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: "0.95rem", lineHeight: 1 }}>
                Mi Abejita
              </Typography>
              <Typography sx={{ fontSize: "0.7rem", color: alpha("#fff", 0.6) }}>
                Punto de Venta
              </Typography>
            </Box>
          </Box>
        )}

        {/* Items de menú */}
        <Box sx={{ px: isVendedor ? 1 : 1.5, py: 2, display: "flex", flexDirection: "column", gap: 0.75 }}>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const selected = activeKey === item.key;
            const buttonElement = (
              <Box
                key={item.key}
                component="button"
                onClick={() => navigate(item.path)}
                sx={{
                  all: "unset",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: isVendedor ? "column" : "row",
                  alignItems: "center",
                  justifyContent: isVendedor ? "center" : "flex-start",
                  gap: isVendedor ? 0.5 : 1.5,
                  px: isVendedor ? 0.75 : 1.75,
                  py: isVendedor ? 1 : 1.25,
                  borderRadius: 2,
                  fontSize: isVendedor ? "0.72rem" : "0.9rem",
                  fontWeight: 600,
                  color: selected ? "#fff" : alpha("#fff", 0.72),
                  bgcolor: selected ? alpha("#fff", 0.12) : "transparent",
                  boxShadow: selected
                    ? (isVendedor ? "inset 0 -3px 0 0 var(--mui-palette-secondary-light)" : "inset 3px 0 0 0 var(--mui-palette-secondary-light)")
                    : "none",
                  transition: "background-color .15s, color .15s",
                  "&:hover": { bgcolor: alpha("#fff", 0.08), color: "#fff" },
                  textAlign: isVendedor ? "center" : "left",
                }}
              >
                <Icon sx={{ fontSize: isVendedor ? 22 : 20 }} />
                <Typography sx={{ fontSize: isVendedor ? "0.72rem" : "inherit", fontWeight: "inherit", lineHeight: 1.1 }}>
                  {item.label}
                </Typography>
              </Box>
            );

            return isVendedor ? (
              <Tooltip key={item.key} title={item.label} placement="right">
                {buttonElement}
              </Tooltip>
            ) : (
              buttonElement
            );
          })}
        </Box>

        {/* Footer: avatar + usuario + logout */}
        {isVendedor ? (
          <Box
            sx={{
              mt: "auto",
              p: 1.5,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.25,
              borderTop: "1px solid",
              borderColor: alpha("#fff", 0.1),
            }}
          >
            <Tooltip title={`${userName} (${role})`} placement="right">
              <Avatar
                sx={{ width: 34, height: 34, bgcolor: "secondary.main", fontSize: "0.85rem", fontWeight: 700 }}
              >
                {userName
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </Avatar>
            </Tooltip>
            <Tooltip title="Cerrar sesión" placement="right">
              <IconButton
                size="small"
                onClick={handleLogout}
                sx={{ color: alpha("#fff", 0.6), "&:hover": { color: "#fff" } }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Box
            sx={{
              mt: "auto",
              p: 2,
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              borderTop: "1px solid",
              borderColor: alpha("#fff", 0.1),
            }}
          >
            <Avatar
              sx={{ width: 34, height: 34, bgcolor: "secondary.main", fontSize: "0.85rem", fontWeight: 700 }}
            >
              {userName
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
                {userName}
              </Typography>
              <Typography sx={{ fontSize: "0.7rem", color: alpha("#fff", 0.6), textTransform: "capitalize" }}>
                {role}
              </Typography>
            </Box>
            <Tooltip title="Cerrar sesión">
              <IconButton
                size="small"
                onClick={handleLogout}
                sx={{ color: alpha("#fff", 0.6), "&:hover": { color: "#fff" } }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* ── Contenido principal ────────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          ml: `${sidebarWidth}px`,
          minWidth: 0,
          bgcolor: "background.default",
          minHeight: "100vh",
          transition: "margin-left 0.2s ease-in-out",
        }}
      >
        <AppBar position="sticky">
          <Toolbar sx={{ minHeight: "64px !important", justifyContent: "space-between" }}>
            <Typography sx={{ fontWeight: 700, fontSize: "1.05rem" }}>
              {activeLabel}
            </Typography>
          </Toolbar>
        </AppBar>

        <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</Box>
      </Box>
    </Box>
  );
}

export default AppShell;
