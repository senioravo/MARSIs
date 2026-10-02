import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // the MARSIS API (Backend/) — the simulator falls back to browser storage when it is not running
    proxy: { "/api": "http://localhost:8787" },
  },
})
