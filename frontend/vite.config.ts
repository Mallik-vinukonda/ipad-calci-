import path from "path";
import react from "@vitejs/plugin-react";
// @ts-ignore
import eslintPlugin from "vite-plugin-eslint";


import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), eslintPlugin()], // ✅ Use eslintPlugin() instead of eslint()
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
