import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Paper, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Alert,
  CircularProgress, IconButton, Tooltip, Tabs, Tab
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import LockResetIcon from "@mui/icons-material/LockReset";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import GroupIcon from "@mui/icons-material/Group";
import CategoryIcon from "@mui/icons-material/Category";
import KeyboardIcon from "@mui/icons-material/Keyboard";

import { API_URL, getHeaders } from "../api/client";
import { useConfirm } from "../context/ConfirmContext";
import {
  getCategorias,
  crearCategoria,
  actualizarCategoria,
  toggleEstadoCategoria,
  eliminarCategoria
} from "../api/catalogo";

const ATAJOS_DISPONIBLES = [
  "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"
];

// ── Dialog: Nuevo usuario ───────────────────────────────────────────────────
function NuevoUsuarioDialog({ open, roles, onClose, onCreado }) {
  const [nombre, setNombre]       = useState("");
  const [password, setPassword]   = useState("");
  const [idRol, setIdRol]         = useState("");
  const [error, setError]         = useState("");
  const [cargando, setCargando]   = useState(false);

  const handleCrear = async () => {
    setError("");
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/usuarios`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ nombre, contraseña: password, id_rol: idRol }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al crear usuario");
      onCreado(data);
      handleClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const handleClose = () => {
    setNombre(""); setPassword(""); setIdRol(""); setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight="bold">Nuevo usuario</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            name="admin_user_nombre"
            id="admin_user_nombre"
            label="Nombre de usuario"
            fullWidth
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
            autoComplete="off"
            inputProps={{
              autoComplete: "off",
              autoCorrect: "off",
              autoCapitalize: "off",
            }}
          />
          <TextField
            name="admin_user_password"
            id="admin_user_password"
            label="Contraseña"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            inputProps={{ autoComplete: "new-password" }}
          />
          <FormControl fullWidth>
            <InputLabel>Rol</InputLabel>
            <Select value={idRol} label="Rol" onChange={(e) => setIdRol(e.target.value)}>
              {roles.map((r) => (
                <MenuItem key={r.id_rol} value={r.id_rol}>{r.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={cargando}>Cancelar</Button>
        <Button variant="contained" onClick={handleCrear}
          disabled={cargando || !nombre || !password || !idRol}>
          {cargando ? <CircularProgress size={20} color="inherit" /> : "Crear Usuario"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Dialog: Cambiar contraseña ──────────────────────────────────────────────
function CambiarPasswordDialog({ open, usuario, onClose, onCambiada }) {
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [cargando, setCargando] = useState(false);

  const handleCambiar = async () => {
    setError("");
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/usuarios/${usuario.id_usuario}/password`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ nueva_password: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al cambiar contraseña");
      onCambiada(data);
      handleClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const handleClose = () => { setPassword(""); setError(""); onClose(); };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight="bold">Cambiar contraseña — {usuario?.nombre}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            name="admin_user_reset_pass"
            id="admin_user_reset_pass"
            label="Nueva contraseña"
            type="password"
            fullWidth
            autoFocus
            autoComplete="new-password"
            inputProps={{ autoComplete: "new-password" }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCambiar()}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={cargando}>Cancelar</Button>
        <Button variant="contained" onClick={handleCambiar}
          disabled={cargando || !password}>
          {cargando ? <CircularProgress size={20} color="inherit" /> : "Cambiar Contraseña"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Dialog: Crear / Editar Categoría ─────────────────────────────────────────
function CategoriaDialog({ open, categoria, categoriasExistentes, onClose, onGuardado }) {
  const [nombre, setNombre] = useState("");
  const [atajo, setAtajo] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open) {
      if (categoria) {
        setNombre(categoria.nombre || "");
        setAtajo(categoria.atajo_teclado || "");
      } else {
        setNombre("");
        setAtajo("");
      }
      setError("");
    }
  }, [open, categoria]);

  const handleGuardar = async () => {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setError("El nombre de la categoría es obligatorio");
      return;
    }

    const atajoLimpio = atajo.trim().toUpperCase() || null;

    // Validación preventiva en frontend de atajo duplicado
    if (atajoLimpio) {
      const duplicada = categoriasExistentes.find(
        (c) =>
          c.atajo_teclado?.toUpperCase() === atajoLimpio &&
          c.id_categoria !== categoria?.id_categoria
      );
      if (duplicada) {
        setError(`El atajo ${atajoLimpio} ya está asignado a la categoría "${duplicada.nombre}". Elegí otro atajo.`);
        return;
      }
    }

    // Validación de nombre duplicado
    const nombreDuplicado = categoriasExistentes.find(
      (c) =>
        c.nombre.trim().toLowerCase() === nombreLimpio.toLowerCase() &&
        c.id_categoria !== categoria?.id_categoria
    );
    if (nombreDuplicado) {
      setError(`Ya existe una categoría llamada "${nombreLimpio}".`);
      return;
    }

    setGuardando(true);
    setError("");

    try {
      if (categoria) {
        // Edición
        const data = await actualizarCategoria(categoria.id_categoria, {
          nombre: nombreLimpio,
          atajo_teclado: atajoLimpio,
        });
        onGuardado(data, "edit");
      } else {
        // Creación
        const data = await crearCategoria({
          nombre: nombreLimpio,
          atajo_teclado: atajoLimpio,
        });
        onGuardado(data, "create");
      }
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !guardando && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight="bold">
        {categoria ? `Editar Categoría — ${categoria.nombre}` : "Nueva Categoría"}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            name="admin_cat_nombre"
            id="admin_cat_nombre"
            label="Nombre de la categoría"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            fullWidth
            required
            autoFocus
            disabled={guardando}
            autoComplete="off"
            inputProps={{ autoComplete: "off" }}
          />

          <FormControl fullWidth>
            <InputLabel id="select-atajo-label">Atajo de teclado (POS)</InputLabel>
            <Select
              labelId="select-atajo-label"
              value={atajo}
              label="Atajo de teclado (POS)"
              onChange={(e) => setAtajo(e.target.value)}
              disabled={guardando}
            >
              <MenuItem value="">
                <em>Ninguno (sin atajo rápido)</em>
              </MenuItem>
              {ATAJOS_DISPONIBLES.map((f) => {
                const ocupadaPor = categoriasExistentes.find(
                  (c) =>
                    c.atajo_teclado?.toUpperCase() === f &&
                    c.id_categoria !== categoria?.id_categoria
                );
                return (
                  <MenuItem
                    key={f}
                    value={f}
                    disabled={Boolean(ocupadaPor)}
                  >
                    {f} {ocupadaPor ? `(Asignado a "${ocupadaPor.nombre}")` : "— Disponible"}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            Los atajos F1 a F12 permiten vender productos libres de esta categoría en el POS escribiendo el precio y presionando la tecla.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleGuardar}
          disabled={guardando || !nombre.trim()}
        >
          {guardando ? <CircularProgress size={20} color="inherit" /> : categoria ? "Guardar Cambios" : "Crear Categoría"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Página principal ────────────────────────────────────────────────────────
export default function AdministracionPage() {
  const confirm = useConfirm();
  const [tabActual, setTabActual] = useState(0);

  // Estado Usuarios
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [dialogNuevoUsuario, setDialogNuevoUsuario] = useState(false);
  const [dialogPassword, setDialogPassword] = useState(null);

  // Estado Categorías
  const [categorias, setCategorias] = useState([]);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);
  const [dialogCategoriaOpen, setDialogCategoriaOpen] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState(null);

  // Feedback global
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const cargarUsuarios = useCallback(async () => {
    setCargandoUsuarios(true);
    try {
      const res = await fetch(`${API_URL}/usuarios`, { headers: getHeaders(false) });
      if (!res.ok) throw new Error("No autorizado o error del servidor");
      const data = await res.json();
      setUsuarios(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargandoUsuarios(false);
    }
  }, []);

  const cargarCategorias = useCallback(async () => {
    setCargandoCategorias(true);
    try {
      const data = await getCategorias();
      setCategorias(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargandoCategorias(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      cargarUsuarios(),
      cargarCategorias(),
      fetch(`${API_URL}/roles`, { headers: getHeaders(false) })
        .then((r) => r.json())
        .then(setRoles),
    ]).catch((e) => setError(e.message));
  }, [cargarUsuarios, cargarCategorias]);

  // Acciones Usuarios
  const toggleActivoUsuario = async (usuario) => {
    const accion = usuario.activo ? "desactivar" : "reactivar";
    try {
      const res = await fetch(`${API_URL}/usuarios/${usuario.id_usuario}/${accion}`, {
        method: "PATCH",
        headers: getHeaders(false),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al cambiar estado");
      setUsuarios((prev) => prev.map((u) => u.id_usuario === data.id_usuario ? data : u));
      setMensajeExito(`Usuario "${usuario.nombre}" ${data.activo ? "reactivado" : "desactivado"}.`);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleUsuarioCreado = (nuevo) => {
    setUsuarios((prev) => [...prev, nuevo]);
    setMensajeExito(`Usuario "${nuevo.nombre}" creado exitosamente.`);
  };

  const handlePasswordCambiada = (actualizado) => {
    setUsuarios((prev) => prev.map((u) => u.id_usuario === actualizado.id_usuario ? actualizado : u));
    setMensajeExito(`Contraseña de "${actualizado.nombre}" actualizada.`);
  };

  // Acciones Categorías
  const abrirCrearCategoria = () => {
    setCategoriaEditando(null);
    setDialogCategoriaOpen(true);
  };

  const abrirEditarCategoria = (cat) => {
    setCategoriaEditando(cat);
    setDialogCategoriaOpen(true);
  };

  const handleCategoriaGuardada = (catGuardada, tipo) => {
    if (tipo === "create") {
      setCategorias((prev) => [...prev, catGuardada].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setMensajeExito(`Categoría "${catGuardada.nombre}" creada.`);
    } else {
      setCategorias((prev) =>
        prev.map((c) => (c.id_categoria === catGuardada.id_categoria ? catGuardada : c)).sort((a, b) => a.nombre.localeCompare(b.nombre))
      );
      setMensajeExito(`Categoría "${catGuardada.nombre}" actualizada.`);
    }
  };

  const toggleEstadoCat = async (cat) => {
    try {
      const act = await toggleEstadoCategoria(cat.id_categoria);
      setCategorias((prev) => prev.map((c) => (c.id_categoria === act.id_categoria ? act : c)));
      setMensajeExito(`Categoría "${cat.nombre}" ${act.activa ? "activada" : "desactivada"}.`);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleEliminarCat = async (cat) => {
    const ok = await confirm({
      title: "Eliminar Categoría",
      message: `¿Estás seguro de eliminar la categoría "${cat.nombre}"?`,
      detail: "Si la categoría tiene productos asociados, se desactivará automáticamente para preservar el historial.",
      confirmText: "Eliminar",
      confirmColor: "error",
      severity: "error",
    });
    if (!ok) return;
    try {
      const res = await eliminarCategoria(cat.id_categoria);
      if (res.desactivada) {
        setCategorias((prev) => prev.map((c) => (c.id_categoria === cat.id_categoria ? { ...c, activa: false } : c)));
        setMensajeExito(`La categoría "${cat.nombre}" fue desactivada porque tiene productos.`);
      } else {
        setCategorias((prev) => prev.filter((c) => c.id_categoria !== cat.id_categoria));
        setMensajeExito(`Categoría "${cat.nombre}" eliminada exitosamente.`);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const nombreRol = (id_rol) => roles.find((r) => r.id_rol === id_rol)?.nombre ?? id_rol;

  const meId = (() => {
    try { return JSON.parse(localStorage.getItem("usuario") || "{}").id_usuario; } catch { return null; }
  })();

  const cargando = cargandoUsuarios || cargandoCategorias;

  if (cargando && usuarios.length === 0 && categorias.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1, py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Alertas */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {mensajeExito && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMensajeExito("")}>
          {mensajeExito}
        </Alert>
      )}

      {/* Selector de pestañas */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={tabActual} onChange={(_, val) => setTabActual(val)}>
          <Tab icon={<GroupIcon />} iconPosition="start" label="Usuarios del Sistema" />
          <Tab icon={<CategoryIcon />} iconPosition="start" label="Gestión de Categorías y Atajos" />
        </Tabs>
      </Box>

      {/* ─── TAB 0: USUARIOS ─── */}
      {tabActual === 0 && (
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold">Usuarios y Permisos</Typography>
              <Typography variant="caption" color="text.secondary">
                Administrá las cuentas de acceso al sistema para Administradores y Vendedores.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => setDialogNuevoUsuario(true)}
            >
              Nuevo usuario
            </Button>
          </Box>

          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell>#</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell align="center">Estado</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usuarios.map((u) => (
                  <TableRow key={u.id_usuario} hover>
                    <TableCell>{u.id_usuario}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {u.nombre} {u.id_usuario === meId && <Chip label="Vos" size="small" sx={{ ml: 0.5 }} />}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={nombreRol(u.id_rol)}
                        size="small"
                        color={u.id_rol === 1 ? "primary" : "default"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={u.activo ? "Activo" : "Inactivo"}
                        color={u.activo ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Cambiar contraseña">
                        <IconButton size="small" onClick={() => setDialogPassword(u)}>
                          <LockResetIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {u.id_usuario !== meId && (
                        <Tooltip title={u.activo ? "Desactivar" : "Reactivar"}>
                          <IconButton
                            size="small"
                            color={u.activo ? "error" : "success"}
                            onClick={() => toggleActivoUsuario(u)}
                          >
                            {u.activo ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* ─── TAB 1: CATEGORÍAS ─── */}
      {tabActual === 1 && (
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold">Categorías y Atajos de Teclado</Typography>
              <Typography variant="caption" color="text.secondary">
                Configurá las categorías y sus atajos de teclado únicos (F1..F12) para venta rápida de productos libres en el POS.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={abrirCrearCategoria}
            >
              Nueva Categoría
            </Button>
          </Box>

          <Paper variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell>#</TableCell>
                  <TableCell>Nombre de Categoría</TableCell>
                  <TableCell align="center">Atajo POS (F1-F12)</TableCell>
                  <TableCell align="center">Estado</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categorias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.secondary" }}>
                      No hay categorías creadas aún. Creá una para empezar.
                    </TableCell>
                  </TableRow>
                ) : (
                  categorias.map((c) => (
                    <TableRow key={c.id_categoria} hover>
                      <TableCell>{c.id_categoria}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{c.nombre}</TableCell>
                      <TableCell align="center">
                        {c.atajo_teclado ? (
                          <Chip
                            icon={<KeyboardIcon sx={{ fontSize: "16px !important" }} />}
                            label={c.atajo_teclado}
                            color="primary"
                            size="small"
                            sx={{ fontWeight: "bold" }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            Sin atajo
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={c.activa ? "Activa" : "Inactiva"}
                          color={c.activa ? "success" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Editar categoría y atajo">
                          <IconButton size="small" onClick={() => abrirEditarCategoria(c)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={c.activa ? "Desactivar" : "Reactivar"}>
                          <IconButton
                            size="small"
                            color={c.activa ? "error" : "success"}
                            onClick={() => toggleEstadoCat(c)}
                          >
                            {c.activa ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleEliminarCat(c)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {/* Diálogos de Usuarios */}
      <NuevoUsuarioDialog
        open={dialogNuevoUsuario}
        roles={roles}
        onClose={() => setDialogNuevoUsuario(false)}
        onCreado={handleUsuarioCreado}
      />

      {dialogPassword && (
        <CambiarPasswordDialog
          open={true}
          usuario={dialogPassword}
          onClose={() => setDialogPassword(null)}
          onCambiada={handlePasswordCambiada}
        />
      )}

      {/* Diálogo de Categorías */}
      <CategoriaDialog
        open={dialogCategoriaOpen}
        categoria={categoriaEditando}
        categoriasExistentes={categorias}
        onClose={() => setDialogCategoriaOpen(false)}
        onGuardado={handleCategoriaGuardada}
      />
    </Box>
  );
}
