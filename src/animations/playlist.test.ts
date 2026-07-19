import { describe, expect, it } from 'vitest';
import { getNextInPlaylist } from './playlist';
import { defaultSettings } from '@/stores/settingsStore';
import type { Settings } from '@/types';

const base = (over: Partial<Settings>): Settings => ({ ...defaultSettings, ...over });

describe('getNextInPlaylist', () => {
  it('cycles sequentially through the playlist', () => {
    const s = base({
      playlist: ['dvd', 'matrix', 'neon'],
      animationId: 'matrix',
      playlistMode: 'sequential',
    });
    expect(getNextInPlaylist(s)).toBe('neon');
  });

  it('wraps around at the end', () => {
    const s = base({
      playlist: ['dvd', 'matrix'],
      animationId: 'matrix',
      playlistMode: 'sequential',
    });
    expect(getNextInPlaylist(s)).toBe('dvd');
  });

  it('never returns the current animation in random mode', () => {
    const s = base({ playlist: ['dvd', 'matrix'], animationId: 'dvd', playlistMode: 'random' });
    for (let i = 0; i < 20; i++) expect(getNextInPlaylist(s)).not.toBe('dvd');
  });

  it('falls back to the full registry when playlist has <2 items', () => {
    const s = base({ playlist: [], animationId: 'dvd', playlistMode: 'sequential' });
    expect(getNextInPlaylist(s)).toBe('clock'); // second in registry
  });
});
