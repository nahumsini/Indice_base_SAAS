import { useLanguage } from '../shared/context';
import { kpisTranslations } from '../locales/kpis';

export function useKpisTranslations() {
  const { currentLanguage } = useLanguage();
  return kpisTranslations[currentLanguage.code as keyof typeof kpisTranslations] || kpisTranslations['es-MX'];
}