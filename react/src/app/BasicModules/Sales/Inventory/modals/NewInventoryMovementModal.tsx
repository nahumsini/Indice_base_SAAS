import { useEffect, useMemo, useState } from 'react';
import { PackagePlus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import { getSalesModalActionClassNames, SalesModalFrame } from '../../components/SalesModalFrame';
import type {
  InventoryLocation,
  InventoryMovementDraft,
  InventoryMovementType,
  InventoryStockItem,
} from '../types/inventoryTypes';
import type { InventoryTranslations } from '../translations';

const emptyMovementDraft: InventoryMovementDraft = {
  movementType: 'stockIn',
  productId: '',
  sourceLocationId: '',
  destinationLocationId: '',
  quantity: '',
  unitCost: '',
  reason: '',
  notes: '',
  movementDate: new Date().toISOString().slice(0, 10),
  responsibleUserId: '',
  responsibleName: '',
};

const movementActionClassNames = getSalesModalActionClassNames('coral');

function FieldLabel({ children }: { children: string }) {
  return <label className="text-sm font-bold text-slate-700">{children}</label>;
}

export function NewInventoryMovementModal({
  open,
  items,
  locations,
  initialItem,
  initialMovementType,
  t,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  items: InventoryStockItem[];
  locations: InventoryLocation[];
  initialItem?: InventoryStockItem | null;
  initialMovementType?: InventoryMovementType;
  t: InventoryTranslations;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: InventoryMovementDraft) => void;
}) {
  const [draft, setDraft] = useState<InventoryMovementDraft>(emptyMovementDraft);
  const [errors, setErrors] = useState<string[]>([]);
  const selectedItem = useMemo(() => items.find((item) => item.productId === draft.productId), [draft.productId, items]);

  useEffect(() => {
    if (!open) return;

    setDraft({
      ...emptyMovementDraft,
      movementType: initialMovementType ?? 'stockIn',
      productId: initialItem?.productId ?? '',
      sourceLocationId: initialItem?.locationId ?? '',
      destinationLocationId: initialMovementType === 'transfer' ? '' : initialItem?.locationId ?? '',
      responsibleName: 'Nahum Pena',
    });
    setErrors([]);
  }, [initialItem, initialMovementType, open]);

  const validate = () => {
    const nextErrors: string[] = [];
    const quantity = Number(draft.quantity);

    if (!draft.productId) nextErrors.push(t.modal.validation.item);
    if (!Number.isFinite(quantity) || quantity <= 0) nextErrors.push(t.modal.validation.quantity);
    if ((draft.movementType === 'stockOut' || draft.movementType === 'transfer') && !draft.sourceLocationId) {
      nextErrors.push(t.modal.validation.source);
    }
    if ((draft.movementType === 'stockIn' || draft.movementType === 'transfer') && !draft.destinationLocationId) {
      nextErrors.push(t.modal.validation.destination);
    }
    if (draft.movementType === 'adjustment' && !draft.reason.trim()) nextErrors.push(t.modal.validation.reason);

    setErrors(nextErrors);
    return nextErrors.length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit(draft);
  };

  return (
    <SalesModalFrame
      open={open}
      onOpenChange={onOpenChange}
      title={t.modal.title}
      description={t.modal.subtitle}
      icon={<PackagePlus className="h-6 w-6" />}
      contentClassName="flex max-h-[92vh] max-w-4xl flex-col"
      bodyClassName="!max-h-none flex-1 overflow-y-auto bg-slate-50/70 p-6"
      footer={(
        <>
          <Button variant="outline" className={movementActionClassNames.secondary} onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button className={movementActionClassNames.primary} onClick={handleSubmit}>
            {t.modal.submit}
          </Button>
        </>
      )}
    >
          <div className="mb-5 rounded-lg border border-[#F4C84A]/30 bg-[#F4C84A]/10 px-4 py-3 text-sm font-semibold text-slate-700">
            {t.modal.helper}
          </div>

          {errors.length > 0 ? (
            <div className="mb-5 rounded-lg border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 px-4 py-3 text-sm font-semibold text-[#B63B32]">
              {errors.map((error) => <p key={error}>{error}</p>)}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel>{t.modal.movementType}</FieldLabel>
              <Select value={draft.movementType} onValueChange={(value) => setDraft({ ...draft, movementType: value as InventoryMovementType })}>
                <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white px-4 text-base font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['stockIn', 'stockOut', 'adjustment', 'transfer'] as InventoryMovementType[]).map((type) => (
                    <SelectItem key={type} value={type}>{t.movementTypes[type]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <FieldLabel>{t.modal.item}</FieldLabel>
              <Select value={draft.productId || 'none'} onValueChange={(value) => setDraft({ ...draft, productId: value === 'none' ? '' : value })}>
                <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white px-4 text-base font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.common.none}</SelectItem>
                  {items.map((item) => (
                    <SelectItem key={item.productId} value={item.productId}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <FieldLabel>{t.modal.sourceLocation}</FieldLabel>
              <Select value={draft.sourceLocationId || 'none'} onValueChange={(value) => setDraft({ ...draft, sourceLocationId: value === 'none' ? '' : value })}>
                <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white px-4 text-base font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.common.none}</SelectItem>
                  {locations.map((location) => <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <FieldLabel>{t.modal.destinationLocation}</FieldLabel>
              <Select value={draft.destinationLocationId || 'none'} onValueChange={(value) => setDraft({ ...draft, destinationLocationId: value === 'none' ? '' : value })}>
                <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white px-4 text-base font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.common.none}</SelectItem>
                  {locations.map((location) => <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <FieldLabel>{t.modal.quantity}</FieldLabel>
              <Input value={draft.quantity} type="number" min="0" onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} className="h-11 rounded-lg border-slate-200" />
            </div>

            <div className="space-y-2">
              <FieldLabel>{t.modal.unitCost}</FieldLabel>
              <Input value={draft.unitCost} type="number" min="0" onChange={(event) => setDraft({ ...draft, unitCost: event.target.value })} className="h-11 rounded-lg border-slate-200" />
            </div>

            <div className="space-y-2">
              <FieldLabel>{t.modal.movementDate}</FieldLabel>
              <Input value={draft.movementDate} type="date" onChange={(event) => setDraft({ ...draft, movementDate: event.target.value })} className="h-11 rounded-lg border-slate-200" />
            </div>

            <div className="space-y-2">
              <FieldLabel>{t.modal.responsible}</FieldLabel>
              <Input value={draft.responsibleName} onChange={(event) => setDraft({ ...draft, responsibleName: event.target.value })} className="h-11 rounded-lg border-slate-200" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <FieldLabel>{t.modal.reason}</FieldLabel>
              <Input value={draft.reason} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} className="h-11 rounded-lg border-slate-200" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <FieldLabel>{t.modal.notes}</FieldLabel>
              <Textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className="min-h-24 rounded-lg border-slate-200" />
            </div>
          </div>

          {selectedItem ? (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
              {selectedItem.name} · {selectedItem.locationName} · {selectedItem.availableStock} {selectedItem.unit}
            </p>
          ) : null}
    </SalesModalFrame>
  );
}
