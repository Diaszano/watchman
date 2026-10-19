import { create } from 'zustand';
import { createJSONStorage, persist, type PersistStorage } from 'zustand/middleware';
import type {
  ColorPaletteId,
  ColorPaletteStops,
  Lang,
  PlaylistMode,
  Settings,
  Theme,
} from '@/types';
import { detectLanguage } from '@/services/i18n';
import * as animationsModule from '@/animations';
import { COLOR_PALETTES, DEFAULT_COLOR_PALETTE } from '@/animations/colorPalettes';

export const defaultSettings: Settings = {
  animationId: 'dvd',
  speed: 1,
  count: 200,
  size: 40,
  color: '#ffffff',
  background: '#000000',
  gradientBackground: false,
  opacity: 1,
  brightness: 1,
  fpsLimit: 60,
  theme: 'system',
  lang: detectLanguage(),
  showFps: false,
  antiBurnIn: true,
  autoSwitch: 0,
  playlist: [],
  playlistMode: 'sequential',
  customText: 'Watchman',
  backgroundImageId: null,
  customImageId: null,
  colorPaletteId: 'watchman',
  customColorPalette: [...DEFAULT_COLOR_PALETTE],
};

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

const FALLBACK_ANIMATION_IDS = [
  'dvd',
  'clock',
  'particles',
  'bubbles',
  'starfield',
  'matrix',
  'neon',
  'shapes',
  'logo',
  'text',
] as const;

function getRegisteredAnimationIds(): readonly string[] {
  try {
    const ids = (animationsModule as Record<string, unknown>).animationIds;
    if (Array.isArray(ids) && ids.length > 0) {
      return ids as readonly string[];
    }
  } catch {
    // Handle mocked module environments where animationIds is not exported
  }
  return FALLBACK_ANIMATION_IDS;
}

function isValidHex(val: unknown): val is string {
  return typeof val === 'string' && HEX_COLOR_REGEX.test(val);
}

export function sanitizeSettings(value: unknown): Settings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...defaultSettings, playlist: [...defaultSettings.playlist] };
  }

  const raw = value as Record<string, unknown>;
  const validAnimationIds = getRegisteredAnimationIds();

  const animationId =
    typeof raw.animationId === 'string' && validAnimationIds.includes(raw.animationId)
      ? raw.animationId
      : 'dvd';

  const speed =
    typeof raw.speed === 'number' &&
    Number.isFinite(raw.speed) &&
    raw.speed >= 0.1 &&
    raw.speed <= 3
      ? raw.speed
      : defaultSettings.speed;

  const count =
    typeof raw.count === 'number' &&
    Number.isInteger(raw.count) &&
    raw.count >= 10 &&
    raw.count <= 1000
      ? raw.count
      : defaultSettings.count;

  const size =
    typeof raw.size === 'number' && Number.isFinite(raw.size) && raw.size >= 5 && raw.size <= 200
      ? raw.size
      : defaultSettings.size;

  const color = isValidHex(raw.color) ? raw.color.toLowerCase() : defaultSettings.color;

  const background = isValidHex(raw.background)
    ? raw.background.toLowerCase()
    : defaultSettings.background;

  const gradientBackground =
    typeof raw.gradientBackground === 'boolean'
      ? raw.gradientBackground
      : defaultSettings.gradientBackground;

  const opacity =
    typeof raw.opacity === 'number' &&
    Number.isFinite(raw.opacity) &&
    raw.opacity >= 0.1 &&
    raw.opacity <= 1
      ? raw.opacity
      : defaultSettings.opacity;

  const brightness =
    typeof raw.brightness === 'number' &&
    Number.isFinite(raw.brightness) &&
    raw.brightness >= 0.2 &&
    raw.brightness <= 1
      ? raw.brightness
      : defaultSettings.brightness;

  const fpsLimit =
    raw.fpsLimit === 0 || raw.fpsLimit === 30 || raw.fpsLimit === 60 || raw.fpsLimit === 120
      ? raw.fpsLimit
      : defaultSettings.fpsLimit;

  const theme: Theme =
    raw.theme === 'light' || raw.theme === 'dark' || raw.theme === 'system'
      ? raw.theme
      : defaultSettings.theme;

  const lang: Lang = raw.lang === 'en' || raw.lang === 'pt' ? raw.lang : defaultSettings.lang;

  const showFps = typeof raw.showFps === 'boolean' ? raw.showFps : defaultSettings.showFps;

  const antiBurnIn =
    typeof raw.antiBurnIn === 'boolean' ? raw.antiBurnIn : defaultSettings.antiBurnIn;

  const autoSwitch =
    typeof raw.autoSwitch === 'number' &&
    Number.isFinite(raw.autoSwitch) &&
    raw.autoSwitch >= 0 &&
    raw.autoSwitch <= 120
      ? raw.autoSwitch
      : defaultSettings.autoSwitch;

  const playlist: string[] = Array.isArray(raw.playlist)
    ? Array.from(
        new Set(
          raw.playlist.filter(
            (id): id is string => typeof id === 'string' && validAnimationIds.includes(id),
          ),
        ),
      )
    : [];

  const playlistMode: PlaylistMode =
    raw.playlistMode === 'sequential' || raw.playlistMode === 'random'
      ? raw.playlistMode
      : defaultSettings.playlistMode;

  const customText =
    typeof raw.customText === 'string' ? raw.customText : defaultSettings.customText;

  const backgroundImageId =
    typeof raw.backgroundImageId === 'string' && raw.backgroundImageId.trim().length > 0
      ? raw.backgroundImageId
      : null;

  const customImageId =
    typeof raw.customImageId === 'string' && raw.customImageId.trim().length > 0
      ? raw.customImageId
      : null;

  const paletteIds = [...Object.keys(COLOR_PALETTES), 'custom'] as ColorPaletteId[];
  const colorPaletteId = paletteIds.includes(raw.colorPaletteId as ColorPaletteId)
    ? (raw.colorPaletteId as ColorPaletteId)
    : defaultSettings.colorPaletteId;
  const customColorPalette: ColorPaletteStops =
    Array.isArray(raw.customColorPalette) &&
    raw.customColorPalette.length === 4 &&
    raw.customColorPalette.every(isValidHex)
      ? (raw.customColorPalette.map((color) => color.toLowerCase()) as ColorPaletteStops)
      : [...DEFAULT_COLOR_PALETTE];

  return {
    animationId,
    speed,
    count,
    size,
    color,
    background,
    gradientBackground,
    opacity,
    brightness,
    fpsLimit,
    theme,
    lang,
    showFps,
    antiBurnIn,
    autoSwitch,
    playlist,
    playlistMode,
    customText,
    backgroundImageId,
    customImageId,
    colorPaletteId,
    customColorPalette,
  };
}

