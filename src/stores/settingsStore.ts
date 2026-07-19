import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings } from '@/types';

export const defaultSettings: Settings = {
  animationId: 'dvd',
  speed: 1,
  count: 200,
  size: 40,
  color: '#38bdf8',
  background: '#0a0a0a',
  gradientBackground: false,
  backgroundImage: null,
  opacity: 1,
  brightness: 1,
  fpsLimit: 60,
  theme: 'dark',
  lang: 'en',
  showFps: false,
  antiBurnIn: true,
  autoSwitch: 0,
  playlist: [],
  playlistMode: 'sequential',
  customText: 'Watchman',
  customImage: null,
};

interface SettingsState extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  patch: (partial: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      set: (key, value) => set({ [key]: value } as Partial<Settings>),
      patch: (partial) => set(partial),
      reset: () => set(defaultSettings),
    }),
    {
      name: 'watchman-settings',
      // Never persist heavy blobs implicitly; they're user-set and fine to keep.
      version: 1,
    },
  ),
);
