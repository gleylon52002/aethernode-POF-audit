import { useEffect } from 'react';
import { useTabs } from '@renderer/store/tabs';

function getDominantColor(imgEl: HTMLImageElement): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return resolve(null);
      
      canvas.width = imgEl.width || 16;
      canvas.height = imgEl.height || 16;
      
      ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue; // Skip transparent
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      
      if (count === 0) return resolve(null);
      
      r = Math.floor(r / count);
      g = Math.floor(g / count);
      b = Math.floor(b / count);
      
      // Ensure the color is not too dark or too bright for the dark theme
      // A simple lightness boost for dark themes
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      if (luminance < 0.2) {
        r = Math.min(255, r + 50);
        g = Math.min(255, g + 50);
        b = Math.min(255, b + 50);
      }
      
      resolve(`${r} ${g} ${b}`);
    } catch {
      resolve(null);
    }
  });
}

export function useAuraTheme() {
  const activeId = useTabs((s) => s.activeId);
  const tabs = useTabs((s) => s.tabs);
  const activeTab = tabs.find(t => t.id === activeId);
  
  useEffect(() => {
    if (!activeTab || !activeTab.faviconUrl) {
      document.documentElement.style.removeProperty('--brand');
      return;
    }
    
    // Asynchronously fetch the image and get the color
    const processAura = async () => {
      let src = activeTab.faviconUrl;
      // If it's a remote URL, fetch as base64 to avoid CORS and cache poisoning
      if (src && src.startsWith('http')) {
        try {
          const res = await (window.aether.app as any).fetchFavicon(src);
          if (res && res.ok && typeof res.data === 'string') {
            src = res.data;
          } else {
            return; // Failed to fetch
          }
        } catch {
          return;
        }
      }
      if (!src) return;

      const img = new Image();
      img.onload = async () => {
        const color = await getDominantColor(img);
        if (color) {
          document.documentElement.style.setProperty('--brand', color);
          document.documentElement.style.setProperty('--brand-500', `rgb(${color.replace(/ /g, ', ')})`);
          document.documentElement.style.setProperty('--brand-muted', `rgb(${color.replace(/ /g, ', ')} / 0.2)`);
        }
      };
      img.src = src;
    };
    
    void processAura();
  }, [activeTab?.faviconUrl]);
}
