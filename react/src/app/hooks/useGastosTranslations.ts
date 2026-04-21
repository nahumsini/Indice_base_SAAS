import { useLanguage } from '../shared/context';
import { gastosTranslations } from '../locales/gastos';

export function useGastosTranslations() {
  const { currentLanguage } = useLanguage();
  return gastosTranslations[currentLanguage.code as keyof typeof gastosTranslations] || gastosTranslations['es-MX'];
}