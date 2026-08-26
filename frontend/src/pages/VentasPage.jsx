import { useState, useEffect, useRef, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Table, TableHead,
  TableRow, TableCell, TableBody, Button, Divider, Select,
  MenuItem, FormControl, InputLabel, Chip, IconButton, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Snackbar, Paper, Popper, ClickAwayListener, Tooltip
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LockIcon from "@mui/icons-material/Lock";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import PaymentsIcon from "@mui/icons-material/Payments";
import ReceiptIcon from "@mui/icons-material/Receipt";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineRounded";
import PrintIcon from "@mui/icons-material/Print";

import { getCategorias, getProductos } from "../api/catalogo";
import { getCajaActiva, abrirCaja, cerrarCaja } from "../api/caja";
import { crearVenta } from "../api/ventas";
import { imprimirTicket, imprimirTicketCierre } from "../api/impresion";

const METODOS = [
  { value: "efectivo",        label: "Efectivo",   color: "success",   shortcut: "Alt+1" },
  { value: "transferencia",   label: "Transf.",    color: "info",      shortcut: "Alt+2" },
  { value: "tarjeta_debito",  label: "Débito",     color: "warning",   shortcut: "Alt+3" },
  { value: "tarjeta_credito", label: "Crédito",    color: "secondary", shortcut: "Alt+4" },
];

function fmt(val) {
  return `$${parseFloat(val ?? 0).toFixed(2)}`;
}

// ─── Pantalla de apertura de caja ────────────────────────────────────────────
function AbrirCajaScreen({ onCajaAbierta }) {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
  const [monto, setMonto]     = useState("");
  const [error, setError]     = useState("");
  const [cargando, setCargando] = useState(false);

  const handleAbrir = async () => {
    const m = parseFloat(monto);
    if (isNaN(m) || m < 0) { setError("Ingresá un monto válido (puede ser 0)"); return; }
    setCargando(true);
    setError("");
    try {
      const caja = await abrirCaja(usuario.id_usuario, m);
      onCajaAbierta(caja);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f0f2f5" }}>
      <Card sx={{ width: 380, boxShadow: 4, borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <LockOpenIcon sx={{ fontSize: 48, color: "primary.main" }} />
            <Typography variant="h5" fontWeight="bold" mt={1}>Abrir Caja</Typography>
            <Typography variant="body2" color="text.secondary">
              Ingresá el efectivo con el que arranca la caja
            </Typography>
          </Box>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            name="caja_apertura_monto"
            id="caja_apertura_monto"
            label="Monto de apertura ($)"
            type="number"
            fullWidth
            autoFocus
            autoComplete="off"
            inputProps={{ autoComplete: "off" }}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAbrir()}
            sx={{ mb: 3 }}
          />
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleAbrir}
            disabled={cargando || monto === ""}
            sx={{ borderRadius: 2 }}
          >
            {cargando ? <CircularProgress size={24} color="inherit" /> : "Abrir Caja"}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

// ─── Diálogo de cierre de caja ───────────────────────────────────────────────
function CerrarCajaDialog({ open, caja, onCerrada, onClose }) {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
  const [efectivo, setEfectivo]       = useState("");
  const [obs, setObs]                 = useState("");
  const [error, setError]             = useState("");
  const [cargando, setCargando]       = useState(false);
  const [resultado, setResultado]     = useState(null);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [avisoImpresion, setAvisoImpresion] = useState(null);

  const enviarImpresion = async (datosCierre) => {
    setImprimiendo(true);
    setAvisoImpresion(null);
    try {
      await imprimirTicketCierre({
        id_session: datosCierre.id_session,
        vendedor: datosCierre.nombre_usuario_cierre || datosCierre.nombre_usuario_apertura || usuario.nombre,
        fecha_apertura: datosCierre.fecha_apertura,
        fecha_cierre: datosCierre.fecha_cierre || new Date().toISOString(),
        monto_apertura: parseFloat(datosCierre.monto_apertura || 0),
        total_ventas: parseFloat(datosCierre.total_ventas || 0),
        cantidad_ventas: parseInt(datosCierre.cantidad_ventas || 0),
        total_efectivo: parseFloat(datosCierre.total_efectivo || 0),
        total_transferencia: parseFloat(datosCierre.total_transferencia || 0),
        total_debito: parseFloat(datosCierre.total_debito || 0),
        total_credito: parseFloat(datosCierre.total_credito || 0),
        efectivo_esperado: parseFloat(datosCierre.efectivo_esperado || 0),
        efectivo_contado: parseFloat(datosCierre.efectivo_contado || 0),
        diferencia: parseFloat(datosCierre.diferencia || 0),
        observaciones: datosCierre.observaciones_cierre || "",
      });
      setAvisoImpresion({ tipo: "success", texto: "Ticket de cierre emitido por impresora térmica ✓" });
    } catch (err) {
      console.warn("No se pudo imprimir ticket de cierre:", err);
      setAvisoImpresion({ tipo: "warning", texto: "Aviso: No se pudo imprimir el ticket (impresora apagada o desconectada)" });
    } finally {
      setImprimiendo(false);
    }
  };

  const handleCerrar = async () => {
    const e = parseFloat(efectivo);
    if (isNaN(e) || e < 0) { setError("Ingresá un monto válido"); return; }
    setCargando(true);
    setError("");
    try {
      const res = await cerrarCaja(caja.id_session, usuario.id_usuario, e, obs);
      setResultado(res);
      await enviarImpresion(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const handleConfirmarCierre = () => {
    setResultado(null);
    setEfectivo("");
    setObs("");
    setAvisoImpresion(null);
    onCerrada();
  };

  return (
    <Dialog open={open} onClose={resultado ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: "bold" }}>
        <LockIcon color="error" /> Cerrar Caja
      </DialogTitle>
      <DialogContent>
        {resultado ? (
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>Caja cerrada ✓</Typography>
            <Typography variant="body2" color="text.secondary">Efectivo esperado: <strong>${parseFloat(resultado.efectivo_esperado).toFixed(2)}</strong></Typography>
            <Typography variant="body2" color="text.secondary">Efectivo contado: <strong>${parseFloat(resultado.efectivo_contado).toFixed(2)}</strong></Typography>
            <Typography
              variant="body1"
              fontWeight="bold"
              mt={1.5}
              color={parseFloat(resultado.diferencia) === 0 ? "success.main" : parseFloat(resultado.diferencia) > 0 ? "info.main" : "error.main"}
            >
              Diferencia: {parseFloat(resultado.diferencia) >= 0 ? "+" : ""}{parseFloat(resultado.diferencia).toFixed(2)}
            </Typography>

            {avisoImpresion && (
              <Alert severity={avisoImpresion.tipo} sx={{ mt: 2, textAlign: "left", fontSize: "0.85rem" }}>
                {avisoImpresion.texto}
              </Alert>
            )}

            <Button
              startIcon={<PrintIcon />}
              variant="outlined"
              color="primary"
              size="small"
              onClick={() => enviarImpresion(resultado)}
              disabled={imprimiendo}
              sx={{ mt: 2 }}
            >
              {imprimiendo ? "Imprimiendo..." : "Reimprimir Ticket de Cierre"}
            </Button>
          </Box>
        ) : (
          <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Typography variant="body2" color="text.secondary">
              Contá el efectivo físico en caja e ingresá el total exacto.
            </Typography>
            <TextField
              name="caja_cierre_efectivo"
              id="caja_cierre_efectivo"
              label="Efectivo contado ($)"
              type="number"
              fullWidth
              autoFocus
              autoComplete="off"
              inputProps={{ autoComplete: "off" }}
              value={efectivo}
              onChange={(e) => setEfectivo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCerrar()}
            />
            <TextField
              name="caja_cierre_obs"
              id="caja_cierre_obs"
              label="Observaciones (opcional)"
              fullWidth
              multiline
              rows={2}
              autoComplete="off"
              inputProps={{ autoComplete: "off" }}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {resultado ? (
          <Button variant="contained" onClick={handleConfirmarCierre} fullWidth>Aceptar y Salir</Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={cargando}>Cancelar</Button>
            <Button variant="contained" color="error" onClick={handleCerrar} disabled={cargando || efectivo === ""}>
              {cargando ? "Cerrando..." : "Cerrar Caja"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─── POS principal ────────────────────────────────────────────────────────────
export default function VentasPage() {
  const [categorias, setCategorias]         = useState([]);
  const [catalogoProductos, setCatalogoProductos] = useState([]);
  const [caja, setCaja]                     = useState(null);
  const [cajaEstado, setCajaEstado]         = useState("cargando"); // "cargando" | "abierta" | "cerrada"
  const [carrito, setCarrito]               = useState([]);
  const [inputValor, setInputValor]         = useState("");
  const [inputCantidad, setInputCantidad]   = useState("1");
  const [confirmando, setConfirmando]       = useState(false);
  const [dialogCierre, setDialogCierre]     = useState(false);

  // Sugerencias inline de autocomplete
  const [sugerencias, setSugerencias]       = useState([]);
  const [sugerenciaIndex, setSugerenciaIndex] = useState(0);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  // Toast / Snackbars
  const [toast, setToast] = useState({ open: false, mensaje: "", severity: "info" });

  const notificar = (mensaje, severity = "info") => {
    setToast({ open: true, mensaje, severity });
  };

  // Pago combinado
  const [modoCombinado, setModoCombinado] = useState(false);
  const [pagos, setPagos]               = useState([]);
  const [metodoPago, setMetodoPago]     = useState("efectivo");
  const [montoPago, setMontoPago]       = useState("");
  const [referenciaPago, setReferenciaPago] = useState("");

  const inputRef = useRef(null);
  const anchorRef = useRef(null);

  const enfocarInput = useCallback(() => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 50);
  }, []);

  const cargarCatalogo = useCallback(async () => {
    try {
      const [cats, prods] = await Promise.all([
        getCategorias(),
        getProductos({ solo_activos: true }),
      ]);
      setCategorias(cats);
      setCatalogoProductos(prods);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    cargarCatalogo();
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
    getCajaActiva(usuario.id_usuario)
      .then((c) => { setCaja(c); setCajaEstado("abierta"); enfocarInput(); })
      .catch(() => setCajaEstado("cerrada"));
  }, [cargarCatalogo, enfocarInput]);

  // Actualizar sugerencias de autocomplete al tipear
  useEffect(() => {
    const termino = inputValor.trim().toLowerCase();
    if (!termino) {
      setSugerencias([]);
      setMostrarSugerencias(false);
      return;
    }

    // Filtrar catálogo por nombre o código de barras
    const matches = catalogoProductos.filter((p) => {
      const nom = p.nombre.toLowerCase();
      const cod = p.codigo_barras ? p.codigo_barras.toLowerCase() : "";
      return nom.includes(termino) || cod.includes(termino);
    }).slice(0, 8);

    setSugerencias(matches);
    setSugerenciaIndex(0);
    setMostrarSugerencias(matches.length > 0);
  }, [inputValor, catalogoProductos]);

  const totalCarrito = Math.round(carrito.reduce((sum, i) => sum + i.precio * i.cantidad, 0) * 100) / 100;
  const totalPagado  = Math.round(pagos.reduce((sum, p) => sum + p.monto, 0) * 100) / 100;
  const falta        = Math.round((totalCarrito - totalPagado) * 100) / 100;
  const cubierto     = totalCarrito > 0 && Math.abs(falta) < 0.001;

  const agregarAlCarrito = (item) => {
    setCarrito((prev) => {
      // Si ya está el mismo producto registrado (con id_producto), sumamos cantidad
      if (item.id_producto) {
        const index = prev.findIndex((p) => p.id_producto === item.id_producto);
        if (index !== -1) {
          const clon = [...prev];
          clon[index] = {
            ...clon[index],
            cantidad: clon[index].cantidad + item.cantidad,
          };
          return clon;
        }
      }
      return [...prev, item];
    });
    setInputValor("");
    setInputCantidad("1");
    setMostrarSugerencias(false);
    enfocarInput();
  };

  const modificarCantidad = (index, delta) => {
    setCarrito((prev) => {
      const clon = [...prev];
      const nuevaCant = clon[index].cantidad + delta;
      if (nuevaCant <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      clon[index] = { ...clon[index], cantidad: Math.round(nuevaCant * 1000) / 1000 };
      return clon;
    });
  };

  const eliminarItem = (index) => {
    setCarrito((prev) => prev.filter((_, i) => i !== index));
    enfocarInput();
  };

  // Atajos de Teclado Globales (Alt+1..4 para cobro directo, Alt+C para combinado, Esc para cancelar)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (dialogCierre) return;

      // Alt+C: Toggle modo combinado
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        if (carrito.length > 0) {
          setModoCombinado((prev) => {
            const next = !prev;
            if (next && falta > 0) {
              setMontoPago(falta.toFixed(2));
            }
            return next;
          });
        }
        return;
      }

      // Alt+1..4 Cobro Rápido
      if (e.altKey && e.key === "1") {
        e.preventDefault();
        if (carrito.length > 0 && !confirmando) confirmarSimple("efectivo");
        return;
      }
      if (e.altKey && e.key === "2") {
        e.preventDefault();
        if (carrito.length > 0 && !confirmando) confirmarSimple("transferencia");
        return;
      }
      if (e.altKey && e.key === "3") {
        e.preventDefault();
        if (carrito.length > 0 && !confirmando) confirmarSimple("tarjeta_debito");
        return;
      }
      if (e.altKey && e.key === "4") {
        e.preventDefault();
        if (carrito.length > 0 && !confirmando) confirmarSimple("tarjeta_credito");
        return;
      }

      // Escape: Volver de combinado o limpiar carrito
      if (e.key === "Escape") {
        if (mostrarSugerencias) {
          setMostrarSugerencias(false);
          return;
        }
        if (modoCombinado) {
          setModoCombinado(false);
          setPagos([]);
        } else if (carrito.length > 0) {
          limpiarTodo();
          notificar("Venta cancelada / Carrito limpio", "info");
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [carrito, confirmando, dialogCierre, modoCombinado, mostrarSugerencias, inputValor]);

  // Manejo de teclas en el campo principal (F1..F12, Flechas Autocomplete, Enter)
  const handleInputKeyDown = async (e) => {
    // F1..F12 para productos libres mapeados a categoría
    if (e.key.startsWith("F") && e.key.length <= 3) {
      e.preventDefault();
      const atajoPresionado = e.key.toUpperCase();
      const cat = categorias.find((c) => c.atajo_teclado?.toUpperCase() === atajoPresionado);

      if (!cat) {
        notificar(`No hay ninguna categoría asignada al atajo ${atajoPresionado}`, "warning");
        return;
      }

      const precio = parseFloat(inputValor);
      if (isNaN(precio) || precio <= 0) {
        notificar(`Ingresá primero el precio numérico y presioná ${atajoPresionado} para "${cat.nombre}"`, "warning");
        return;
      }

      const cantidad = parseFloat(inputCantidad) || 1;
      agregarAlCarrito({ id_producto: null, nombre_producto: cat.nombre, cantidad, precio });
      notificar(`Agregado: ${cat.nombre} ($${precio.toFixed(2)})`, "success");
      setMostrarSugerencias(false);
      return;
    }

    // Navegación en el menú de sugerencias inline (↑ ↓)
    if (mostrarSugerencias && sugerencias.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSugerenciaIndex((prev) => (prev < sugerencias.length - 1 ? prev + 1 : prev));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSugerenciaIndex((prev) => (prev > 0 ? prev - 1 : 0));
        return;
      }
    }

    // Enter: Agregar producto seleccionado o código de barras
    if (e.key === "Enter") {
      e.preventDefault();
      const termino = inputValor.trim();
      if (!termino) return;
      const cantidad = parseFloat(inputCantidad) || 1;

      // 1. Matcheo exacto por código de barras primero
      const prodPorCodigo = catalogoProductos.find(
        (p) => p.codigo_barras && p.codigo_barras.trim().toLowerCase() === termino.toLowerCase()
      );
      if (prodPorCodigo) {
        agregarAlCarrito({
          id_producto: prodPorCodigo.id_producto,
          nombre_producto: prodPorCodigo.nombre,
          cantidad,
          precio: parseFloat(prodPorCodigo.precio),
        });
        notificar(`Agregado: ${prodPorCodigo.nombre}`, "success");
        return;
      }

      // 2. Si el dropdown de sugerencias tiene un item seleccionado por flechas o lista
      if (sugerencias.length > 0 && sugerencias[sugerenciaIndex]) {
        const prod = sugerencias[sugerenciaIndex];
        agregarAlCarrito({
          id_producto: prod.id_producto,
          nombre_producto: prod.nombre,
          cantidad,
          precio: parseFloat(prod.precio),
        });
        notificar(`Agregado: ${prod.nombre}`, "success");
        return;
      }

      // 3. Si no hay matcheos
      notificar("Producto no encontrado. Verificá el código o nombre.", "error");
    }
  };

  const buildPayload = (pagosData) => {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
    return {
      id_session: caja.id_session,
      id_usuario: usuario.id_usuario,
      items: carrito.map((item) => ({
        id_producto: item.id_producto,
        nombre_producto: item.nombre_producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
      })),
      pagos: pagosData,
    };
  };

  const enviarAImpresora = async (ventaGuardada, itemsSnapshot, pagosSnapshot, totalVenta) => {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
    const ticketPayload = {
      id_venta: ventaGuardada?.id_venta,
      numero_ticket: ventaGuardada?.id_venta ? `#${String(ventaGuardada.id_venta).padStart(6, "0")}` : undefined,
      fecha: ventaGuardada?.fecha || new Date().toISOString(),
      vendedor: usuario?.nombre || "Caja",
      cliente: "Consumidor Final",
      items: itemsSnapshot.map((item) => ({
        nombre_producto: item.nombre_producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        subtotal: item.subtotal !== undefined ? item.subtotal : (item.cantidad * item.precio),
      })),
      total: totalVenta,
      pagos: pagosSnapshot.map((p) => ({
        metodo: p.metodo,
        monto: p.monto,
        referencia: p.referencia || "",
      })),
    };

    try {
      await imprimirTicket(ticketPayload);
    } catch (e) {
      console.warn("No se pudo imprimir el ticket:", e);
      notificar("Venta guardada. Aviso: No se pudo imprimir el ticket (impresora apagada o servicio desconectado)", "warning");
    }
  };

  const confirmarSimple = async (metodo) => {
    if (carrito.length === 0) return;
    setConfirmando(true);
    const snapshotCarrito = [...carrito];
    const snapshotTotal = totalCarrito;
    const snapshotPagos = [{ metodo, monto: totalCarrito, referencia: "" }];

    try {
      const ventaGuardada = await crearVenta(buildPayload(snapshotPagos));
      notificar(`¡Venta registrada con éxito (${fmt(totalCarrito)})! ✓`, "success");
      limpiarTodo();
      cargarCatalogo(); // refrescar stock
      enviarAImpresora(ventaGuardada, snapshotCarrito, snapshotPagos, snapshotTotal);
    } catch (err) {
      notificar("Error al registrar venta: " + err.message, "error");
    } finally {
      setConfirmando(false);
    }
  };

  const confirmarCombinado = async () => {
    if (!cubierto) return;
    setConfirmando(true);
    const snapshotCarrito = [...carrito];
    const snapshotTotal = totalCarrito;
    const snapshotPagos = pagos.map((p) => ({
      metodo: p.metodo,
      monto: p.monto,
      referencia: p.referencia || "",
    }));

    try {
      const ventaGuardada = await crearVenta(buildPayload(snapshotPagos));
      notificar(`¡Venta combinada registrada con éxito (${fmt(totalCarrito)})! ✓`, "success");
      limpiarTodo();
      cargarCatalogo();
      enviarAImpresora(ventaGuardada, snapshotCarrito, snapshotPagos, snapshotTotal);
    } catch (err) {
      notificar("Error al registrar venta: " + err.message, "error");
    } finally {
      setConfirmando(false);
    }
  };

  const agregarPago = () => {
    const monto = parseFloat(montoPago);
    if (isNaN(monto) || monto <= 0) {
      notificar("Ingresá un monto de pago válido", "warning");
      return;
    }
    const montoRedondeado = Math.round(monto * 100) / 100;
    if (montoRedondeado > falta + 0.001) {
      notificar(`El monto ($${montoRedondeado.toFixed(2)}) supera el saldo restante ($${falta.toFixed(2)})`, "warning");
      return;
    }
    setPagos((prev) => [...prev, { metodo: metodoPago, monto: montoRedondeado, referencia: referenciaPago }]);
    setMontoPago("");
    setReferenciaPago("");
  };

  const limpiarTodo = () => {
    setCarrito([]);
    setPagos([]);
    setModoCombinado(false);
    setInputValor("");
    setInputCantidad("1");
    setMontoPago("");
    setReferenciaPago("");
    setMostrarSugerencias(false);
    enfocarInput();
  };

  // ── Pantallas condicionales ──
  if (cajaEstado === "cargando") {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (cajaEstado === "cerrada") {
    return (
      <AbrirCajaScreen
        onCajaAbierta={(c) => {
          setCaja(c);
          setCajaEstado("abierta");
          enfocarInput();
        }}
      />
    );
  }

  // ── POS ──
  return (
    <>
      <Box sx={{ p: 2, display: "flex", gap: 2, height: "calc(100vh - 64px)", bgcolor: "background.default", boxSizing: "border-box" }}>

        {/* Panel izquierdo — Carga y Carrito (65% del ancho) */}
        <Card sx={{ flex: 1.7, p: 2, display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 2, boxShadow: 2 }}>
          
          {/* Header de Caja */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <PointOfSaleIcon color="primary" sx={{ fontSize: 26 }} />
              <Typography variant="h6" fontWeight="bold" lineHeight={1}>Punto de Venta</Typography>
            </Box>

            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={<LockIcon />}
              onClick={() => setDialogCierre(true)}
            >
              Cerrar Caja
            </Button>
          </Box>

          {/* Inputs de ingreso con Autocomplete Inline */}
          <Box sx={{ display: "flex", gap: 1.5, mb: 1.5, width: "100%" }}>
            <Box ref={anchorRef} sx={{ flex: 1, position: "relative" }}>
              <TextField
                name="pos_search_query"
                id="pos_search_query"
                label="Código de barras, nombre o precio libre"
                placeholder="Escribí para ver sugerencias o escaneá código de barras..."
                fullWidth
                size="small"
                autoComplete="off"
                inputProps={{
                  autoComplete: "off",
                  autoCorrect: "off",
                  autoCapitalize: "off",
                  spellCheck: "false",
                }}
                value={inputValor}
                onChange={(e) => setInputValor(e.target.value)}
                onKeyDown={handleInputKeyDown}
                inputRef={inputRef}
                autoFocus
              />

              {/* Popper con Lista de Sugerencias Autocomplete */}
              <Popper
                open={mostrarSugerencias && sugerencias.length > 0}
                anchorEl={anchorRef.current}
                placement="bottom-start"
                style={{ width: anchorRef.current ? anchorRef.current.clientWidth : "100%", zIndex: 1300 }}
              >
                <ClickAwayListener onClickAway={() => setMostrarSugerencias(false)}>
                  <Paper
                    elevation={8}
                    sx={{
                      mt: 0.5,
                      maxHeight: 320,
                      overflowY: "auto",
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Box sx={{ px: 1.5, py: 0.75, bgcolor: "action.hover", borderBottom: "1px solid", borderColor: "divider", display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="bold">
                        Sugerencias (↑ ↓ navegar · Enter agregar)
                      </Typography>
                      <Typography variant="caption" color="text.disabled">ESC para cerrar</Typography>
                    </Box>
                    <Table size="small">
                      <TableBody>
                        {sugerencias.map((p, idx) => {
                          const isSelected = idx === sugerenciaIndex;
                          return (
                            <TableRow
                              key={p.id_producto}
                              hover
                              selected={isSelected}
                              onMouseEnter={() => setSugerenciaIndex(idx)}
                              onClick={() => {
                                const cant = parseFloat(inputCantidad) || 1;
                                agregarAlCarrito({
                                  id_producto: p.id_producto,
                                  nombre_producto: p.nombre,
                                  cantidad: cant,
                                  precio: parseFloat(p.precio),
                                });
                                notificar(`Agregado: ${p.nombre}`, "success");
                              }}
                              sx={{
                                cursor: "pointer",
                                bgcolor: isSelected ? "action.selected" : "inherit",
                              }}
                            >
                              <TableCell sx={{ py: 1 }}>
                                <Typography variant="body2" fontWeight={600}>{p.nombre}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {p.nombre_categoria || "Sin categoría"} {p.codigo_barras ? `· ${p.codigo_barras}` : ""}
                                </Typography>
                              </TableCell>
                              <TableCell align="right" sx={{ py: 1 }}>
                                <Typography
                                  variant="caption"
                                  fontWeight="bold"
                                  display="block"
                                  color={parseFloat(p.stock_actual) <= 0 ? "error.main" : "text.secondary"}
                                >
                                  Stock: {parseFloat(p.stock_actual || 0).toFixed(p.es_pesable ? 3 : 0)}
                                </Typography>
                                <Typography variant="body2" fontWeight="bold" color="primary.main">
                                  {fmt(p.precio)}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Paper>
                </ClickAwayListener>
              </Popper>
            </Box>

            <Box sx={{ width: 120, flexShrink: 0 }}>
              <TextField
                name="pos_item_quantity"
                id="pos_item_quantity"
                label="Cantidad"
                type="number"
                fullWidth
                size="small"
                autoComplete="off"
                value={inputCantidad}
                onChange={(e) => setInputCantidad(e.target.value)}
                onKeyDown={handleInputKeyDown}
                inputProps={{ min: 0.001, step: "any", autoComplete: "off" }}
              />
            </Box>
          </Box>

          {/* Tabla de ítems en el carrito */}
          <Box sx={{ flex: 1, overflowY: "auto", border: "1px solid #e0e0e0", borderRadius: 1.5 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell>Producto</TableCell>
                  <TableCell align="center" sx={{ width: 130 }}>Cant.</TableCell>
                  <TableCell align="right">P. Unit.</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                  <TableCell padding="checkbox" />
                </TableRow>
              </TableHead>
              <TableBody>
                {carrito.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ color: "text.secondary", py: 5 }}>
                      <ReceiptIcon sx={{ fontSize: 44, color: "text.disabled", mb: 1, display: "block", mx: "auto" }} />
                      <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 0.75 }}>
                        <Typography variant="body2" fontWeight="500" color="text.secondary">
                          El carrito está vacío — escaneá o buscá un producto para empezar
                        </Typography>
                        <Tooltip
                          title="Escribí el nombre para sugerencias, escaneá el código de barras, o ingresá un precio y presioná su atajo (F1..F12)."
                          arrow
                          placement="top"
                        >
                          <IconButton size="small" sx={{ p: 0.25, color: "text.disabled", "&:hover": { color: "primary.main" } }}>
                            <HelpOutlineIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
                {carrito.map((item, index) => (
                  <TableRow key={index} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{item.nombre_producto}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                        <IconButton size="small" onClick={() => modificarCantidad(index, -1)}>
                          <RemoveIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 24, textAlign: "center" }}>
                          {item.cantidad}
                        </Typography>
                        <IconButton size="small" onClick={() => modificarCantidad(index, 1)}>
                          <AddIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell align="right">{fmt(item.precio)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>
                      {fmt(item.precio * item.cantidad)}
                    </TableCell>
                    <TableCell padding="checkbox">
                      <IconButton size="small" color="error" onClick={() => eliminarItem(index)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Card>

        {/* Panel derecho — Total y Cobro (38% del ancho) */}
        <Card sx={{ flex: 1, p: 2.5, display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", borderRadius: 2, boxShadow: 2 }}>
          
          <Box textAlign="center" sx={{ bgcolor: "action.hover", py: 2.5, px: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="overline" color="text.secondary" fontWeight="bold" letterSpacing={1.2}>
              TOTAL A COBRAR
            </Typography>
            <Typography variant="h3" fontWeight="bold" color="primary.main" sx={{ my: 0.5 }}>
              {fmt(totalCarrito)}
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {carrito.length} {carrito.length === 1 ? "ítem agregado" : "ítems agregados"}
            </Typography>
          </Box>

          <Divider />

          {/* Modo Cobro Directo */}
          {!modoCombinado && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Typography variant="subtitle2" color="text.secondary" textAlign="center" fontWeight={700}>
                Cobro directo (100%):
              </Typography>
              
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {METODOS.map((m) => (
                  <Button
                    key={m.value}
                    variant="contained"
                    color={m.color}
                    size="large"
                    fullWidth
                    disabled={carrito.length === 0 || confirmando}
                    onClick={() => confirmarSimple(m.value)}
                    sx={{
                      py: 1.3,
                      fontWeight: "bold",
                      display: "flex",
                      justifyContent: "space-between",
                      px: 2,
                      borderRadius: 2,
                    }}
                  >
                    <span>{m.label}</span>
                    <Chip
                      label={m.shortcut}
                      size="small"
                      sx={{ bgcolor: "rgba(255,255,255,0.28)", color: "#fff", fontWeight: 800, height: 22 }}
                    />
                  </Button>
                ))}
              </Box>

              <Button
                variant="outlined"
                size="medium"
                fullWidth
                startIcon={<PaymentsIcon />}
                sx={{ mt: 1, py: 1, borderRadius: 2, fontWeight: 600 }}
                disabled={carrito.length === 0}
                onClick={() => {
                  setModoCombinado(true);
                  if (falta > 0) setMontoPago(falta.toFixed(2));
                }}
              >
                Pago combinado (Alt+C)
              </Button>
            </Box>
          )}

          {/* Modo Cobro Combinado */}
          {modoCombinado && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" fontWeight="bold">Pago combinado</Typography>
                <Button size="small" onClick={() => { setModoCombinado(false); setPagos([]); }}>
                  ← Volver a directo
                </Button>
              </Box>

              <FormControl fullWidth size="small">
                <InputLabel>Método de pago</InputLabel>
                <Select value={metodoPago} label="Método de pago" onChange={(e) => setMetodoPago(e.target.value)}>
                  {METODOS.map((m) => (
                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                name="pos_combinado_monto"
                id="pos_combinado_monto"
                label="Monto"
                type="number"
                size="small"
                fullWidth
                autoComplete="off"
                inputProps={{ autoComplete: "off" }}
                value={montoPago}
                onChange={(e) => setMontoPago(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && agregarPago()}
                placeholder={falta > 0 ? `Sugerido: ${falta.toFixed(2)}` : ""}
              />

              {falta > 0 && !cubierto && (
                <Button
                  size="small"
                  variant="text"
                  sx={{ alignSelf: "flex-start", py: 0, textTransform: "none", fontSize: "0.75rem", mt: -0.5 }}
                  onClick={() => setMontoPago(falta.toFixed(2))}
                >
                  Autocompletar saldo restante (${falta.toFixed(2)})
                </Button>
              )}

              {metodoPago !== "efectivo" && (
                <TextField
                  name="pos_combinado_referencia"
                  id="pos_combinado_referencia"
                  label="N° comprobante / Ref (opcional)"
                  size="small"
                  fullWidth
                  autoComplete="off"
                  inputProps={{ autoComplete: "off" }}
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                />
              )}

              <Button variant="outlined" size="small" onClick={agregarPago} disabled={!montoPago}>
                + Agregar pago
              </Button>

              {/* Lista de pagos ingresados */}
              {pagos.length > 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, bgcolor: "action.hover", p: 1, borderRadius: 1 }}>
                  {pagos.map((p, i) => (
                    <Box key={i} display="flex" alignItems="center" justifyContent="space-between">
                      <Chip label={METODOS.find((m) => m.value === p.metodo)?.label} size="small" variant="outlined" />
                      <Typography variant="body2" fontWeight="bold">{fmt(p.monto)}</Typography>
                      <IconButton size="small" color="error" onClick={() => setPagos((prev) => prev.filter((_, j) => j !== i))}>
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}

              <Divider />

              <Box textAlign="center">
                {cubierto ? (
                  <Typography color="success.main" fontWeight="bold">✓ Total exacto cubierto</Typography>
                ) : falta > 0 ? (
                  <Typography color="error.main" fontWeight="bold">Falta pagar: {fmt(falta)}</Typography>
                ) : (
                  <Typography color="error.main" fontWeight="bold">Monto excedido por: {fmt(Math.abs(falta))}</Typography>
                )}
                <Typography variant="caption" color="text.secondary" display="block">
                  Pagado: {fmt(totalPagado)} / Total: {fmt(totalCarrito)}
                </Typography>
              </Box>

              <Button
                variant="contained"
                color="success"
                size="large"
                fullWidth
                onClick={confirmarCombinado}
                disabled={!cubierto || confirmando}
                sx={{ py: 1.5, fontWeight: "bold", borderRadius: 2 }}
              >
                {confirmando ? <CircularProgress size={24} color="inherit" /> : "Confirmar Venta"}
              </Button>
            </Box>
          )}

          <Button
            variant="text"
            color="error"
            size="small"
            onClick={limpiarTodo}
            disabled={carrito.length === 0 && pagos.length === 0}
            sx={{ mt: "auto" }}
          >
            Limpiar / Cancelar (Esc)
          </Button>
        </Card>
      </Box>

      {/* Diálogo de Cierre de Caja */}
      <CerrarCajaDialog
        open={dialogCierre}
        caja={caja}
        onClose={() => setDialogCierre(false)}
        onCerrada={() => {
          setDialogCierre(false);
          setCaja(null);
          setCajaEstado("cerrada");
          limpiarTodo();
          notificar("Caja cerrada correctamente", "info");
        }}
      />

      {/* Notificaciones Snackbar / Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          sx={{ width: "100%", boxShadow: 3 }}
        >
          {toast.mensaje}
        </Alert>
      </Snackbar>
    </>
  );
}
