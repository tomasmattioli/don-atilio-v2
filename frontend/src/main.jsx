import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./lib/theme";
import "./api/client";
import { registerSW } from "virtual:pwa-register";
import { ConfirmProvider } from "./context/ConfirmContext";
import App from "./App";

registerSW({ immediate: true });

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </ThemeProvider>
  </StrictMode>
);
