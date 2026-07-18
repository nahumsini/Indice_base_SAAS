import { ConfirmDeleteDialog } from '../../../../components/ConfirmDeleteDialog';
import type { SalesOpportunity } from '../../salesCrmContext';
import type { ProspectosCopy } from '../translations';

export function OpportunityDeleteDialog({
  copy,
  description,
  opportunity,
  onCancel,
  onConfirm,
}: {
  copy: ProspectosCopy['deleteConfirm'];
  description?: string;
  opportunity: SalesOpportunity | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const itemName = opportunity
    ? [opportunity.opportunityName, opportunity.company].filter(Boolean).join(' · ')
    : undefined;

  return (
    <ConfirmDeleteDialog
      isVisible={Boolean(opportunity)}
      title={copy.title}
      description={description ?? copy.title}
      itemName={itemName}
      cancelLabel={copy.cancel}
      confirmLabel={copy.confirm}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
