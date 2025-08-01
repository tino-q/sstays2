import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: 'frontend',
  base: '/sstays2/',
  build: {
    outDir: '../dist/frontend'
  },
  server: {
    port: 5173,
    proxy: {
      '/health': {
        target: 'http://localhost:54321/functions/v1/health',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/health/, '')
      }
    }
  }
})