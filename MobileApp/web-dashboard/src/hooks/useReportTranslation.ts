import { useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export const useReportTranslation = () => {
  const { t } = useLanguage();

  const tr = useCallback(
    (key: string, fallback: string): string => {
      const val = t(key);
      return val === key ? fallback : val;
    },
    [t]
  );

  return tr;
};
