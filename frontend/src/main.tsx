import React from "react";
import { createRoot } from "react-dom/client";
import "./lib/i18n";
import "./index.css";
import { App } from "./App";
import { applyTheme, getInitialTheme } from "./lib/theme";

applyTheme(getInitialTheme());

const container = document.getElementById("root");
if (!container) throw new Error("Root element #root not found");

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
