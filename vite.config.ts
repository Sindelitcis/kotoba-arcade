import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
  base: './',
  plugins: [preact()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Os testes que percorrem o curso inteiro levam uns 2 s sozinhos; com a bateria toda em
    // paralelo, passavam dos 5 s padrão e falhavam por tempo, não por erro.
    testTimeout: 20_000,
  },
});
