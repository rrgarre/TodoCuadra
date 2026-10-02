import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Aplicación 100% estática: sin backend, sin API, sin base de datos.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
