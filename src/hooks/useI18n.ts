import { useCallback } from 'react';
import { useSettings } from '@/stores/settingsStore';
import { translate } from '@/services/i18n';

export const useI18n = () => {
  const lang = useSettings((s) => s.lang);
  const t = useCallback((key: string) => translate(lang, key), [lang]);
  return { t, lang };
};
