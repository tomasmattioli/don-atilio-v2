import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Card, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, TextField, Button, Alert, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";

import { API_URL, getHeaders } from "../api/client";

async function getInventario() {
  const res = await fetch(`${API_URL}/inventario`, {
    headers: getHeaders(false),
  });
  if (!res.ok) throw new Error("Error al obtener inventario");
  return res.json();
}

async function getProductos() {
  const res = await fetch(`${API_URL}/catalogo/productos`, {
    headers: getHeaders(false),
  });
  if (!res.ok) throw new Error("Error al obtener productos");
  return res.json();
}

async function ingresarStock(id_producto, cantidad) {
  const res = await fetch(`${API_URL}/inventario/ingresar`, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify({ id_producto, cantidad }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Error");
  return data;
}

async function ajustarStock(id_producto, cantidad_nueva) {
  const res = await fetch(`${API_URL}/inventario/ajustar`, {
    method: "POST",
    headers: getHeaders(true),
    body: JSON.stringify({ id_producto, cantidad_nueva }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Error");
  return data;
}

export default function InventarioPage() {
  const navigate = useNavigate();
  const [inventario, setInventario] = useState([]);
  const [productosSinStock, setProductosSinStock] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Dialog ingreso
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogProducto, setDialogProducto] = useState(null);
  const [dialogModo, setDialogModo] = useState("ingresar"); // "ingresar" | "ajustar"
  const [dialogCantidad, setDialogCantidad] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    setError("");
    try {
      const [inv, prods] = await Promise.all([getInventario(), getProductos()]);
      setInventario(inv);
      // Productos que existen pero no tienen registro de inventario aún
      const idsConStock = new Set(inv.map((i) => i.id_producto));
      setProductosSinStock(prods.filter((p) => !idsConStock.has(p.id_producto) && p.activo));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirDialog = (producto, modo) => {
    setDialogProducto(producto);
    setDialogModo(modo);
    setDialogCantidad("");
    setDialogError("");
    setDialogOpen(true);
  };

  const confirmarDialog = async () => {
    const cant = parseFloat(dialogCantidad);
    if (isNaN(cant) || cant < 0) { setDialogError("Ingresá un número válido"); return; }
    if (dialogModo === "ingresar" && cant <= 0) { setDialogError("La cantidad a ingresar debe ser mayor a 0"); return; }
    setGuardando(true);
    try {
      if (dialogModo === "ingresar") {
        await ingresarStock(dialogProducto.id_producto || dialogProducto.id_producto, cant);
      } else {
        await ajustarStock(dialogProducto.id_producto, cant);
      }
      setDialogOpen(false);
      await cargar();
    } catch (e) {
      setDialogError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const stockColor = (item) => {
    if (item.cantidad <= 0) return "error";
    if (item.cantidad <= item.stock_minimo) return "warning";
    return "success";
  };


  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h2">Inventario</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<ShoppingBagIcon />}
            onClick={() => navigate("/productos")}
          >
            Administrar Productos
          </Button>
          <Button variant="outlined" size="small" onClick={cargar}>Actualizar</Button>
        </Box>
      </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Card sx={{ mb: 3 }}>
          <Box sx={{ p: 2, borderBottom: "1px solid #eee" }}>
            <Typography variant="subtitle1" fontWeight="bold">Stock actual</Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#fafafa" }}>
                <TableCell>Producto</TableCell>
                <TableCell>Código</TableCell>
                <TableCell align="right">Stock actual</TableCell>
                <TableCell align="right">Mín.</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cargando && (
                <TableRow><TableCell colSpan={6} align="center">Cargando...</TableCell></TableRow>
              )}
              {!cargando && inventario.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center" sx={{ color: "text.secondary", py: 3 }}>
                  No hay registros de inventario. Ingresá stock para los productos de abajo.
                </TableCell></TableRow>
              )}
              {inventario.map((item) => (
                <TableRow key={item.id_inventario} hover>
                  <TableCell><Typography variant="body2" fontWeight="medium">{item.nombre_producto}</Typography></TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{item.codigo_barras || "—"}</Typography></TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">{parseFloat(item.cantidad).toFixed(item.cantidad % 1 !== 0 ? 3 : 0)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption" color="text.secondary">{item.stock_minimo}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={parseFloat(item.cantidad) <= 0 ? "Sin stock" : parseFloat(item.cantidad) <= item.stock_minimo ? "Stock bajo" : "OK"}
                      color={stockColor(item)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Button size="small" startIcon={<AddIcon />} onClick={() => abrirDialog(item, "ingresar")} sx={{ mr: 0.5 }}>
                      Ingresar
                    </Button>
                    <Button size="small" startIcon={<EditIcon />} color="warning" onClick={() => abrirDialog(item, "ajustar")}>
                      Ajustar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {productosSinStock.length > 0 && (
          <Card>
            <Box sx={{ p: 2, borderBottom: "1px solid #eee" }}>
              <Typography variant="subtitle1" fontWeight="bold">Productos sin registro de stock</Typography>
              <Typography variant="caption" color="text.secondary">Ingresá una cantidad inicial para empezar a trackearlo.</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#fafafa" }}>
                  <TableCell>Producto</TableCell>
                  <TableCell>Código</TableCell>
                  <TableCell align="center">Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productosSinStock.map((p) => (
                  <TableRow key={p.id_producto} hover>
                    <TableCell>{p.nombre}</TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{p.codigo_barras || "—"}</Typography></TableCell>
                    <TableCell align="center">
                      <Button size="small" startIcon={<AddIcon />} onClick={() => abrirDialog({ id_producto: p.id_producto, nombre_producto: p.nombre }, "ingresar")}>
                        Ingresar stock inicial
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

      {/* Dialog ingreso/ajuste */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {dialogModo === "ingresar" ? "Ingresar stock" : "Ajustar stock"}
          {dialogProducto && ` — ${dialogProducto.nombre_producto}`}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          <TextField
            name="inv_stock_cantidad_val"
            id="inv_stock_cantidad_val"
            label={dialogModo === "ingresar" ? "Cantidad a sumar" : "Cantidad exacta (nuevo total)"}
            type="number"
            fullWidth
            autoFocus
            autoComplete="off"
            inputProps={{ autoComplete: "off" }}
            value={dialogCantidad}
            onChange={(e) => setDialogCantidad(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmarDialog()}
            helperText={dialogModo === "ingresar" ? "Se sumará al stock actual." : "Reemplazará el stock actual con este valor."}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={guardando}>Cancelar</Button>
          <Button variant="contained" onClick={confirmarDialog} disabled={guardando || !dialogCantidad}>
            {guardando ? "Guardando..." : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
