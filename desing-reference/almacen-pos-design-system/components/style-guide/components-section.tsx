"use client"

import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import Card from "@mui/material/Card"
import CardHeader from "@mui/material/CardHeader"
import CardContent from "@mui/material/CardContent"
import CardActions from "@mui/material/CardActions"
import TextField from "@mui/material/TextField"
import InputAdornment from "@mui/material/InputAdornment"
import MenuItem from "@mui/material/MenuItem"
import Stack from "@mui/material/Stack"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import SearchIcon from "@mui/icons-material/Search"
import StatusBadge from "@/components/pos/status-badge"

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>{title}</Typography>
      {children}
    </Box>
  )
}

export function ComponentsSection() {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: 3,
      }}
    >
      {/* Botones */}
      <Card>
        <CardHeader title="Botones" subheader="Jerarquía de acciones" />
        <CardContent>
          <Stack spacing={2.5}>
            <Panel title="Acción principal — confirmar venta">
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Button variant="contained" color="secondary" size="large" startIcon={<CheckCircleIcon />}>
                  Confirmar venta
                </Button>
                <Button variant="contained" color="secondary">
                  Guardar
                </Button>
              </Stack>
            </Panel>
            <Panel title="Acción neutra / secundaria">
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Button variant="contained" color="primary">Aplicar</Button>
                <Button variant="outlined" color="primary">Cancelar</Button>
                <Button variant="text" color="primary">Volver</Button>
              </Stack>
            </Panel>
            <Panel title="Acción destructiva">
              <Button variant="outlined" color="error">Anular venta</Button>
            </Panel>
          </Stack>
        </CardContent>
      </Card>

      {/* Inputs */}
      <Card>
        <CardHeader title="Campos de texto" subheader="Formularios e ingreso de datos" />
        <CardContent>
          <Stack spacing={2}>
            <TextField label="Nombre del producto" placeholder="Ej. Yerba Mate 1kg" fullWidth />
            <TextField
              label="Precio unitario"
              defaultValue="1850"
              fullWidth
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            />
            <TextField
              label="Buscar producto"
              placeholder="Código o nombre"
              fullWidth
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />
            <TextField select label="Categoría" defaultValue="bebidas" fullWidth>
              <MenuItem value="bebidas">Bebidas</MenuItem>
              <MenuItem value="almacen">Almacén</MenuItem>
              <MenuItem value="limpieza">Limpieza</MenuItem>
            </TextField>
            <TextField label="Descuento" error helperText="El descuento no puede superar el 50%." defaultValue="80%" fullWidth />
          </Stack>
        </CardContent>
      </Card>

      {/* Card de ejemplo */}
      <Card>
        <CardHeader title="Tarjeta / Card" subheader="Contenedor de secciones y resúmenes" />
        <CardContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Las cards agrupan información relacionada con borde sutil y sombra ligera. Se usan para
            paneles de resumen, formularios y bloques de detalle.
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", p: 2, bgcolor: "background.default", borderRadius: 2 }}>
            <Typography variant="subtitle1">Ventas de hoy</Typography>
            <Typography variant="h2" sx={{ color: "secondary.dark" }}>$248.900</Typography>
          </Box>
        </CardContent>
        <CardActions sx={{ px: 2, pb: 2 }}>
          <Button variant="text" color="primary" size="small">Ver detalle</Button>
        </CardActions>
      </Card>

      {/* Badges de estado */}
      <Card>
        <CardHeader title="Etiquetas de estado" subheader="Badges reutilizables" />
        <CardContent>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <StatusBadge status="open" label="Caja abierta" />
            <StatusBadge status="closed" label="Caja cerrada" />
            <StatusBadge status="active" label="Activo" />
            <StatusBadge status="inactive" label="Inactivo" />
            <StatusBadge status="pending" label="Stock bajo" />
            <StatusBadge status="neutral" label="Nuevo" />
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

export default ComponentsSection
