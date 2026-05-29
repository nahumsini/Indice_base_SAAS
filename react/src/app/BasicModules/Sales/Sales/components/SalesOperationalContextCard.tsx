import type { SalesRecordsTranslations } from '../translations';
import type { SalesOperationalContext } from '../types/salesTypes';
import { DetailField, SectionCard } from './SalesModalPrimitives';

export function SalesOperationalContextCard({
  context,
  t,
}: {
  context: SalesOperationalContext;
  t: SalesRecordsTranslations;
}) {
  return (
    <SectionCard title={t.modal.sections.operationalContext} description={t.modal.operationalContext.helper}>
      <section className="grid gap-3 md:grid-cols-2">
        <DetailField label={t.modal.operationalContext.legalName} value={context.legalName} />
        <DetailField label={t.modal.operationalContext.taxIdentifier} value={context.taxIdentifier} />
        <DetailField label={t.modal.operationalContext.fiscalAddress} value={context.fiscalAddress} />
        <DetailField label={t.modal.operationalContext.defaultWarehouse} value={context.defaultWarehouse} />
        <DetailField label={t.modal.fields.currency} value={context.currency} />
      </section>
    </SectionCard>
  );
}
