import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Build optimizations
  build: {
    // Generate source maps for production debugging
    sourcemap: true,
    
    // Optimize bundle size
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          router: ['react-router-dom'],
        },
      },
    },
    
    // Target modern browsers for smaller bundles
    target: 'esnext',
    
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  
  // Development server settings
  server: {
    port: 5173,
    open: true,
  },
  
  // Preview server settings (for production build testing)
  preview: {
    port: 4173,
    open: true,
  },
})
