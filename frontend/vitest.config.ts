/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Mock environment variables
    env: {
      VITE_API_URL: 'http://localhost:3001',
      NODE_ENV: 'test',
    },
    // Include coverage collection
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.ts',
        'src/main.tsx',
      ],
    },
    // Mock API calls in tests
    pool: 'forks',
  },
})