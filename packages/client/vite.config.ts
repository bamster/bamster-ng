import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  server: {
    port: 3000,
  },
  build: {
    target: 'ES2020',
    // Production optimizations
    minify: mode === 'production' ? 'terser' : false,
    sourcemap: mode !== 'production',
    rollupOptions: {
      output: {
        // Code splitting for better caching
        manualChunks: {
          phaser: ['phaser'],
          colyseus: ['colyseus.js'],
        },
      },
    },
    // Increase warning threshold for Phaser (it's a large library)
    chunkSizeWarningLimit: 700,
  },
  // Define environment variables
  define: {
    // Make build mode available
    __DEV__: mode !== 'production',
  },
  // Enable gzip preview
  preview: {
    port: 3000,
  },
}));
