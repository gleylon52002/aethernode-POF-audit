import { create } from 'zustand';
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/types/settings';

// Ayar mirror — renderer, IPC üzerinden main tarafını sorgular; buradaki
// mirror UI gecikmelerini en aza indirir ve optimistik güncellemeye izin verir.
interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  load: () => Promise<void>;
  apply: (next: AppSettings) => Promise<void>;
  set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export const useSettings = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  load: async () => {
    const res = await window.aether.settings.all();
    if (res.ok && res.data) set({ settings: res.data as AppSettings, loaded: true });
  },
  apply: async (next) => {
    set({ settings: next });
    await window.aether.settings.set(next);
  },
  set: (key, value) =>
    set((s) => ({ settings: { ...s.settings, [key]: value } })),
}));