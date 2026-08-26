import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff, StorefrontOutlined } from "@mui/icons-material";
import { login } from "../api/auth";

export default function LoginPage() {
  const [nombre, setNombre] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarPass, setMostrarPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      const data = await login(nombre, contrasena);
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("usuario", JSON.stringify(data.usuario));
      navigate(data.usuario.id_rol === 1 ? "/dashboard" : "/ventas");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f0f2f5",
      }}
    >
      <Card sx={{ width: 380, boxShadow: 4, borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          {/* Cabecera */}
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <StorefrontOutlined sx={{ fontSize: 48, color: "primary.main" }} />
            <Typography variant="h5" fontWeight="bold" mt={1}>
              Mi Abejita
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sistema de Punto de Venta
            </Typography>
          </Box>

          {/* Alerta de error */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Formulario */}
          <Box component="form" onSubmit={handleSubmit} noValidate autoComplete="off">
            {/* Inputs señuelo ocultos para absorber autofill agresivo de Chrome */}
            <input type="text" style={{ display: "none" }} tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <input type="password" style={{ display: "none" }} tabIndex={-1} autoComplete="new-password" aria-hidden="true" />

            <TextField
              name="pos_user_login"
              id="pos_user_login"
              label="Usuario"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              fullWidth
              required
              autoFocus
              disabled={cargando}
              autoComplete="off"
              inputProps={{
                autoComplete: "off",
                autoCorrect: "off",
                autoCapitalize: "off",
                spellCheck: "false",
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              name="pos_user_password"
              id="pos_user_password"
              label="Contraseña"
              type={mostrarPass ? "text" : "password"}
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              fullWidth
              required
              disabled={cargando}
              autoComplete="new-password"
              inputProps={{
                autoComplete: "new-password",
              }}
              sx={{ mb: 3 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setMostrarPass(!mostrarPass)}
                      edge="end"
                      tabIndex={-1}
                    >
                      {mostrarPass ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={cargando || !nombre || !contrasena}
              sx={{ borderRadius: 2 }}
            >
              {cargando ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Ingresar"
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
