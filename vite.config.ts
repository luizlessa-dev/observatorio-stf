import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts'
            if (id.includes('@supabase') || id.includes('@tanstack')) return 'vendor-query'
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) return 'vendor-react'
            if (id.includes('react-helmet')) return 'vendor-ui'
            return 'vendor'
          }
        },
      },
    },
  },
})
