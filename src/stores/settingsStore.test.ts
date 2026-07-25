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

  it('removes legacy Data URLs while preserving scalar settings', () => {
    const migrated = migrateSettings({
      ...defaultSettings,
      animationId: 'matrix',
      speed: 2,
      backgroundImage: 'data:image/png;base64,abc',
      customImage: 'data:image/jpeg;base64,def',
    }, 1);

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

  it('persists the final setting once after the debounce delay', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    useSettings.persist.clearStorage();
    setItem.mockClear();

    useSettings.getState().set('speed', 1.5);
    useSettings.getState().set('speed', 2);
    useSettings.getState().set('speed', 2.5);

    expect(setItem).not.toHaveBeenCalled();

    vi.advanceTimersByTime(249);
    expect(setItem).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(setItem).toHaveBeenCalledTimes(1);

    const [key, payload] = setItem.mock.calls[0] as [string, string];
    const persisted = JSON.parse(payload) as { state: Record<string, unknown>; version: number };
    expect(key).toBe('watchman-settings');
    expect(persisted).toMatchObject({ state: { speed: 2.5 }, version: 2 });
    expect(persisted.state).not.toHaveProperty('backgroundImage');
    expect(persisted.state).not.toHaveProperty('customImage');
    expect(payload).not.toContain('data:image');
  });

  it('does not recreate settings after clearStorage cancels a pending write', () => {
    useSettings.persist.clearStorage();
    useSettings.getState().set('speed', 2);

    useSettings.persist.clearStorage();
    expect(localStorage.getItem('watchman-settings')).toBeNull();

    vi.advanceTimersByTime(275);
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
});
