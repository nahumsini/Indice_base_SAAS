import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import type { SalesContact } from '../../salesCrmContext';
import { contactModalActionClassNames } from '../constants/contactConstants';
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
  return (
    <SalesModalFrame
      open={Boolean(contact)}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
      title={copy.deleteTitle}
      description={contact ? copy.deleteConfirm(contact.contactPerson) : copy.deleteTitle}
      icon={<Trash2 className="h-5 w-5" />}
      contentClassName="w-[min(92vw,520px)]"
      bodyClassName="space-y-4 px-7 py-6"
      footerClassName="sm:justify-end"
      footer={(
        <>
          <Button
            type="button"
            variant="outline"
            className={contactModalActionClassNames.secondary}
            onClick={onCancel}
          >
            {copy.deleteCancel}
          </Button>
          <Button
            type="button"
            className={contactModalActionClassNames.primary}
            onClick={onConfirm}
          >
            {copy.deleteConfirmLabel}
          </Button>
        </>
      )}
    >
      <div className="rounded-2xl border border-[#FF6B5E]/20 bg-[#FF6B5E]/[0.04] p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FF6B5E]/20 bg-white text-[#B63B32]">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="break-words text-base font-black text-slate-950">{contact?.contactPerson}</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-600">{contact?.company}</p>
          </div>
        </div>
      </div>
    </SalesModalFrame>
  );
}
