import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 4174,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8790",
        changeOrigin: false,
        ws: true
      }
    }
  },
  build: {
    outDir: "dist",
    sourcemap: true
  }
});
