import React from "react";
import { createRoot } from "react-dom/client";
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "./lib/i18n";
import "./index.css";
import { App } from "./App";
import { applyTheme, getInitialTheme } from "./lib/theme";

// Vite doesn't resolve import.meta.url to the worker file inside its module
// graph, so MapLibre v6 needs this pointed at the bundled worker explicitly —
// otherwise it fails silently on first use and no vector layers (route
// lines, points) render, while raster tiles still work.
setWorkerUrl(workerUrl);

applyTheme(getInitialTheme());

const container = document.getElementById("root");
if (!container) throw new Error("Root element #root not found");

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
