import { useEffect, useMemo, useState } from 'react';
import { usePointOfSaleCatalogProducts } from '../../CommerceCore/usePointOfSaleCatalogProducts';
import { readStoredDiscountRules } from '../shared/commercial/discounts';
import { posBackendApi, type PosWarehouseSummary } from '../Sale/services/posBackendApi';
import { usePointOfSaleKioskTranslations } from './kioskTranslations';
import { posKioskAdminApi, type PosKioskAdminItem } from './posKioskAdminApi';
import { SelfCheckoutSetupWizard, type SelfCheckoutSetupDraft } from './SelfCheckoutSetupWizard';

export function SelfCheckoutCreationFlow({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (kiosk: PosKioskAdminItem) => void;
}) {
  const { copy } = usePointOfSaleKioskTranslations();
  const { products } = usePointOfSaleCatalogProducts();
  const discounts = useMemo(() => readStoredDiscountRules(), []);
  const [warehouses, setWarehouses] = useState<PosWarehouseSummary[]>([]);
  const [loadingScope, setLoadingScope] = useState(true);
  const [scopeError, setScopeError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    void posBackendApi.context()
      .then((context) => {
        if (!mounted) return;
        setWarehouses(context.warehouses.filter((warehouse) => (
          String(warehouse.status || 'active').toLowerCase() === 'active'
        )));
        setScopeError('');
      })
      .catch((error) => {
        if (!mounted) return;
        setScopeError(error instanceof Error ? error.message : copy.selfCheckoutFrame.scopeLoadError);
      })
      .finally(() => mounted && setLoadingScope(false));
    return () => { mounted = false; };
  }, [copy.selfCheckoutFrame.scopeLoadError]);

  const create = async (draft: SelfCheckoutSetupDraft) => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const kiosk = await posKioskAdminApi.createSelfCheckout(draft);
      onCreated(kiosk);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : copy.center.actionError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SelfCheckoutSetupWizard
      warehouses={warehouses}
      products={products}
      discounts={discounts}
      loadingScope={loadingScope}
      scopeError={scopeError}
      submitting={submitting}
      submitError={submitError}
      onClose={onClose}
      onComplete={(draft) => { void create(draft); }}
    />
  );
}
