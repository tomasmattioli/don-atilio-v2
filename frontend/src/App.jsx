import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import VentasPage from "./pages/VentasPage";
import ProductosPage from "./pages/ProductosPage";
import InventarioPage from "./pages/InventarioPage";
import DashboardPage from "./pages/DashboardPage";
import HistorialPage from "./pages/HistorialPage";
import AdministracionPage from "./pages/AdministracionPage";
import AppShell from "./components/pos/AppShell";

function getRole() {
  try {
    const u = JSON.parse(localStorage.getItem("usuario") || "{}");
    return u.id_rol === 1 ? "admin" : "vendedor";
  } catch {
    return null;
  }
}

// Ruta privada genérica — si no hay token, va al login
function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

// Ruta exclusiva para admin — vendedor va a /ventas, sin token va a /login
function AdminRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  if (getRole() !== "admin") return <Navigate to="/ventas" replace />;
  return children;
}

// Ruta exclusiva para vendedor — admin va a /dashboard, sin token va a /login
function VendedorRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  if (getRole() !== "vendedor") return <Navigate to="/dashboard" replace />;
  return children;
}

function AdminShell({ children }) {
  return <AdminRoute><AppShell>{children}</AppShell></AdminRoute>;
}

function VendedorShell({ children }) {
  return <VendedorRoute><AppShell>{children}</AppShell></VendedorRoute>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas de Vendedor */}
        <Route path="/ventas" element={<VendedorShell><VentasPage /></VendedorShell>} />

        {/* Rutas de Admin */}
        <Route path="/dashboard"      element={<AdminShell><DashboardPage /></AdminShell>} />
        <Route path="/productos"      element={<AdminShell><ProductosPage /></AdminShell>} />
        <Route path="/inventario"     element={<Navigate to="/productos" replace />} />
        <Route path="/historiales"    element={<AdminShell><HistorialPage /></AdminShell>} />
        <Route path="/administracion" element={<AdminShell><AdministracionPage /></AdminShell>} />

        {/* Catch-all: redirige según rol */}
        <Route path="*" element={
          <PrivateRoute>
            {getRole() === "admin"
              ? <Navigate to="/dashboard" replace />
              : <Navigate to="/ventas" replace />}
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
