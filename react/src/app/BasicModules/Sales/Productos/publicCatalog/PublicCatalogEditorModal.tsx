import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Globe2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { IndiceModalValidation, IndiceModalWizardStepper, type IndiceModalWizardStep } from '../../../../components/indice-modal';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { SalesCatalogItem } from '../../types';
import type { ProductsTranslations } from '../translations';
import { PublicCatalogEditor, type PublicCatalogEditorStep } from './PublicCatalogEditor';
import type { PublicCatalogConfig } from './types/publicCatalogTypes';
import { getPublicCatalogExperienceStyle } from './utils/publicCatalogExperience';

type PublicCatalogEditorMode = 'create' | 'edit';
const editorActionClassNames = getSalesModalActionClassNames('coral');

type PublicCatalogEditorModalProps = {
  catalog: PublicCatalogConfig | null;
  mode: PublicCatalogEditorMode | null;
  products: SalesCatalogItem[];
  units: Array<{ id: number; name: string }>;
  businesses: Array<{ id: number; unitId: number; name: string }>;
  t: ProductsTranslations;
  saving?: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onChange: (patch: Partial<PublicCatalogConfig>) => void;
  onSave: () => void;
};

export function PublicCatalogEditorModal({
  catalog,
  mode,
  products,
  units,
  businesses,
  t,
  saving = false,
  error = '',
  onOpenChange,
  onChange,
  onSave,
}: PublicCatalogEditorModalProps) {
  const [activeStep, setActiveStep] = useState<PublicCatalogEditorStep>('identity');
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const title = mode === 'create'
    ? t.publicCatalog.createPublicCatalog
    : t.publicCatalog.editPublicCatalog;
  const steps = useMemo<IndiceModalWizardStep<PublicCatalogEditorStep>[]>(() => [
    { id: 'identity', label: t.publicCatalog.wizard.steps.identity },
    { id: 'appearance', label: t.publicCatalog.wizard.steps.appearance },
    { id: 'features', label: t.publicCatalog.wizard.steps.features },
    { id: 'products', label: t.publicCatalog.wizard.steps.products },
  ], [t]);
  const activeIndex = Math.max(0, steps.findIndex((step) => step.id === activeStep));
  const currentDescription = t.publicCatalog.wizard.descriptions[activeStep];

  useEffect(() => {
    if (catalog) {
      setActiveStep('identity');
      setValidationMessages([]);
    }
  }, [catalog?.id, mode]);

  const identityErrors = () => {
    if (!catalog) return [t.publicCatalog.requiredIdentityError];
    const messages: string[] = [];
    if (!catalog.unitId || !catalog.businessId) messages.push(t.publicCatalog.requiredScopeError);
    if (!catalog.title.trim()) messages.push(t.publicCatalog.requiredIdentityError);
    if (!catalog.contactCtaLabel.trim()) messages.push(t.publicCatalog.requiredCtaError);
    const contact = catalog.contactValue.trim();
    const validContact = catalog.contactMethod === 'email'
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)
      : catalog.contactMethod === 'website'
        ? /^https?:\/\/[^\s.]+(?:\.[^\s.]+)+/i.test(/^https?:\/\//i.test(contact) ? contact : `https://${contact}`)
        : contact.replace(/\D/g, '').length >= 8 && contact.replace(/\D/g, '').length <= 15;
    if (!validContact) messages.push(t.publicCatalog.contactInputs[catalog.contactMethod].error);
    return messages;
  };

  const handleContinue = () => {
    if (activeStep === 'identity') {
      const messages = identityErrors();
      if (messages.length) {
        setValidationMessages(messages);
        return;
      }
    }
    setValidationMessages([]);
    setActiveStep(steps[Math.min(activeIndex + 1, steps.length - 1)].id);
  };

  const handleBack = () => {
    setValidationMessages([]);
    setActiveStep(steps[Math.max(activeIndex - 1, 0)].id);
  };

  return (
    <SalesModalFrame
      open={Boolean(catalog)}
      onOpenChange={onOpenChange}
      title={title}
      eyebrow={t.publicCatalog.wizard.stepCounter(activeIndex + 1, steps.length)}
      description={currentDescription}
      icon={<Globe2 className="h-6 w-6" />}
      modalType="wizard"
      busy={saving}
      contentClassName="flex h-[min(92dvh,940px)] w-[calc(100vw-2rem)] flex-col"
      bodyClassName="!max-h-none min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-slate-50/80 p-4 sm:p-5"
      footerLeading={(
        <Button type="button" variant="outline" className={editorActionClassNames.secondary} disabled={saving} onClick={() => onOpenChange(false)}>
          {t.common.cancel}
        </Button>
      )}
      footerSummary={catalog ? <span className="font-medium text-[#222831]">{catalog.title || t.publicCatalog.defaultTitle} · {t.publicCatalog.selectedProducts(catalog.selectedProductIds.length)}</span> : undefined}
      footer={(
        <>
          {activeIndex > 0 ? (
            <Button type="button" variant="outline" className={editorActionClassNames.secondary} disabled={saving} onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" /> {t.publicCatalog.wizard.back}
            </Button>
          ) : null}
          {activeStep === 'products' ? (
            <Button type="button" className={editorActionClassNames.primary} disabled={!catalog || saving} onClick={onSave}>
              {saving ? t.publicCatalog.saving : <><Check className="h-4 w-4" /> {t.publicCatalog.saveCatalog}</>}
            </Button>
          ) : (
            <Button type="button" className={editorActionClassNames.primary} disabled={!catalog || saving} onClick={handleContinue}>
              {t.publicCatalog.wizard.next} <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </>
      )}
    >
        <div className="min-h-full space-y-4" style={catalog ? getPublicCatalogExperienceStyle(catalog) : undefined}>
          <IndiceModalWizardStepper accent="coral" activeStepId={activeStep} progressLabel={t.publicCatalog.wizard.progressLabel} steps={steps} />
          <IndiceModalValidation messages={[...validationMessages, ...(error ? [error] : [])]} />
          <PublicCatalogEditor
            catalog={catalog}
            products={products}
            units={units}
            businesses={businesses}
            t={t}
            step={activeStep}
            onChange={onChange}
          />
        </div>
    </SalesModalFrame>
  );
}
