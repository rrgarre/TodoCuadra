import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Aplicación 100% estática: sin backend, sin API, sin base de datos.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    // Las banderas (254 SVG) se quedan como ficheros aparte en vez de
    // incrustarse en el JS: el bundle no engorda y solo se piden las
    // imágenes que se ven en cada partida.
    assetsInlineLimit: 0,
  },
});
