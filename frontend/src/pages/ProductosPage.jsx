import { useState, useEffect, useCallback, useRef } from "react";
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Paper, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Alert,
  CircularProgress, IconButton, Tooltip, FormControlLabel, Switch,
  InputAdornment, Grid, ToggleButtonGroup, ToggleButton
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import ScaleIcon from "@mui/icons-material/Scale";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoIcon from "@mui/icons-material/Info";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  getProductos,
  getCategorias,
  crearProducto,
  actualizarProducto,
  toggleEstadoProducto,
  eliminarProducto,
  ingresarStock,
  ajustarStock
} from "../api/catalogo";
import { useConfirm } from "../context/ConfirmContext";

export default function ProductosPage() {
  const confirm = useConfirm();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  // Filtros
  const [buscar, setBuscar] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos"); // "todos" | "activos" | "inactivos"
  const [stockFiltro, setStockFiltro] = useState("todos");   // "todos" | "critico" | "agotado"

  // Dialog Crear / Editar Producto
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [formNombre, setFormNombre] = useState("");
  const [formCodigo, setFormCodigo] = useState("");
  const [formPrecio, setFormPrecio] = useState("");
  const [formCategoria, setFormCategoria] = useState("");
  const [formPesable, setFormPesable] = useState(false);
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formActivo, setFormActivo] = useState(true);
  const [formStockInicial, setFormStockInicial] = useState("0");
  const [dialogError, setDialogError] = useState("");
  const [dialogExito, setDialogExito] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [estadoCodigo, setEstadoCodigo] = useState(null); // { tipo: 'existente' | 'nuevo', mensaje: '' }

  // Dialog Gestión Rápida de Stock
  const [dialogStockOpen, setDialogStockOpen] = useState(false);
  const [productoStock, setProductoStock] = useState(null);
  const [stockModo, setStockModo] = useState("ingresar"); // "ingresar" | "ajustar"
  const [stockCantidad, setStockCantidad] = useState("");
  const [stockError, setStockError] = useState("");
  const [guardandoStock, setGuardandoStock] = useState(false);

  // Referencias para manejo ágil del foco
  const codigoInputRef = useRef(null);
  const nombreInputRef = useRef(null);
  const precioInputRef = useRef(null);
  const stockCantidadRef = useRef(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [listaProd, listaCat] = await Promise.all([
        getProductos(),
        getCategorias()
      ]);
      setProductos(listaProd);
      setCategorias(listaCat);
      return { prods: listaProd, cats: listaCat };
    } catch (e) {
      setError(e.message || "Error al cargar productos y categorías");
      return null;
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Foco automático en código de barras al abrir el diálogo de producto
  useEffect(() => {
    if (dialogOpen) {
      setTimeout(() => {
        codigoInputRef.current?.focus();
        codigoInputRef.current?.select();
      }, 100);
    }
  }, [dialogOpen]);

  // Foco automático al abrir modal de stock
  useEffect(() => {
    if (dialogStockOpen) {
      setTimeout(() => {
        stockCantidadRef.current?.focus();
        stockCantidadRef.current?.select();
      }, 100);
    }
  }, [dialogStockOpen]);

  const limpiarFormulario = (cats = categorias) => {
    setProductoEditando(null);
    setFormNombre("");
    setFormCodigo("");
    setFormPrecio("");
    setFormCategoria(cats[0]?.id_categoria || "");
    setFormPesable(false);
    setFormDescripcion("");
    setFormActivo(true);
    setFormStockInicial("0");
    setDialogError("");
    setEstadoCodigo(null);
  };

  const abrirDialogCrear = () => {
    limpiarFormulario();
    setDialogExito("");
    setDialogOpen(true);
  };

  const abrirDialogEditar = (prod) => {
    setProductoEditando(prod);
    setFormNombre(prod.nombre);
    setFormCodigo(prod.codigo_barras || "");
    setFormPrecio(prod.precio?.toString() || "");
    setFormCategoria(prod.id_categoria || "");
    setFormPesable(Boolean(prod.es_pesable));
    setFormDescripcion(prod.descripcion || "");
    setFormActivo(Boolean(prod.activo));
    setFormStockInicial("0");
    setDialogError("");
    setDialogExito("");
    setEstadoCodigo({
      tipo: "existente",
      mensaje: `Editando: "${prod.nombre}"`
    });
    setDialogOpen(true);
  };

  // Abrir modal de gestión de stock
  const abrirDialogStock = (prod, modo = "ingresar") => {
    setProductoStock(prod);
    setStockModo(modo);
    setStockCantidad("");
    setStockError("");
    setDialogStockOpen(true);
  };

  const handleGuardarStock = async (e) => {
    e.preventDefault();
    if (!productoStock) return;
    const cant = parseFloat(stockCantidad);
    if (isNaN(cant) || cant < 0) {
      setStockError("Ingresá una cantidad válida mayor o igual a 0");
      return;
    }
    if (stockModo === "ingresar" && cant <= 0) {
      setStockError("La cantidad a ingresar debe ser mayor a 0");
      return;
    }

    setGuardandoStock(true);
    setStockError("");
    try {
      if (stockModo === "ingresar") {
        await ingresarStock(productoStock.id_producto, cant);
        setMensajeExito(`Se ingresaron +${cant} al stock de "${productoStock.nombre}".`);
      } else {
        await ajustarStock(productoStock.id_producto, cant);
        setMensajeExito(`Stock de "${productoStock.nombre}" ajustado a ${cant}.`);
      }
      setDialogStockOpen(false);
      await cargarDatos();
    } catch (err) {
      setStockError(err.message || "Error al actualizar stock");
    } finally {
      setGuardandoStock(false);
    }
  };

  // Detección automática al tipear o escanear código de barras
  const procesarCodigoBarras = (codigoIngresado) => {
    const limpio = codigoIngresado.trim();
    if (!limpio) {
      setEstadoCodigo(null);
      if (productoEditando) {
        setProductoEditando(null);
        setFormNombre("");
        setFormPrecio("");
        setFormDescripcion("");
      }
      return;
    }

    const encontrado = productos.find(
      (p) => p.codigo_barras && p.codigo_barras.trim().toLowerCase() === limpio.toLowerCase()
    );

    if (encontrado) {
      setProductoEditando(encontrado);
      setFormNombre(encontrado.nombre);
      setFormPrecio(encontrado.precio?.toString() || "");
      setFormCategoria(encontrado.id_categoria || "");
      setFormPesable(Boolean(encontrado.es_pesable));
      setFormDescripcion(encontrado.descripcion || "");
      setFormActivo(Boolean(encontrado.activo));
      setEstadoCodigo({
        tipo: "existente",
        mensaje: `¡Producto existente! Cargado en modo edición: "${encontrado.nombre}"`
      });
    } else {
      if (productoEditando) {
        setProductoEditando(null);
        setFormNombre("");
        setFormPrecio("");
        setFormDescripcion("");
      }
      setEstadoCodigo({
        tipo: "nuevo",
        mensaje: `Código nuevo listo para registrar`
      });
    }
  };

  const handleCodigoChange = (e) => {
    const val = e.target.value;
    setFormCodigo(val);
    procesarCodigoBarras(val);
  };

  const handleCodigoKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      procesarCodigoBarras(formCodigo);
      if (productoEditando) {
        precioInputRef.current?.focus();
        precioInputRef.current?.select();
      } else {
        nombreInputRef.current?.focus();
        nombreInputRef.current?.select();
      }
    }
  };

  const handleGuardarProducto = async (e) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      setDialogError("El nombre del producto es obligatorio");
      nombreInputRef.current?.focus();
      return;
    }
    const precioNum = parseFloat(formPrecio);
    if (isNaN(precioNum) || precioNum < 0) {
      setDialogError("Ingresá un precio válido mayor o igual a 0");
      precioInputRef.current?.focus();
      return;
    }

    setGuardando(true);
    setDialogError("");
    setDialogExito("");

    const payload = {
      nombre: formNombre.trim(),
      descripcion: formDescripcion.trim() || null,
      precio: precioNum.toFixed(2),
      es_pesable: formPesable,
      codigo_barras: formCodigo.trim() || null,
      activo: formActivo,
      id_categoria: formCategoria ? parseInt(formCategoria, 10) : null,
    };

    try {
      if (productoEditando) {
        // Modificación — actualizar estado local inmediatamente, re-fetch en background
        await actualizarProducto(productoEditando.id_producto, payload);
        const msg = `Producto "${payload.nombre}" actualizado correctamente.`;
        setDialogExito(msg);
        setMensajeExito(msg);
        // Actualizar el item en la lista local sin esperar el re-fetch
        const catNombre = categorias.find(c => c.id_categoria === payload.id_categoria)?.nombre || null;
        setProductos((prev) =>
          prev.map((p) =>
            p.id_producto === productoEditando.id_producto
              ? { ...p, ...payload, nombre_categoria: catNombre }
              : p
          )
        );
      } else {
        // Alta — crear y luego refrescar para obtener el nuevo id y stock
        const stockNum = parseFloat(formStockInicial) || 0;
        payload.stock_inicial = stockNum.toFixed(3);
        await crearProducto(payload);
        const msg = `Producto "${payload.nombre}" creado exitosamente.`;
        setDialogExito(msg);
        setMensajeExito(msg);
      }

      // Limpiar y re-enfocar inmediatamente para flujo ágil
      limpiarFormulario(categorias);
      setTimeout(() => {
        codigoInputRef.current?.focus();
      }, 50);
      // Re-fetch silencioso en background para sincronizar stock y datos reales del servidor
      cargarDatos();
    } catch (err) {
      setDialogError(err.message || "Error al guardar producto");
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleEstado = async (prod) => {
    try {
      await toggleEstadoProducto(prod.id_producto);
      setProductos((prev) =>
        prev.map((p) =>
          p.id_producto === prod.id_producto ? { ...p, activo: !p.activo } : p
        )
      );
      setMensajeExito(
        `Producto "${prod.nombre}" ${!prod.activo ? "activado" : "desactivado"}.`
      );
    } catch (err) {
      setError(err.message || "Error al cambiar estado");
    }
  };

  const handleEliminarProducto = async (prod) => {
    const ok = await confirm({
      title: "Confirmar Baja",
      message: `¿Estás seguro de que deseas dar de baja o eliminar el producto "${prod.nombre}"?`,
      detail: "Si el producto ya tiene ventas registradas, se desactivará automáticamente para preservar los reportes contables.",
      confirmText: "Dar de baja",
      confirmColor: "error",
      severity: "error",
    });
    if (!ok) return;
    try {
      const res = await eliminarProducto(prod.id_producto);
      setMensajeExito(res.mensaje || "Operación realizada con éxito");
      await cargarDatos();
    } catch (err) {
      setError(err.message || "Error al eliminar producto");
    }
  };

  // Filtrado en memoria
  const productosFiltrados = productos.filter((p) => {
    if (buscar.trim()) {
      const term = buscar.toLowerCase().trim();
      const coincideNombre = p.nombre.toLowerCase().includes(term);
      const coincideCodigo = (p.codigo_barras || "").toLowerCase().includes(term);
      const coincideDesc = (p.descripcion || "").toLowerCase().includes(term);
      if (!coincideNombre && !coincideCodigo && !coincideDesc) return false;
    }
    if (categoriaFiltro && p.id_categoria !== parseInt(categoriaFiltro, 10)) {
      return false;
    }
    if (estadoFiltro === "activos" && !p.activo) return false;
    if (estadoFiltro === "inactivos" && p.activo) return false;

    const cant = parseFloat(p.stock_actual ?? 0);
    const min = p.stock_minimo ?? 5;
    if (stockFiltro === "critico" && cant > min) return false;
    if (stockFiltro === "agotado" && cant > 0) return false;

    return true;
  });

  // Resumen métricas de stock
  const cantAgotados = productos.filter((p) => parseFloat(p.stock_actual ?? 0) <= 0 && p.activo).length;
  const cantBajoMinimo = productos.filter((p) => {
    const s = parseFloat(p.stock_actual ?? 0);
    return s > 0 && s <= (p.stock_minimo ?? 5) && p.activo;
  }).length;

  return (
    <Box sx={{ p: 4 }}>
      {/* ── Cabecera ────────────────────────────────────────────── */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Productos y Stock
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Catálogo unificado de artículos, control de precios, inventario y reposición
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={abrirDialogCrear}
          >
            Cargar / Escanear Producto
          </Button>
        </Box>
      </Box>

      {/* Alertas */}
      {mensajeExito && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMensajeExito("")}>
          {mensajeExito}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Avisos de inventario crítico */}
      {(cantAgotados > 0 || cantBajoMinimo > 0) && (
        <Alert
          severity="warning"
          icon={<WarningAmberIcon />}
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => setStockFiltro(stockFiltro === "critico" ? "todos" : "critico")}
            >
              {stockFiltro === "critico" ? "Ver todos" : "Filtrar críticos"}
            </Button>
          }
        >
          <strong>Atención de stock:</strong> {cantAgotados > 0 && `${cantAgotados} productos agotados`}{" "}
          {cantAgotados > 0 && cantBajoMinimo > 0 && "y "}{" "}
          {cantBajoMinimo > 0 && `${cantBajoMinimo} productos por debajo del stock mínimo`}.
        </Alert>
      )}

      {/* ── Barra de Filtros ──────────────────────────────────────── */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4} md={4}>
            <TextField
              name="catalogo_search_filter"
              id="catalogo_search_filter"
              placeholder="Buscar por nombre, código de barras..."
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              fullWidth
              size="small"
              autoComplete="off"
              inputProps={{ autoComplete: "off" }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Categoría</InputLabel>
              <Select
                value={categoriaFiltro}
                label="Categoría"
                onChange={(e) => setCategoriaFiltro(e.target.value)}
              >
                <MenuItem value="">Todas las categorías</MenuItem>
                {categorias.map((c) => (
                  <MenuItem key={c.id_categoria} value={c.id_categoria}>
                    {c.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2.5} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Stock</InputLabel>
              <Select
                value={stockFiltro}
                label="Stock"
                onChange={(e) => setStockFiltro(e.target.value)}
              >
                <MenuItem value="todos">Todo el inventario</MenuItem>
                <MenuItem value="critico">Bajo mínimo o agotado</MenuItem>
                <MenuItem value="agotado">Solo agotados (0)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2.5} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select
                value={estadoFiltro}
                label="Estado"
                onChange={(e) => setEstadoFiltro(e.target.value)}
              >
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="activos">Solo activos</MenuItem>
                <MenuItem value="inactivos">Solo inactivos</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* ── Tabla de Productos y Stock ───────────────────────────── */}
      {cargando ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid #E2E8F0" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre / Descripción</TableCell>
                <TableCell>Código de Barras</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell align="right">Precio</TableCell>
                <TableCell align="center">Tipo</TableCell>
                <TableCell align="center">Stock Disponible</TableCell>
                <TableCell align="center">Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {productosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    No se encontraron productos registrados con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : (
                productosFiltrados.map((prod) => {
                  const stockNum = parseFloat(prod.stock_actual ?? 0);
                  const minStock = prod.stock_minimo ?? 5;
                  const stockColor = stockNum <= 0 ? "error" : stockNum <= minStock ? "warning" : "success";

                  return (
                    <TableRow
                      key={prod.id_producto}
                      hover
                      sx={{ opacity: prod.activo ? 1 : 0.6 }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {prod.nombre}
                        </Typography>
                        {prod.descripcion && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {prod.descripcion}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {prod.codigo_barras ? (
                          <Chip
                            icon={<QrCodeScannerIcon sx={{ fontSize: 16 }} />}
                            label={prod.codigo_barras}
                            size="small"
                            variant="outlined"
                            sx={{ fontFamily: "monospace" }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={prod.nombre_categoria || "Sin categoría"}
                          size="small"
                          color="default"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                        ${parseFloat(prod.precio || 0).toFixed(2)}
                      </TableCell>
                      <TableCell align="center">
                        {prod.es_pesable ? (
                          <Chip
                            icon={<ScaleIcon sx={{ fontSize: 15 }} />}
                            label="Kg / Peso"
                            size="small"
                            color="info"
                          />
                        ) : (
                          <Chip
                            icon={<ShoppingBagIcon sx={{ fontSize: 15 }} />}
                            label="Unidad"
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
                          <Chip
                            label={`${stockNum.toFixed(prod.es_pesable ? 3 : 0)} ${prod.es_pesable ? "kg" : "u"}`}
                            color={stockColor}
                            size="small"
                            sx={{ fontWeight: 700, minWidth: 70 }}
                          />
                          {minStock > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", mt: 0.2 }}>
                              Mín: {minStock}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={prod.activo ? "Activo" : "Inactivo"}
                          color={prod.activo ? "success" : "default"}
                          size="small"
                          onClick={() => handleToggleEstado(prod)}
                          sx={{ cursor: "pointer" }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Ingresar / Ajustar Stock">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => abrirDialogStock(prod, "ingresar")}
                            sx={{ bgcolor: "#F0FDF4", mr: 0.5 }}
                          >
                            <Inventory2Icon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar datos del producto">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => abrirDialogEditar(prod)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Desactivar o Eliminar">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleEliminarProducto(prod)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* ── Dialog Gestión Rápida de Stock ───────────────────────── */}
      <Dialog
        open={dialogStockOpen}
        onClose={() => !guardandoStock && setDialogStockOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <form onSubmit={handleGuardarStock}>
          <DialogTitle fontWeight="bold">
            Gestión de Stock
          </DialogTitle>
          <DialogContent dividers>
            {stockError && (
              <Alert severity="error" sx={{ mb: 2 }}>{stockError}</Alert>
            )}
            {productoStock && (
              <Box sx={{ mb: 2, p: 1.5, bgcolor: "#F8FAFC", borderRadius: 1.5, border: "1px solid #E2E8F0" }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {productoStock.nombre}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Stock actual:{" "}
                  <strong>
                    {parseFloat(productoStock.stock_actual ?? 0).toFixed(productoStock.es_pesable ? 3 : 0)}{" "}
                    {productoStock.es_pesable ? "kg" : "unidades"}
                  </strong>
                </Typography>
              </Box>
            )}

            <Box sx={{ mb: 2 }}>
              <ToggleButtonGroup
                value={stockModo}
                exclusive
                onChange={(_, val) => val && setStockModo(val)}
                fullWidth
                size="small"
              >
                <ToggleButton value="ingresar" color="success">
                  + Ingresar (Sumar)
                </ToggleButton>
                <ToggleButton value="ajustar" color="warning">
                  = Ajustar (Fijar total)
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <TextField
              name="stock_manage_cantidad"
              id="stock_manage_cantidad"
              inputRef={stockCantidadRef}
              label={stockModo === "ingresar" ? "Cantidad a ingresar (+)" : "Nueva cantidad exacta (=)"}
              type="number"
              value={stockCantidad}
              onChange={(e) => setStockCantidad(e.target.value)}
              required
              fullWidth
              disabled={guardandoStock}
              autoComplete="off"
              helperText={
                stockModo === "ingresar"
                  ? "Suma estas unidades a las que ya existen en el local"
                  : "Corrige y reemplaza el stock total en el sistema"
              }
              inputProps={{
                step: productoStock?.es_pesable ? "0.001" : "1",
                min: "0",
                autoComplete: "off"
              }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDialogStockOpen(false)} disabled={guardandoStock}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              color={stockModo === "ingresar" ? "success" : "warning"}
              disabled={guardandoStock || !stockCantidad}
            >
              {guardandoStock ? (
                <CircularProgress size={22} color="inherit" />
              ) : stockModo === "ingresar" ? (
                "Sumar Stock"
              ) : (
                "Fijar Ajuste"
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── Dialog Alta / Edición de Producto (Escaneo Continuo) ──── */}
      <Dialog
        open={dialogOpen}
        onClose={() => !guardando && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleGuardarProducto} autoComplete="off">
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h6" fontWeight="bold">
                {productoEditando
                  ? "Editar Producto"
                  : "Cargar Producto (Escanear o Tipear)"}
              </Typography>
              <Chip
                label={productoEditando ? "Modo Modificación" : "Modo Alta"}
                color={productoEditando ? "warning" : "primary"}
                size="small"
                variant="outlined"
              />
            </Box>
          </DialogTitle>

          <DialogContent dividers>
            {dialogExito && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {dialogExito} — <em>Podés escanear el siguiente código directamente.</em>
              </Alert>
            )}
            {dialogError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {dialogError}
              </Alert>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              {/* Campo Código de Barras */}
              <Box>
                <TextField
                  name="prod_barcode_input"
                  id="prod_barcode_input"
                  inputRef={codigoInputRef}
                  label="1. Código de Barras (Escanear aquí)"
                  value={formCodigo}
                  onChange={handleCodigoChange}
                  onKeyDown={handleCodigoKeyDown}
                  fullWidth
                  disabled={guardando}
                  autoComplete="off"
                  placeholder="Escaneá con la lectora o escribí el código"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      bgcolor: "#F8FAFC",
                      fontWeight: 600,
                      fontFamily: "monospace",
                      fontSize: "1.05rem",
                    },
                  }}
                  inputProps={{
                    autoComplete: "off",
                    autoCorrect: "off",
                    spellCheck: "false",
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <QrCodeScannerIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />

                {estadoCodigo && (
                  <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1 }}>
                    {estadoCodigo.tipo === "existente" ? (
                      <Chip
                        icon={<InfoIcon />}
                        label={estadoCodigo.mensaje}
                        color="warning"
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    ) : (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label={estadoCodigo.mensaje}
                        color="success"
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    )}
                  </Box>
                )}
              </Box>

              {/* Nombre y Precio */}
              <TextField
                name="prod_nombre_input"
                id="prod_nombre_input"
                inputRef={nombreInputRef}
                label="2. Nombre del Producto"
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                required
                fullWidth
                disabled={guardando}
                autoComplete="off"
                inputProps={{ autoComplete: "off" }}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="prod_precio_input"
                    id="prod_precio_input"
                    inputRef={precioInputRef}
                    label="3. Precio de Venta ($)"
                    type="number"
                    value={formPrecio}
                    onChange={(e) => setFormPrecio(e.target.value)}
                    required
                    fullWidth
                    disabled={guardando}
                    autoComplete="off"
                    inputProps={{ step: "0.01", min: "0", autoComplete: "off" }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Categoría</InputLabel>
                    <Select
                      value={formCategoria}
                      label="Categoría"
                      onChange={(e) => setFormCategoria(e.target.value)}
                      disabled={guardando}
                    >
                      <MenuItem value="">Sin categoría</MenuItem>
                      {categorias.map((c) => (
                        <MenuItem key={c.id_categoria} value={c.id_categoria}>
                          {c.nombre}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formPesable}
                        onChange={(e) => setFormPesable(e.target.checked)}
                        disabled={guardando}
                        color="info"
                      />
                    }
                    label="Venta por peso (Kg)"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  {!productoEditando && (
                    <TextField
                      name="prod_stock_inicial_input"
                      id="prod_stock_inicial_input"
                      label="Stock Inicial"
                      type="number"
                      value={formStockInicial}
                      onChange={(e) => setFormStockInicial(e.target.value)}
                      fullWidth
                      disabled={guardando}
                      autoComplete="off"
                      helperText="Disponible en inventario"
                      inputProps={{ step: formPesable ? "0.001" : "1", min: "0", autoComplete: "off" }}
                    />
                  )}
                </Grid>
              </Grid>

              <TextField
                name="prod_descripcion_input"
                id="prod_descripcion_input"
                label="Descripción (opcional)"
                value={formDescripcion}
                onChange={(e) => setFormDescripcion(e.target.value)}
                fullWidth
                multiline
                rows={2}
                disabled={guardando}
                autoComplete="off"
                inputProps={{ autoComplete: "off" }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formActivo}
                    onChange={(e) => setFormActivo(e.target.checked)}
                    disabled={guardando}
                    color="success"
                  />
                }
                label="Producto activo (disponible para vender)"
              />
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
            <Button
              onClick={() => setDialogOpen(false)}
              disabled={guardando}
              color="inherit"
            >
              Cerrar / Listo
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={guardando}
              size="large"
            >
              {guardando ? (
                <CircularProgress size={22} color="inherit" />
              ) : productoEditando ? (
                "Guardar Cambios y Seguir"
              ) : (
                "Guardar y Escanear Siguiente"
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
