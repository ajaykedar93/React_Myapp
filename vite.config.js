import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1500 },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: "https://express-backend-myapp.onrender.com", // dev sathi pan live URL
        changeOrigin: true,
        secure: true,
      }
    }
  }
})