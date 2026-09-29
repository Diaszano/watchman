import { describe, expect, it } from 'vitest';
import type { Lang } from '@/types';
import { detectLanguage, translate } from './i18n';

describe('i18n', () => {
  it.each([
    [['pt-BR', 'en-US'], 'pt'],
    [['pt-PT'], 'pt'],
    [['en-GB', 'pt-BR'], 'en'],
    [['fr-FR', 'pt-BR'], 'pt'],
    [['PT-br'], 'pt'],
    [['es-ES'], 'en'],
    [[], 'en'],
  ] as const)('detects the first supported browser language in %j', (languages, expected) => {
    expect(detectLanguage(languages)).toBe(expected);
  });

  const newKeys: Array<[Lang, string, string]> = [
    ['en', 'settings.playlistMode.sequential', 'Sequential'],
    ['en', 'settings.playlistMode.random', 'Random'],
    ['en', 'settings.theme.dark', 'Dark'],
    ['en', 'settings.theme.light', 'Light'],
    ['en', 'settings.clear', 'Clear'],
    ['en', 'logo.uploadPrompt', 'Upload a logo in Settings'],
    ['en', 'image.invalid', 'Invalid image format. Please select a valid image.'],
    ['en', 'image.tooLarge', 'Image size exceeds the 5MB limit.'],
    ['en', 'image.dimensions', 'Image dimensions exceed the 8192px or 16.7MP limit.'],
    ['pt', 'settings.playlistMode.sequential', 'Sequencial'],
    ['pt', 'settings.playlistMode.random', 'Aleatório'],
    ['pt', 'settings.theme.dark', 'Escuro'],
    ['pt', 'settings.theme.light', 'Claro'],
    ['pt', 'settings.clear', 'Limpar'],
    ['pt', 'logo.uploadPrompt', 'Envie um logo nas Configurações'],
    ['pt', 'image.invalid', 'Formato de imagem inválido. Selecione uma imagem válida.'],
    ['pt', 'image.tooLarge', 'O tamanho da imagem excede o limite de 5MB.'],
    ['pt', 'image.dimensions', 'As dimensões da imagem excedem o limite de 8192px ou 16.7MP.'],
  ];

  it.each(newKeys)('translates %s %s to %s', (lang, key, expected) => {
    expect(translate(lang, key)).toBe(expected);
  });

  it.each(['en', 'pt'] as const)('falls back to the key when missing in %s', (lang) => {
    expect(translate(lang, 'settings.doesNotExist')).toBe('settings.doesNotExist');
  });

  it('provides accessible labels for player controls in en and pt', () => {
    const keys = [
      'player.play',
      'player.pause',
      'player.settings',
      'player.fullscreen',
      'player.close',
      'player.shortcuts',
      'app.logoAlt',
    ];
    for (const k of keys) {
      expect(translate('en', k)).not.toBe(k);
      expect(translate('pt', k)).not.toBe(k);
    }
  });

  it('translates settings tabs and OLED help in both languages', () => {
    for (const key of [
      'settings.tab.animation',
      'settings.tab.oled',
      'settings.tab.playlist',
      'settings.tab.general',
      'settings.antiBurnIn.desc',
      'settings.trueBlack',
    ]) {
      expect(translate('en', key)).not.toBe(key);
      expect(translate('pt', key)).not.toBe(key);
    }
  });
});
