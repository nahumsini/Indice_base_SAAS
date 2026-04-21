import { useLanguage } from '../shared/context';
import { cajaChicaTranslations } from '../locales/cajaChica';

export function useCajaChicaTranslations() {
  const { currentLanguage } = useLanguage();
  return cajaChicaTranslations[currentLanguage.code as keyof typeof cajaChicaTranslations] || cajaChicaTranslations['es-MX'];
}