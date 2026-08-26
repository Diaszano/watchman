import { describe, expect, it } from 'vitest';
import type { Lang } from '@/types';
import { translate } from './i18n';

describe('i18n', () => {
  const newKeys: Array<[Lang, string, string]> = [
    ['en', 'settings.playlistMode.sequential', 'Sequential'],
    ['en', 'settings.playlistMode.random', 'Random'],
    ['en', 'settings.theme.dark', 'Dark'],
    ['en', 'settings.theme.light', 'Light'],
    ['en', 'settings.clear', 'Clear'],
    ['en', 'logo.uploadPrompt', 'Upload a logo in Settings'],
    ['pt', 'settings.playlistMode.sequential', 'Sequencial'],
    ['pt', 'settings.playlistMode.random', 'Aleatório'],
    ['pt', 'settings.theme.dark', 'Escuro'],
    ['pt', 'settings.theme.light', 'Claro'],
    ['pt', 'settings.clear', 'Limpar'],
    ['pt', 'logo.uploadPrompt', 'Envie um logo nas Configurações'],
  ];

  it.each(newKeys)('translates %s %s to %s', (lang, key, expected) => {
    expect(translate(lang, key)).toBe(expected);
  });

  it.each(['en', 'pt'] as const)('falls back to the key when missing in %s', (lang) => {
    expect(translate(lang, 'settings.doesNotExist')).toBe('settings.doesNotExist');
  });
});
