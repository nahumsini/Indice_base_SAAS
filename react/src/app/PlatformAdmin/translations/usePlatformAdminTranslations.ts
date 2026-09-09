import { useLanguage } from '../../shared/context';
import { getPlatformAdminTranslator, resolvePlatformAdminLocale } from './index';
export function usePlatformAdminTranslations() {
  const { currentLanguage } = useLanguage();
  const locale = resolvePlatformAdminLocale(currentLanguage.code);
  return { locale, t: getPlatformAdminTranslator(locale) };
}
