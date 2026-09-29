import type { Animation, AnimationFrame } from '@/types';

const localeFor = (lang: 'en' | 'pt'): string => (lang === 'pt' ? 'pt-BR' : 'en-GB');

export const createClock = (): Animation => {
  const options = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  } as const;
  let locale = localeFor('en');
  let formatter = new Intl.DateTimeFormat(locale, options);
  let initialized = false;
  let x = 0;
  let y = 0;
  let vx = 1;
  let vy = 1;
  let lastWidth = 0;
  let lastHeight = 0;

  return {
    draw({ ctx, width, height, dt, time, settings }: AnimationFrame) {
      if (width <= 0 || height <= 0) return;

      // Lang can change without remounting the animation, so key the cache on locale.
      const nextLocale = localeFor(settings.lang);
      if (nextLocale !== locale) {
        locale = nextLocale;
        formatter = new Intl.DateTimeFormat(locale, options);
      }

      if (!initialized) {
        initialized = true;
        x = width / 2;
        y = height / 2;
      } else if (lastWidth > 0 && lastHeight > 0 && (width !== lastWidth || height !== lastHeight)) {
        x = (x / lastWidth) * width;
        y = (y / lastHeight) * height;
      }
      lastWidth = width;
      lastHeight = height;

      const now = new Date();
      const label = formatter.format(now);

      const marginX = Math.min(12, width / 4);
      const marginY = Math.min(12, height / 4);
      const maxW = Math.max(1, width - marginX * 2);
      const maxH = Math.max(1, height - marginY * 2);

      const prefFontSize = settings.size * 3;
      ctx.font = `600 ${prefFontSize}px ui-monospace, monospace`;
      const measuredW = ctx.measureText(label).width || 1;
      const measuredH = prefFontSize;
      const fitScale = Math.min(1, maxW / measuredW, maxH / measuredH);
      const fontSize = Math.max(1, prefFontSize * fitScale);

      ctx.font = `600 ${fontSize}px ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const halfW = (ctx.measureText(label).width || 1) / 2;
      const halfH = fontSize / 2;

      // Slow drift so digits never sit in one place.
      const speed = 24 * settings.speed;
      x += Math.cos(time * 0.13) * speed * dt + vx * speed * 0.2 * dt;
      y += Math.sin(time * 0.17) * speed * dt + vy * speed * 0.2 * dt;

      const minX = marginX + halfW;
      const maxX = width - marginX - halfW;
      const minY = marginY + halfH;
      const maxY = height - marginY - halfH;

      if (maxX <= minX) {
        x = width / 2;
      } else {
        if (x < minX) {
          x = minX;
          vx = 1;
        } else if (x > maxX) {
          x = maxX;
          vx = -1;
        }
      }

      if (maxY <= minY) {
        y = height / 2;
      } else {
        if (y < minY) {
          y = minY;
          vy = 1;
        } else if (y > maxY) {
          y = maxY;
          vy = -1;
        }
      }

      ctx.fillStyle = settings.color;
      ctx.fillText(label, x, y);
    },
  };
};
