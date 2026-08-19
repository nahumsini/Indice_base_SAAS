import { useEffect, useState } from 'react';
import { usePointOfSaleCatalogProducts } from '../../CommerceCore/usePointOfSaleCatalogProducts';
import type { DiscountRule } from '../shared/commercial/discounts';
import { listPublishedDiscountRules } from '../shared/commercial/discounts/services/discountRulesApi';
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
  const [discounts, setDiscounts] = useState<DiscountRule[]>([]);
  const [warehouses, setWarehouses] = useState<PosWarehouseSummary[]>([]);
  const [loadingScope, setLoadingScope] = useState(true);
  const [scopeError, setScopeError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    void posBackendApi.context()
      .then(async (context) => {
        if (!mounted) return;
        const activeWarehouses = context.warehouses.filter((warehouse) => (
          String(warehouse.status || 'active').toLowerCase() === 'active'
        ));
        setWarehouses(activeWarehouses);
        const lists = await Promise.all(activeWarehouses.map((warehouse) => listPublishedDiscountRules({
          channel: 'kiosk', currencyCode: context.currentOpenShift?.currencyCode ?? 'MXN',
          warehouseId: warehouse.id, unitId: warehouse.unitId, businessId: warehouse.businessId,
        })));
        if (!mounted) return;
        setDiscounts(Array.from(new Map(lists.flat().map((rule) => [rule.id, rule])).values()));
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
