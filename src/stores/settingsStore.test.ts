import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings, migrateSettings, useSettings } from './settingsStore';

describe('settings persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    useSettings.setState({ ...defaultSettings });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('detects the browser language on first visit and preserves a saved choice', async () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['pt-BR', 'en-US']);
    localStorage.clear();
    vi.resetModules();
    const { useSettings: freshSettings } = await import('./settingsStore');
    expect(freshSettings.getState().lang).toBe('pt');

    freshSettings.getState().set('lang', 'en');
    vi.resetModules();
    const { useSettings: restoredSettings } = await import('./settingsStore');
    expect(restoredSettings.getState().lang).toBe('en');
    restoredSettings.getState().reset();
    expect(restoredSettings.getState().lang).toBe('pt');
  });

  it('removes legacy Data URLs while preserving scalar settings', () => {
    const migrated = migrateSettings(
      {
        ...defaultSettings,
        animationId: 'matrix',
        speed: 2,
        backgroundImage: 'data:image/png;base64,abc',
        customImage: 'data:image/jpeg;base64,def',
      },
      1,
    );

    expect(migrated).toMatchObject({
      animationId: 'matrix',
      speed: 2,
      backgroundImageId: null,
      customImageId: null,
    });
    expect(migrated).not.toHaveProperty('backgroundImage');
    expect(migrated).not.toHaveProperty('customImage');
    expect(JSON.stringify(migrated)).not.toContain('data:image');
  });

  it('persists settings synchronously to localStorage without binary image content', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    useSettings.persist.clearStorage();
    setItem.mockClear();

    useSettings.getState().set('speed', 2.5);

    expect(setItem).toHaveBeenCalled();
    const [key, payload] = setItem.mock.calls.at(-1) as [string, string];
    const persisted = JSON.parse(payload) as { state: Record<string, unknown>; version: number };
    expect(key).toBe('watchman-settings');
    expect(persisted).toMatchObject({ state: { speed: 2.5 }, version: 2 });
    expect(persisted.state).not.toHaveProperty('backgroundImage');
    expect(persisted.state).not.toHaveProperty('customImage');
    expect(persisted.state).not.toHaveProperty('set');
    expect(persisted.state).not.toHaveProperty('reset');
    expect(payload).not.toContain('data:image');
  });

  it('clears persisted settings on clearStorage', () => {
    useSettings.getState().set('speed', 2);
    expect(localStorage.getItem('watchman-settings')).not.toBeNull();

    useSettings.persist.clearStorage();
    expect(localStorage.getItem('watchman-settings')).toBeNull();
  });

  it('creates a fresh default playlist on reset', () => {
    useSettings.getState().reset();
    const firstResetPlaylist = useSettings.getState().playlist;

    firstResetPlaylist.push('dvd');
    useSettings.getState().reset();

    expect(useSettings.getState().playlist).toEqual([]);
    expect(useSettings.getState().playlist).not.toBe(firstResetPlaylist);
    expect(defaultSettings.playlist).toEqual([]);
  });

  describe('sanitizeSettings', () => {
    it('returns default settings when given null, array, primitive, or empty object', async () => {
      const { sanitizeSettings, defaultSettings: currentDefaults } =
        await import('./settingsStore');

      expect(sanitizeSettings(null)).toEqual(currentDefaults);
      expect(sanitizeSettings(undefined)).toEqual(currentDefaults);
      expect(sanitizeSettings([])).toEqual(currentDefaults);
      expect(sanitizeSettings('string')).toEqual(currentDefaults);
      expect(sanitizeSettings(42)).toEqual(currentDefaults);
      expect(sanitizeSettings({})).toEqual(currentDefaults);
    });

    it('falls back to default for out-of-bounds or non-finite numbers', async () => {
      const { sanitizeSettings, defaultSettings: currentDefaults } =
        await import('./settingsStore');

      const sanitized = sanitizeSettings({
        speed: 10,
        count: 5,
        size: 300,
        opacity: 2,
        brightness: 0.1,
        autoSwitch: -5,
        fpsLimit: 45,
      });

      expect(sanitized.speed).toBe(currentDefaults.speed);
      expect(sanitized.count).toBe(currentDefaults.count);
      expect(sanitized.size).toBe(currentDefaults.size);
      expect(sanitized.opacity).toBe(currentDefaults.opacity);
      expect(sanitized.brightness).toBe(currentDefaults.brightness);
      expect(sanitized.autoSwitch).toBe(currentDefaults.autoSwitch);
      expect(sanitized.fpsLimit).toBe(currentDefaults.fpsLimit);
    });

    it('preserves valid bounded values', async () => {
      const { sanitizeSettings } = await import('./settingsStore');

      const sanitized = sanitizeSettings({
        speed: 2.5,
        count: 500,
        size: 80,
        opacity: 0.5,
        brightness: 0.7,
        autoSwitch: 60,
        fpsLimit: 120,
      });

      expect(sanitized.speed).toBe(2.5);
      expect(sanitized.count).toBe(500);
      expect(sanitized.size).toBe(80);
      expect(sanitized.opacity).toBe(0.5);
      expect(sanitized.brightness).toBe(0.7);
      expect(sanitized.autoSwitch).toBe(60);
      expect(sanitized.fpsLimit).toBe(120);
    });

    it('validates colors, enums, booleans and animationId', async () => {
      const { sanitizeSettings, defaultSettings: currentDefaults } =
        await import('./settingsStore');

      const invalid = sanitizeSettings({
        animationId: 'non-existent',
        color: 'blue',
        background: '#123',
        gradientBackground: 'true',
        theme: 'neon',
        playlistMode: 'shuffle',
        lang: 'de',
        showFps: 1,
        antiBurnIn: null,
      });

      expect(invalid.animationId).toBe('dvd');
      expect(invalid.color).toBe(currentDefaults.color);
      expect(invalid.background).toBe(currentDefaults.background);
      expect(invalid.gradientBackground).toBe(currentDefaults.gradientBackground);
      expect(invalid.theme).toBe(currentDefaults.theme);
      expect(invalid.playlistMode).toBe(currentDefaults.playlistMode);
      expect(invalid.lang).toBe(currentDefaults.lang);
      expect(invalid.showFps).toBe(currentDefaults.showFps);
      expect(invalid.antiBurnIn).toBe(currentDefaults.antiBurnIn);
    });

    it('filters and deduplicates playlist, discarding non-array and invalid IDs', async () => {
      const { sanitizeSettings } = (await import('./settingsStore')) as unknown as {
        sanitizeSettings: (val: unknown) => typeof defaultSettings;
      };

      expect(sanitizeSettings({ playlist: null }).playlist).toEqual([]);
      expect(sanitizeSettings({ playlist: 'dvd' }).playlist).toEqual([]);
      expect(
        sanitizeSettings({ playlist: ['dvd', 'matrix', 'invalid', 'dvd', 'neon'] }).playlist,
      ).toEqual(['dvd', 'matrix', 'neon']);
    });

    it('sanitizes image IDs and custom text', async () => {
      const { sanitizeSettings } = (await import('./settingsStore')) as unknown as {
        sanitizeSettings: (val: unknown) => typeof defaultSettings;
      };

      const sanitized = sanitizeSettings({
        customText: 12345,
        backgroundImageId: '',
        customImageId: 'valid-id-123',
      });

      expect(sanitized.customText).toBe(defaultSettings.customText);
      expect(sanitized.backgroundImageId).toBeNull();
      expect(sanitized.customImageId).toBe('valid-id-123');
    });

    it('drops extra fields and actions', async () => {
      const { sanitizeSettings } = (await import('./settingsStore')) as unknown as {
        sanitizeSettings: (val: unknown) => Record<string, unknown>;
      };

      const sanitized = sanitizeSettings({
        maliciousField: 'exploit',
        set: () => 'override',
        reset: () => 'override',
        speed: 1.5,
      });

      expect(sanitized).not.toHaveProperty('maliciousField');
      expect(sanitized).not.toHaveProperty('set');
      expect(sanitized).not.toHaveProperty('reset');
      expect(sanitized.speed).toBe(1.5);
    });
  });

  describe('persistence resilience', () => {
    it('recovers with default settings when localStorage contains corrupted JSON', async () => {
      localStorage.setItem('watchman-settings', '{malformed json');
      vi.resetModules();
      const { useSettings: resilientStore } = await import('./settingsStore');
      expect(resilientStore.getState().speed).toBe(defaultSettings.speed);
      expect(typeof resilientStore.getState().set).toBe('function');
      expect(typeof resilientStore.getState().reset).toBe('function');

      // Interacting with store does not throw
      expect(() => resilientStore.getState().set('speed', 2)).not.toThrow();
    });

    it('preserves set and reset functions even if stored state attempted to overwrite them', async () => {
      localStorage.setItem(
        'watchman-settings',
        JSON.stringify({
          state: {
            speed: 1.8,
            set: 'corrupted-set',
            reset: 123,
            unknownProp: 'test',
          },
          version: 2,
        }),
      );
      vi.resetModules();
      const { useSettings: restoredStore } = await import('./settingsStore');
      const state = restoredStore.getState();
      expect(state.speed).toBe(1.8);
      expect(typeof state.set).toBe('function');
      expect(typeof state.reset).toBe('function');
      expect(state).not.toHaveProperty('unknownProp');
    });
  });
});
