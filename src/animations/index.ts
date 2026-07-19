import type { AnimationMeta } from '@/types';
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
  { id: 'dvd', create: createDvd },
  { id: 'clock', create: createClock },
  { id: 'particles', create: createParticles },
  { id: 'bubbles', create: createBubbles },
  { id: 'starfield', create: createStarfield },
  { id: 'matrix', create: createMatrix },
  { id: 'neon', create: createNeon },
  { id: 'shapes', create: createShapes },
  { id: 'logo', create: createCustomLogo },
  { id: 'text', create: createCustomText },
];

export const animationIds = animations.map((a) => a.id);

export const getAnimation = (id: string): AnimationMeta =>
  animations.find((a) => a.id === id) ?? animations[0]!;
