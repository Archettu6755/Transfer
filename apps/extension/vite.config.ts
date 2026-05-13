import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDir = __dirname;

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-extension-manifest',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'manifest.json',
          source: readFileSync(resolve(rootDir, 'manifest.json'), 'utf-8')
        });
      }
    }
  ],
  resolve: {
    alias: {
      shared: new URL('../../packages/shared/src/index.ts', import.meta.url).pathname
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(rootDir, 'src/popup/popup.html'),
        options: resolve(rootDir, 'src/options/options.html'),
        serviceWorker: resolve(rootDir, 'src/background/serviceWorker.ts'),
        contentScript: resolve(rootDir, 'src/content/contentScript.ts')
      },
      output: {
        entryFileNames(chunkInfo) {
          if (chunkInfo.name === 'serviceWorker') {
            return 'src/background/serviceWorker.js';
          }

          if (chunkInfo.name === 'contentScript') {
            return 'src/content/contentScript.js';
          }

          return 'assets/[name].js';
        },
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]'
      }
    }
  }
});
