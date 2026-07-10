import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Required for Electron relative paths
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('/three/') || id.includes('\\three\\')) return 'three-vendor'
          if (id.includes('@react-three')) return 'react-three-vendor'
          if (id.includes('postprocessing')) return 'postprocessing-vendor'
          if (id.includes('zustand')) return 'state-vendor'
          return 'vendor'
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
