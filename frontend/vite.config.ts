import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// The browser always talks to /api on its own origin (same-origin cookies, SameSite=Strict).
// In development Vite forwards /api to the Go backend.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_API_TARGET || "http://localhost:8080",
          changeOrigin: false,
        },
      },
    },
  };
});
