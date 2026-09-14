import type { AnimationMeta, Settings } from '@/types';
import { createDvd } from './dvd';
import { createClock } from './clock';
import { createParticles } from './particles';
import { createBubbles } from './bubbles';
import { createStarfield } from './starfield';
import { createMatrix } from './matrix';
import { createNeon } from './neon';
import { createShapes } from './shapes';
import { createCustomLogo } from './customLogo';
import { createCustomText } from './customText';

/** Registry. Add a module + one line here to extend — open/closed. */
export const animations: AnimationMeta[] = [
  {
    id: 'dvd',
    create: createDvd,
    controls: ['speed', 'size', 'opacity', 'brightness', 'color'],
  },
  {
    id: 'clock',
    create: createClock,
    controls: ['speed', 'size', 'brightness', 'color'],
  },
  {
    id: 'particles',
    create: createParticles,
    controls: ['count', 'size', 'speed', 'opacity', 'brightness', 'color'],
  },
  {
    id: 'bubbles',
    create: createBubbles,
    controls: ['count', 'size', 'speed', 'opacity', 'brightness', 'color'],
  },
  {
    id: 'starfield',
    create: createStarfield,
    controls: ['count', 'size', 'speed', 'brightness', 'color'],
  },
  {
    id: 'matrix',
    create: createMatrix,
    controls: ['count', 'size', 'speed', 'brightness', 'color'],
  },
  {
    id: 'neon',
    create: createNeon,
    controls: ['count', 'size', 'speed', 'brightness', 'color'],
  },
  {
    id: 'shapes',
    create: createShapes,
    controls: ['count', 'size', 'speed', 'opacity', 'brightness', 'color'],
  },
  {
    id: 'logo',
    create: createCustomLogo,
    controls: ['speed', 'size', 'opacity', 'brightness'],
  },
  {
    id: 'text',
    create: createCustomText,
    controls: ['speed', 'size', 'opacity', 'brightness', 'color'],
  },
];

export const animationIds = animations.map((a) => a.id);

export const getAnimation = (id: string): AnimationMeta =>
  animations.find((a) => a.id === id) ?? animations[0]!;

export const getNextInPlaylist = (s: Settings): string => {
  const list = s.playlist.length > 1 ? s.playlist : animationIds;
  if (s.playlistMode === 'random') {
    const others = list.filter((id) => id !== s.animationId);
    return others.length ? others[(Math.random() * others.length) | 0]! : s.animationId;
  }
  const i = list.indexOf(s.animationId);
  return list[(i + 1) % list.length]!;
};
