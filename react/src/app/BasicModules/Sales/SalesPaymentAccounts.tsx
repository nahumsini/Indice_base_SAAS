import { useNavigate } from 'react-router';
import PaymentAccounts from '../Expenses/PaymentAccounts';
import { useSalesTranslations } from './hooks/useSalesTranslations';

export default function SalesPaymentAccounts() {
  const navigate = useNavigate();
  const copy = useSalesTranslations();

  return (
    <PaymentAccounts
      headerTitle={copy.paymentAccountsWorkspace.title}
      headerSubtitle={copy.paymentAccountsWorkspace.subtitle}
      headerTone="coral"
      onNavigate={(page) => page && navigate(`/${page}`)}
    />
  );
}
