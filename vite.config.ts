import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig(({ mode }) => {
  const pagesBuild = mode === 'github-pages';
  const base = pagesBuild ? '/ZooPlay/' : '/';

  return {
    base,
    plugins: [react(), ...(pagesBuild ? [] : [cloudflare()])],
    build: { target: 'es2022' },
  };
});
