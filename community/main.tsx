import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";

window.__LULU_API_BASE_URL__ = "";
window.__LULU_LOCAL_DATA__ = true;
delete window.__LULU_GITHUB_DATA__;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
);
