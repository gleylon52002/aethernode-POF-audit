// <webview> etiketi için minimal tip bildirimleri.
// Electron'un tüm tip yüzeyini renderer'a sokmadan, sadece kullandığımız
// olay ve metotları tanımlıyoruz.
import type React from 'react';

// Electron <webview> DOM olayları veriyi CustomEvent.detail'de değil,
// doğrudan olay nesnesinin üzerinde taşır (e.url, e.title, e.favicons).
export interface WebviewFoundInPageResult {
  requestId: number;
  activeMatchOrdinal: number;
  matches: number;
  selectionArea: unknown;
  finalUpdate: boolean;
}

export interface WebviewEventMap {
  'did-start-loading': Event;
  'did-stop-loading': Event;
  'page-title-updated': Event & { title: string };
  'page-favicon-updated': Event & { favicons: string[] };
  'did-navigate': Event & { url: string };
  'did-navigate-in-page': Event & { url: string };
  'will-download': Event & { item?: WebviewDownloadItem };
  'dom-ready': Event;
  'found-in-page': Event & { result: WebviewFoundInPageResult };
}

export interface WebviewDownloadItem {
  getFilename(): string;
  getURL(): string;
  getTotalBytes(): number;
}

export interface WebviewElement extends HTMLElement {
  src: string;
  partition: string;
  allowpopups: boolean;
  addEventListener<K extends keyof WebviewEventMap>(
    type: K,
    listener: (this: WebviewElement, ev: WebviewEventMap[K]) => void,
  ): void;
  removeEventListener<K extends keyof WebviewEventMap>(
    type: K,
    listener: (this: WebviewElement, ev: WebviewEventMap[K]) => void,
  ): void;
  goBack(): void;
  goForward(): void;
  loadURL(url: string): Promise<void>;
  reload(): void;
  reloadIgnoringCache(): void;
  stop(): void;
  getZoomLevel(): number;
  setZoomLevel(level: number): void;
  send(channel: string, ...args: unknown[]): void;
  openDevTools(): void;
  getURL(): string;
  getTitle(): string;
  findInPage(
    text: string,
    options?: { forward?: boolean; findNext?: boolean; matchCase?: boolean },
  ): number;
  stopFindInPage(action?: 'clearSelection' | 'keepSelection' | 'activateSelection'): void;
  print(options?: unknown): void;
  capturePage(): Promise<{ toDataURL(): string; toPNG(): Uint8Array; isEmpty(): boolean }>;
  executeJavaScript<T = unknown>(code: string, userGesture?: boolean): Promise<T>;
  insertCSS(css: string): Promise<string>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      webview: {
        src?: string;
        partition?: string;
        allowpopups?: boolean;
        preload?: string;
        useragent?: string;
        style?: React.CSSProperties;
        ref?: React.Ref<WebviewElement>;
        [key: string]: unknown;
      };
    }
  }
}

export {};
