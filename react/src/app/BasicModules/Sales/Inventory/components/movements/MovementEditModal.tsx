import { useEffect, useState, type ReactNode } from 'react';
import { Pencil, X } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../../../components/ui/dialog';
import { Input } from '../../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../../components/ui/select';
import { Textarea } from '../../../../../components/ui/textarea';
import type { InventoryOperationalMovement } from '../../types/inventoryTypes';
import type { InventoryTranslations } from '../../translations';

type MovementEditDraft = Pick<InventoryOperationalMovement, 'movementDate' | 'reference' | 'reason' | 'responsibleName' | 'status'>;

const editableStatuses: InventoryOperationalMovement['status'][] = ['draft', 'inTransit', 'received', 'completed', 'cancelled'];

export function MovementEditModal({
  movement,
  t,
  onClose,
  onSave,
}: {
  movement: InventoryOperationalMovement | null;
  t: InventoryTranslations;
  onClose: () => void;
  onSave: (movementId: string, patch: MovementEditDraft) => void;
}) {
  const [draft, setDraft] = useState<MovementEditDraft>({
    movementDate: '',
    reference: '',
    reason: '',
    responsibleName: '',
    status: 'draft',
  });

  useEffect(() => {
    if (!movement) return;
    setDraft({
      movementDate: movement.movementDate,
      reference: movement.reference ?? '',
      reason: movement.reason,
      responsibleName: movement.responsibleName,
      status: movement.status,
    });
  }, [movement]);

  if (!movement) return null;

  return (
    <Dialog open={Boolean(movement)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] sm:max-w-[680px] [&>button]:hidden">
        <DialogHeader className="bg-[#FF6B5E] px-6 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/15">
                <Pencil className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-xl font-bold text-white">{t.operational.modals.editMovementTitle}</DialogTitle>
                <DialogDescription className="mt-1 text-sm font-medium leading-5 text-white/80">{t.operational.modals.editMovementSubtitle}</DialogDescription>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-2xl border border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid gap-4 bg-slate-50/70 px-6 py-5 md:grid-cols-2">
          <ReadOnlyField label={t.operational.columns.movement} value={movement.movementNumber ?? movement.id} />
          <SelectField label={t.operational.columns.status} value={draft.status} options={editableStatuses.map((status) => ({ value: status, label: t.operational.movementStatuses[status] }))} onValueChange={(status) => setDraft({ ...draft, status: status as MovementEditDraft['status'] })} />
          <InputField label={t.operational.columns.responsible} value={draft.responsibleName} onChange={(responsibleName) => setDraft({ ...draft, responsibleName })} />
          <InputField label={t.operational.columns.reference} value={draft.reference ?? ''} onChange={(reference) => setDraft({ ...draft, reference })} />
          <InputField label={t.operational.columns.date} type="date" value={draft.movementDate} onChange={(movementDate) => setDraft({ ...draft, movementDate })} />
          <label className="grid gap-2 md:col-span-2">
            <FieldLabel>{t.operational.columns.reason}</FieldLabel>
            <Textarea value={draft.reason} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} className="min-h-24 rounded-xl border-slate-200 bg-white text-sm font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20" />
          </label>
        </div>

        <DialogFooter className="bg-[#FF6B5E] px-6 py-4">
          <Button type="button" variant="outline" className="h-10 rounded-xl border-white/40 bg-transparent px-4 font-semibold text-white hover:bg-white/10 hover:text-white" onClick={onClose}>{t.common.cancel}</Button>
          <Button type="button" className="h-10 rounded-xl bg-white px-4 font-bold text-[#B63B32] shadow-sm hover:bg-white/90" onClick={() => onSave(movement.id, draft)}>{t.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InputField({ label, value, type = 'text', onChange }: { label: string; value: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2">
      <FieldLabel>{label}</FieldLabel>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border-slate-200 bg-white text-sm font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20" />
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-2">
      <FieldLabel>{label}</FieldLabel>
      <span className="flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">{value}</span>
    </label>
  );
}

function SelectField({ label, value, options, onValueChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onValueChange: (value: string) => void }) {
  return (
    <label className="grid gap-2">
      <FieldLabel>{label}</FieldLabel>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-sm font-semibold shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </label>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{children}</span>;
}
