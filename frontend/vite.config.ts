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
          mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          router: ['react-router-dom'],
          // Separate analytics components for lazy loading
          analytics: ['recharts', 'date-fns'],
          query: ['@tanstack/react-query'],
          motion: ['framer-motion'],
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
    port: parseInt(process.env.VITE_PORT || '5173'),
    open: true,
    // Optimize dev server performance
    hmr: {
      overlay: false, // Reduce console noise
    },
  },
  
  // Optimize dependencies pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@mui/material',
      '@mui/icons-material',
      'react-router-dom',
      '@tanstack/react-query',
      'recharts',
      'framer-motion',
    ],
  },
  
  // Preview server settings (for production build testing)
  preview: {
    port: parseInt(process.env.VITE_PREVIEW_PORT || '4173'),
    open: true,
  },
})
