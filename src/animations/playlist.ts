import type { Settings } from '@/types';
import { animationIds } from './index';

export { getAnimation } from './index';

/** Next animation id per playlist mode. Falls back to full list when empty. */
export const getNextInPlaylist = (s: Settings): string => {
  const list = s.playlist.length > 1 ? s.playlist : animationIds;
  if (s.playlistMode === 'random') {
    const others = list.filter((id) => id !== s.animationId);
    return others.length ? others[(Math.random() * others.length) | 0]! : s.animationId;
  }
  const i = list.indexOf(s.animationId);
  return list[(i + 1) % list.length]!;
};
