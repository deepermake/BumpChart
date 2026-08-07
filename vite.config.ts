import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { semiTheming } from 'vite-plugin-semi-theming';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    semiTheming({
      theme: '@semi-bot/semi-theme-feishu-dashboard',
    }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        // Use the modern Dart Sass JS API to silence legacy-js-api deprecation warnings.
        api: 'modern-compiler' as const,
        // Silence the @import deprecation emitted by vite-plugin-semi-theming internals.
        silenceDeprecations: ['import', 'legacy-js-api'] as any,
      },
    },
  },
  server: {
    host: '0.0.0.0',
  },
});
