export type Theme = 'light' | 'dark';
export type Lang = 'en' | 'pt';
export type PlaylistMode = 'sequential' | 'random';

/** User-tunable settings shared by all animations. Persisted to LocalStorage. */
export interface Settings {
  animationId: string;
  speed: number; // multiplier, 0.1..3
  count: number; // object/particle count
  size: number; // base object size in px
  color: string; // primary color, hex
  background: string; // background color, hex
  gradientBackground: boolean;
  backgroundImage: string | null; // data URL
  opacity: number; // 0..1
  brightness: number; // 0..1
  fpsLimit: number; // target FPS cap (30/60/120)
  theme: Theme;
  lang: Lang;
  showFps: boolean;
  antiBurnIn: boolean;
  autoSwitch: number; // seconds between auto-switches, 0 = off
  playlist: string[]; // animation ids
  playlistMode: PlaylistMode;
  customText: string;
  customImage: string | null; // data URL for Custom Logo
}

/** Per-frame context handed to every animation. Canvas-native, no React. */
export interface AnimationFrame {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dt: number; // seconds since previous frame
  time: number; // total elapsed seconds
  settings: Settings;
}

/**
 * An animation is a stateful drawer. Factories (see animations/index.ts)
 * produce a fresh instance so per-animation state resets on switch.
 */
export interface Animation {
  draw(frame: AnimationFrame): void;
}

export interface AnimationMeta {
  id: string;
  /** i18n key suffix -> resolved via t(`anim.${id}`). */
  create: () => Animation;
}
