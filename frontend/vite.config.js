import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  server: {
    host: process.env.FRONTEND_HOST || 'localhost',
    port: parseInt(process.env.FRONTEND_PORT || '3000'),
    strictPort: false,
  },
  preview: {
    host: process.env.FRONTEND_HOST || 'localhost',
    port: parseInt(process.env.FRONTEND_PORT || '3000'),
  },
})
