"use client"

import Card from "@mui/material/Card"
import Table from "@mui/material/Table"
import TableHead from "@mui/material/TableHead"
import TableBody from "@mui/material/TableBody"
import TableRow from "@mui/material/TableRow"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import Typography from "@mui/material/Typography"
import IconButton from "@mui/material/IconButton"
import EditOutlinedIcon from "@mui/icons-material/EditOutlined"
import StatusBadge, { type StatusTone } from "@/components/pos/status-badge"

type Item = {
  code: string
  name: string
  category: string
  price: string
  stock: number
  status: { tone: StatusTone; label: string }
}

const ITEMS: Item[] = [
  { code: "0012", name: "Yerba Mate La Merced 1kg", category: "Almacén", price: "$3.290", stock: 42, status: { tone: "active", label: "Activo" } },
  { code: "0034", name: "Coca-Cola 1.5L", category: "Bebidas", price: "$1.850", stock: 8, status: { tone: "pending", label: "Stock bajo" } },
  { code: "0058", name: "Detergente Magistral 750ml", category: "Limpieza", price: "$2.120", stock: 0, status: { tone: "closed", label: "Sin stock" } },
  { code: "0071", name: "Pan Lactal Bimbo", category: "Almacén", price: "$1.640", stock: 23, status: { tone: "active", label: "Activo" } },
  { code: "0090", name: "Cerveza Quilmes 1L", category: "Bebidas", price: "$1.980", stock: 15, status: { tone: "inactive", label: "Inactivo" } },
]

export function TableSection() {
  return (
    <Card>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Producto</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell align="right">Precio</TableCell>
              <TableCell align="right">Stock</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ITEMS.map((item) => (
              <TableRow key={item.code}>
                <TableCell sx={{ fontFamily: "monospace", color: "text.secondary" }}>{item.code}</TableCell>
                <TableCell>
                  <Typography variant="tableCell" sx={{ fontWeight: 600 }}>{item.name}</Typography>
                </TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell align="right">
                  <Typography variant="tableCell" sx={{ fontWeight: 600 }}>{item.price}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="tableCell" sx={{ color: item.stock === 0 ? "error.main" : "text.primary" }}>
                    {item.stock}
                  </Typography>
                </TableCell>
                <TableCell>
                  <StatusBadge status={item.status.tone} label={item.status.label} />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" aria-label={`Editar ${item.name}`}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  )
}

export default TableSection
