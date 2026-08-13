import { create } from 'zustand';

export interface RelaxState {
  isPlaying: boolean;
  loFiVolume: number; // 0-1
  droneFreq: number | null; // Hz veya null (kapalı)
  droneMix: number; // 0-1 drone'un lo-fi içindeki seviyesi
  selectedMood: string | null;
  setPlaying: (v: boolean) => void;
  setLoFiVolume: (v: number) => void;
  setDroneFreq: (freq: number | null) => void;
  setDroneMix: (v: number) => void;
  setSelectedMood: (m: string | null) => void;
  toggle: () => void;
}

export const useRelaxStore = create<RelaxState>((set) => ({
  isPlaying: false,
  loFiVolume: 0.45,
  droneFreq: null,
  droneMix: 0.32,
  selectedMood: null,
  setPlaying: (v) => set({ isPlaying: v }),
  setLoFiVolume: (v) => set({ loFiVolume: Math.max(0, Math.min(1, v)) }),
  setDroneFreq: (freq) => set({ droneFreq: freq }),
  setDroneMix: (v) => set({ droneMix: Math.max(0, Math.min(1, v)) }),
  setSelectedMood: (m) => set({ selectedMood: m }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
}));
