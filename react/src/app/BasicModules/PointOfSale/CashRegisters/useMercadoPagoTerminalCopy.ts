import { useLanguage } from '../../../shared/context';
import { resolvePointOfSaleLocale } from '../translations';
import { mercadoPagoTerminalCopyByLocale } from './mercadoPagoTerminalCopy';
export function useMercadoPagoTerminalCopy() {
  const { currentLanguage } = useLanguage();
  const locale = resolvePointOfSaleLocale(currentLanguage.code);
  return { locale, copy: mercadoPagoTerminalCopyByLocale[locale] };
}
