import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Settings } from '@/types';

export const defaultSettings: Settings = {
  animationId: 'dvd',
  speed: 1,
  count: 200,
  size: 40,
  color: '#38bdf8',
  background: '#0a0a0a',
  gradientBackground: false,
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
  renderQuality: 'auto',
  backgroundImageId: null,
  customImageId: null,
};

export interface SettingsState extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
}

export type PersistedSettings = Omit<SettingsState, 'set' | 'reset'>;

export function migrateSettings(persistedState: unknown, version: number): Partial<Settings> {
  const legacy = persistedState as Partial<Settings> & {
    backgroundImage?: unknown;
    customImage?: unknown;
  };

  if (version < 2) {
    const {
      backgroundImage: _backgroundImage,
      customImage: _customImage,
      ...scalarSettings
    } = legacy;
    void _backgroundImage;
    void _customImage;
    return { ...defaultSettings, ...scalarSettings, backgroundImageId: null, customImageId: null };
  }

  return { ...defaultSettings, ...legacy };
}

const partialize = ({
  set: _set,
  reset: _reset,
  ...persisted
}: SettingsState): PersistedSettings => persisted;

export const useSettings = create<SettingsState>()(
  persist<SettingsState, [], [], PersistedSettings>(
    (set) => ({
      ...defaultSettings,
      set: (key, value) => set({ [key]: value } as Partial<Settings>),
      reset: () => set({ ...defaultSettings, playlist: [...defaultSettings.playlist] }),
    }),
    {
      name: 'watchman-settings',
      storage: createJSONStorage(() => localStorage),
      partialize,
      version: 2,
      migrate: (persistedState, version) =>
        migrateSettings(persistedState, version) as PersistedSettings,
    },
  ),
);
