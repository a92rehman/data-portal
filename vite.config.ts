import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    // Removed Replit plugins (cartographer, dev-banner, runtime-error-overlay) 
    // that create WebSocket connections interfering with Power BI iframe rendering
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    // Disable HMR to prevent WebSocket errors with iframe embedding
    // HMR causes issues with PowerBI iframe rendering
    hmr: false,
    // Disable HMR client connection attempts completely
    watch: {
      ignored: ['**/node_modules/**', '**/.git/**'],
    },
  },
});
