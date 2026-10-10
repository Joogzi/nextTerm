import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'demo' ? '/nextTerm/' : '/',
  define: {
    'import.meta.env.VITE_DEMO': JSON.stringify(mode === 'demo' ? 'true' : 'false'),
  },
  plugins: [preact(), tsconfigPaths(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
}));
