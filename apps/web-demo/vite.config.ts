import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      shared: new URL('../../packages/shared/src/index.ts', import.meta.url).pathname,
      core: new URL('../../packages/core/src/index.ts', import.meta.url).pathname,
      'asr-local': new URL('../../packages/asr-local/src/index.ts', import.meta.url).pathname,
      translator: new URL('../../packages/translator/src/index.ts', import.meta.url).pathname
    }
  },
  test: {
    environment: 'jsdom'
  }
});
