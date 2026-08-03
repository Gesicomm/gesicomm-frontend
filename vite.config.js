import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Necesario solo para src/services/landingPublicaService.js, que
      // pega contra rutas relativas (/api/l/...) en vez de VITE_API_URL —
      // así el backend ve el hostname real y resolverTienda puede
      // resolver la tienda correcta por subdominio/dominio propio. El
      // resto del frontend sigue usando VITE_API_URL directamente, sin
      // pasar por acá.
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: false,
      },
    },
  },
})
