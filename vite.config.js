import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Required for Electron relative paths
  optimizeDeps: {
    include: ['three', 'three/webgpu', 'three/tsl', '@react-three/fiber'],
  },
  build: {
    // Desktop app loaded from disk: chunk size isn't a network cost.
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        // Only split three out. Finer vendor splits created a circular chunk
        // import (vendor <-> react-three <-> state) that blanked the packaged app.
        manualChunks(id) {
          if (id.includes('node_modules/three/') || id.includes('node_modules\\three\\')) return 'three-vendor'
          return undefined
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
})
