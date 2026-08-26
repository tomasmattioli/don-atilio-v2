import { createContext, useContext, useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  alpha,
  useTheme,
} from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({
    open: false,
    title: "Confirmar acción",
    message: "",
    detail: "",
    confirmText: "Aceptar",
    cancelText: "Cancelar",
    confirmColor: "primary",
    severity: "warning",
  });

  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      
      const isDelete = options.isDelete || options.severity === "error";
      const isString = typeof options === "string";

      setState({
        open: true,
        title: isString ? "Confirmar acción" : (options.title || (isDelete ? "Confirmar eliminación" : "Confirmar acción")),
        message: isString ? options : (options.message || "¿Estás seguro de realizar esta acción?"),
        detail: isString ? "" : (options.detail || ""),
        confirmText: isString ? "Aceptar" : (options.confirmText || (isDelete ? "Eliminar" : "Aceptar")),
        cancelText: isString ? "Cancelar" : (options.cancelText || "Cancelar"),
        confirmColor: isString ? "primary" : (options.confirmColor || (isDelete ? "error" : "primary")),
        severity: isString ? "warning" : (options.severity || (isDelete ? "error" : "warning")),
      });
    });
  }, []);

  const handleClose = useCallback((result) => {
    setState((prev) => ({ ...prev, open: false }));
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  const getIcon = () => {
    switch (state.severity) {
      case "error":
        return <DeleteOutlineRoundedIcon sx={{ fontSize: 26, color: "error.main" }} />;
      case "info":
        return <InfoOutlinedIcon sx={{ fontSize: 26, color: "info.main" }} />;
      case "question":
        return <HelpOutlineRoundedIcon sx={{ fontSize: 26, color: "primary.main" }} />;
      case "warning":
      default:
        return <WarningAmberRoundedIcon sx={{ fontSize: 26, color: "warning.main" }} />;
    }
  };

  const getBgColor = (th) => {
    switch (state.severity) {
      case "error":
        return alpha(th.palette.error.main, 0.12);
      case "info":
        return alpha(th.palette.info.main, 0.12);
      case "question":
        return alpha(th.palette.primary.main, 0.12);
      case "warning":
      default:
        return alpha(th.palette.warning.main, 0.15);
    }
  };

  const theme = useTheme();

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={state.open}
        onClose={() => handleClose(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 0.5,
            boxShadow: "0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)",
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, pt: 2, px: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: getBgColor(theme),
                flexShrink: 0,
              }}
            >
              {getIcon()}
            </Box>
            <Typography variant="h6" fontWeight={700} sx={{ fontSize: "1.1rem", lineHeight: 1.25 }}>
              {state.title}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: 2.5, py: 1.5 }}>
          <Typography variant="body1" sx={{ color: "text.primary", fontWeight: 500 }}>
            {state.message}
          </Typography>
          {state.detail && (
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 1, lineHeight: 1.4 }}>
              {state.detail}
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 2.5, py: 2, gap: 1, justifyContent: "flex-end" }}>
          <Button
            variant="outlined"
            onClick={() => handleClose(false)}
            sx={{
              color: "text.secondary",
              borderColor: "divider",
              "&:hover": { borderColor: "text.secondary", bgcolor: "action.hover" },
            }}
          >
            {state.cancelText}
          </Button>
          <Button
            variant="contained"
            color={state.confirmColor}
            onClick={() => handleClose(true)}
            autoFocus
          >
            {state.confirmText}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm debe usarse dentro de un ConfirmProvider");
  }
  return context;
}
