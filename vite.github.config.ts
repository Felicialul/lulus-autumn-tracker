import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "github",
  base: "/lulus-autumn-tracker/",
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "../dist-github",
    emptyOutDir: true,
  },
});
