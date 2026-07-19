import { forwardRef } from 'react';

/** Full-viewport canvas. The loop hook owns all drawing; this is just the surface. */
export const ScreensaverCanvas = forwardRef<HTMLCanvasElement>((_, ref) => (
  <canvas ref={ref} className="absolute inset-0 block h-full w-full" />
));
ScreensaverCanvas.displayName = 'ScreensaverCanvas';
