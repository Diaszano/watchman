export const rand = (min: number, max: number): number => min + Math.random() * (max - min);

export const randInt = (min: number, max: number): number => Math.floor(rand(min, max + 1));

export const pick = <T>(arr: readonly T[]): T => arr[randInt(0, arr.length - 1)]!;

export const densityCount = (raw: number, minimum: number, renderDensity: number): number =>
  Math.max(minimum, Math.round(raw * renderDensity));
