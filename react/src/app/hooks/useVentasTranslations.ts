import { useLanguage } from '../shared/context';
import { ventasTranslations } from '../locales/ventas';

export function useVentasTranslations() {
  const { currentLanguage } = useLanguage();
  return ventasTranslations[currentLanguage.code as keyof typeof ventasTranslations] || ventasTranslations['es-MX'];
}