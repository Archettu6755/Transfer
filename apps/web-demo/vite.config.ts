import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      shared: new URL('../../packages/shared/src/index.ts', import.meta.url).pathname,
      core: new URL('../../packages/core/src/index.ts', import.meta.url).pathname,
      'asr-browser': new URL('../../packages/asr-browser/src/index.ts', import.meta.url).pathname,
      translator: new URL('../../packages/translator/src/index.ts', import.meta.url).pathname
    }
  },
  test: {
    environment: 'jsdom'
  }
});
