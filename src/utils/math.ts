export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const rand = (min: number, max: number): number => min + Math.random() * (max - min);

export const randInt = (min: number, max: number): number => Math.floor(rand(min, max + 1));

export const pick = <T>(arr: readonly T[]): T => arr[randInt(0, arr.length - 1)]!;
