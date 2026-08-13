import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'node:path';

// AetherNode Secure Browser — Vite derleme konfigürasyonu.
// Üç derleme hedefi tek yapıdan yönetilir:
//   1. Main process    (src/main)          -> dist-electron/main
//   2. Preload scripts (src/preload)       -> dist-electron/preload
//   3. Renderer        (src/renderer)      -> dist  (statik HTML/JS)
//
// vite-plugin-electron her entry için ayrı bir alt-Vite çalıştırır;
// bu yüzden alias'ları hem kök `resolve.alias`'a hem de her entry'nin
// `vite.resolve.alias`'ına koyuyoruz.
const alias = {
  '@shared': resolve(__dirname, 'src/shared'),
  '@main': resolve(__dirname, 'src/main'),
  '@preload': resolve(__dirname, 'src/preload'),
  '@renderer': resolve(__dirname, 'src/renderer/src'),
} as const;

export default defineConfig({
  resolve: { alias },
  plugins: [
    react(),
    electron([
      {
        entry: 'src/main/index.ts',
        vite: {
          resolve: { alias },
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['electron', 'electron-store', 'electron-updater', 'argon2'],
            },
          },
        },
      },
      {
        entry: 'src/preload/index.ts',
        onstart({ reload }) {
          reload();
        },
        vite: {
          resolve: { alias },
          build: {
            outDir: 'dist-electron/preload',
            // guest.js aynı dizinde — tekil rebuild'lerde silinmemeli.
            emptyOutDir: false,
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      {
        // Guest preload — sekme <webview>'larının içinde çalışır
        // (anti-fingerprint, cookie banner reddetme, deep focus).
        entry: 'src/preload/guest.ts',
        onstart({ reload }) {
          reload();
        },
        vite: {
          resolve: { alias },
          build: {
            outDir: 'dist-electron/preload',
            emptyOutDir: false,
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      input: { index: resolve(__dirname, 'src/renderer/index.html') },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});