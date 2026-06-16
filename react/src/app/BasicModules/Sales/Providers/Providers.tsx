import { useEffect, useState } from 'react';
import { FailureToast } from '../../../components/FailureToast';
import ProveedoresPage from '../../Expenses/Providers/ProveedoresPage';
import type { ProviderRecord } from '../../Expenses/Providers/useProveedoresLogic';
import { providersService, toFinanceApiErrorMessage } from '../../Expenses/services';

export default function SalesProviders() {
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [failureToastMessage, setFailureToastMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    providersService.getProviderRecords()
      .then((records) => {
        if (!isMounted) return;
        setProviders(records);
      })
      .catch((error) => {
        if (!isMounted) return;
        setFailureToastMessage(toFinanceApiErrorMessage(error));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <FailureToast
        isVisible={Boolean(failureToastMessage)}
        message={failureToastMessage}
        onClose={() => setFailureToastMessage('')}
      />
      <ProveedoresPage
        headerIcon="🏢"
        headerSubtitle="Directorio compartido para proveedores comerciales, inventario y gastos."
        headerTitle="Proveedores"
        onProvidersChange={setProviders}
        providers={providers}
        variant="sales"
      />
    </>
  );
}
