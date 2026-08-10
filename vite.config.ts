import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'public',
  build: {
    emptyOutDir: true,
    // Chrome extension pages execute preloads and modules in separate worlds,
    // so Vite's generated modulepreload cannot be reused and produces a noisy
    // cross-world mismatch warning. The normal ESM import still loads chunks.
    modulePreload: false,
    rollupOptions: {
      input: {
        eagle: 'src/eagle/index.html',
        'service-worker': 'src/background/service-worker.ts'
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'service-worker'
            ? 'service-worker.js'
            : 'eagle/assets/[name]-[hash].js',
        chunkFileNames: 'eagle/assets/[name]-[hash].js',
        assetFileNames: (asset) => {
          const name = asset.names?.[0] ?? asset.name ?? '';
          if (name.endsWith('.css')) {
            return 'eagle/assets/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    deps: {
      optimizer: {
        ssr: {
          // The Material color package is browser-bundler friendly, but its latest ESM bundle
          // includes a few extensionless internal imports that Node's test loader rejects.
          enabled: true,
          include: ['@material/material-color-utilities']
        }
      }
    }
  }
});
