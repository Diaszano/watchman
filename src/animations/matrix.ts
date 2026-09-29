import type { Animation, AnimationFrame } from '@/types';
import { rgba } from '@/utils/color';
import { rand } from '@/utils/math';

const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺ0123456789ABCDEFﾊﾋﾌﾍﾎ$#%&'.split('');
const glyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0]!;

// Each column keeps a head position; a fading tail is drawn every frame,
// so it renders correctly even though the loop clears each frame.
export const createMatrix = (): Animation => {
  let heads: number[] = [];
  let cols = 0;
  let font = 0;
  let styleColor = '';
  let tailStyles: string[] = [];

  return {
    draw({ ctx, width, height, dt, settings }: AnimationFrame) {
      const f = Math.max(10, settings.size / 2);
      const newCols = Math.max(1, Math.ceil(width / f));
      if (newCols !== cols || f !== font) {
        cols = newCols;
        font = f;
        heads = Array.from({ length: cols }, () => rand(-40, 0));
      }

      ctx.font = `${font}px ui-monospace, monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const step = 12 * settings.speed;
      const tail = 18;
      if (settings.color !== styleColor || tailStyles.length !== tail) {
        styleColor = settings.color;
        tailStyles = Array.from({ length: tail }, (_, j) =>
          j === 0 ? '#e6ffe6' : rgba(styleColor, (1 - j / tail) * 0.8),
        );
      }

      for (let i = 0; i < cols; i++) {
        const head = heads[i]!;
        for (let j = 0; j < tail; j++) {
          const row = Math.floor(head) - j;
          if (row < 0) continue;
          const y = row * font;
          if (y > height) continue;
          ctx.fillStyle = tailStyles[j]!;
          ctx.fillText(glyph(), i * font, y);
        }
        heads[i]! += step * dt;
        if ((Math.floor(head) - tail) * font > height && Math.random() > 0.96) {
          heads[i] = rand(-20, 0);
        }
      }
    },
  };
};
