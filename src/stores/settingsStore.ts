import { create } from 'zustand';
import { createJSONStorage, persist, type PersistStorage } from 'zustand/middleware';
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
  patch: (partial: Partial<Settings>) => void;
  reset: () => void;
}

export type PersistedSettings = Omit<SettingsState, 'set' | 'patch' | 'reset'>;

export function migrateSettings(persistedState: unknown, version: number): Partial<Settings> {
  const legacy = persistedState as Partial<Settings> & {
    backgroundImage?: unknown;
    customImage?: unknown;
  };

  if (version < 2) {
    const { backgroundImage: _backgroundImage, customImage: _customImage, ...scalarSettings } = legacy;
    return { ...defaultSettings, ...scalarSettings, backgroundImageId: null, customImageId: null };
  }

  return { ...defaultSettings, ...legacy };
}

const jsonStorage = createJSONStorage<PersistedSettings>(() => localStorage)!;
const writeTimers = new Map<string, ReturnType<typeof setTimeout>>();

const debouncedStorage: PersistStorage<PersistedSettings> = {
  getItem: (name) => jsonStorage.getItem(name),
  setItem: (name, value) => {
    const previousTimer = writeTimers.get(name);
    if (previousTimer) clearTimeout(previousTimer);

    writeTimers.set(name, setTimeout(() => {
      jsonStorage.setItem(name, value);
      writeTimers.delete(name);
    }, 250));
  },
  removeItem: (name) => jsonStorage.removeItem(name),
};

const partialize = (state: SettingsState): PersistedSettings => ({
  animationId: state.animationId,
  speed: state.speed,
  count: state.count,
  size: state.size,
  color: state.color,
  background: state.background,
  gradientBackground: state.gradientBackground,
  opacity: state.opacity,
  brightness: state.brightness,
  fpsLimit: state.fpsLimit,
  theme: state.theme,
  lang: state.lang,
  showFps: state.showFps,
  antiBurnIn: state.antiBurnIn,
  autoSwitch: state.autoSwitch,
  playlist: state.playlist,
  playlistMode: state.playlistMode,
  customText: state.customText,
  renderQuality: state.renderQuality,
  backgroundImageId: state.backgroundImageId,
  customImageId: state.customImageId,
});

export const useSettings = create<SettingsState>()(
  persist<SettingsState, [], [], PersistedSettings>(
    (set) => ({
      ...defaultSettings,
      set: (key, value) => set({ [key]: value } as Partial<Settings>),
      patch: (partial) => set(partial),
      reset: () => set({ ...defaultSettings }),
    }),
    {
      name: 'watchman-settings',
      storage: debouncedStorage,
      partialize,
      version: 2,
      migrate: (persistedState, version) => migrateSettings(persistedState, version) as PersistedSettings,
    },
  ),
);
