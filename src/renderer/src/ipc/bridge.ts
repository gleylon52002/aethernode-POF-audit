// Renderer tarafında window.aether tipini tanımlar.
// preload tarafından exposeInMainWorld ile açılan API ile birebir uyumlu.
import type { AetherApi } from '@preload';

declare global {
  interface Window {
    aether: AetherApi;
  }
}

export {};