import { useLanguage } from '../../../../shared/context';
import { resolvePointOfSaleLocale } from '../../translations';
import { squareTerminalRecoveryCopyByLocale } from './squareTerminalRecoveryCopy';

export function useSquareTerminalRecoveryCopy() {
  const { currentLanguage } = useLanguage();
  const locale = resolvePointOfSaleLocale(currentLanguage.code);
  return { locale, copy: squareTerminalRecoveryCopyByLocale[locale] };
}
