import { useLanguage } from '../shared/context';
import { getPaymentRequestCopy } from './paymentRequestTranslations';
export function usePaymentRequestCopy() {
  const { currentLanguage } = useLanguage();
  return getPaymentRequestCopy(currentLanguage.code);
}
