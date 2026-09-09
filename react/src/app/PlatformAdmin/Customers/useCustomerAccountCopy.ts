import { useLanguage } from '../../shared/context';
import { getCustomerAccountCopy } from './customerAccountTranslations';

export function useCustomerAccountCopy() {
  const { currentLanguage } = useLanguage();
  return getCustomerAccountCopy(currentLanguage.code);
}
