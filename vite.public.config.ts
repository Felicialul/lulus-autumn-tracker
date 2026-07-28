import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "community",
  base: "/career-tracker/",
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "../dist-public",
    emptyOutDir: true,
  },
});