export interface SettingsState extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
}

export type PersistedSettings = Settings;

export function migrateSettings(persistedState: unknown, version: number): Settings {
  if (!persistedState || typeof persistedState !== 'object') {
    return { ...defaultSettings, playlist: [...defaultSettings.playlist] };
  }

  const legacy = persistedState as Record<string, unknown>;

  if (version < 2) {
    const {
      backgroundImage: _backgroundImage,
      customImage: _customImage,
      ...scalarSettings
    } = legacy;
    void _backgroundImage;
    void _customImage;
    return sanitizeSettings({
      ...scalarSettings,
      backgroundImageId: null,
      customImageId: null,
    });
  }

  return sanitizeSettings(legacy);
}

const partialize = ({ set: _set, reset: _reset, ...persisted }: SettingsState): PersistedSettings =>
  sanitizeSettings(persisted);

function getSafeStorage(): Storage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const testKey = '__watchman_storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    }
  } catch {
    // Storage unavailable or disabled
  }

  const memory = new Map<string, string>();
  return {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, val: string) => {
      memory.set(key, String(val));
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
    clear: () => {
      memory.clear();
    },
    key: (i: number) => Array.from(memory.keys())[i] ?? null,
    get length() {
      return memory.size;
    },
  } as Storage;
}

const baseJsonStorage = createJSONStorage<PersistedSettings>(getSafeStorage);

const resilientPersistStorage: PersistStorage<PersistedSettings> = {
  getItem: (name) => {
    try {
      const val = baseJsonStorage?.getItem(name);
      if (val instanceof Promise) {
        return val.catch(() => null);
      }
      return val ?? null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      baseJsonStorage?.setItem(name, value);
    } catch {
      // In-memory fallback allows interaction to continue without throwing
    }
  },
  removeItem: (name) => {
    try {
      baseJsonStorage?.removeItem(name);
    } catch {
      // Silently ignore
    }
  },
};

export const useSettings = create<SettingsState>()(
  persist<SettingsState, [], [], PersistedSettings>(
    (set) => ({
      ...defaultSettings,
      set: (key, value) =>
        set((state) => {
          const updated = sanitizeSettings({
            ...state,
            [key]: value,
          });
          return updated;
        }),
      reset: () => set({ ...defaultSettings, playlist: [...defaultSettings.playlist] }),
    }),
    {
      name: 'watchman-settings',
      storage: resilientPersistStorage,
      partialize,
      version: 2,
      migrate: (persistedState, version) => migrateSettings(persistedState, version),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizeSettings(persistedState),
        set: currentState.set,
        reset: currentState.reset,
      }),
    },
  ),
);
