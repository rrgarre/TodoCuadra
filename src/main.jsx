import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/screens.css";
import "./styles/exercises.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registrar service worker para que la app sea "instalable" (PWA)
// y funcione sin conexión. Solo en entorno de producción/localhost,
// que es donde los navegadores exigen origen seguro para ofrecer la instalación.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js");
  });
}
