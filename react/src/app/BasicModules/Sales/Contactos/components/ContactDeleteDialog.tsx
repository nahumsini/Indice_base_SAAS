import { ConfirmDeleteDialog } from '../../../../components/ConfirmDeleteDialog';
import type { SalesContact } from '../../salesCrmContext';
import type { ContactCopy } from '../translations';

export function ContactDeleteDialog({
  copy,
  contact,
  onCancel,
  onConfirm,
}: {
  copy: ContactCopy['actions'];
  contact: SalesContact | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const itemName = contact
    ? [contact.contactPerson, contact.company].filter(Boolean).join(' · ')
    : undefined;

  return (
    <ConfirmDeleteDialog
      isVisible={Boolean(contact)}
      title={copy.deleteTitle}
      description={contact ? copy.deleteConfirm(contact.contactPerson) : copy.deleteTitle}
      itemName={itemName}
      cancelLabel={copy.deleteCancel}
      confirmLabel={copy.deleteConfirmLabel}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
