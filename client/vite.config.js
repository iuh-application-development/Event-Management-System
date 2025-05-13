// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@stripe/react-stripe-js': path.resolve(__dirname, 'node_modules/@stripe/react-stripe-js/dist/react-stripe.umd.js'),
      '@stripe/stripe-js': path.resolve(__dirname, 'node_modules/@stripe/stripe-js/dist/stripe.js')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
})