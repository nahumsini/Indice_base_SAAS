import { Copy, ExternalLink, Link2, MonitorSmartphone, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import type { ProcessBusinessOption, ProcessUnitOption } from '../Processes/types';
import type { ProcessTaskKiosk, ProcessTaskKioskPayload } from './processTaskKioskApi';

interface TaskKioskManagementModalProps {
  isOpen: boolean;
  isSaving: boolean;
  kiosks: ProcessTaskKiosk[];
  unitOptions: ProcessUnitOption[];
  businessOptions: ProcessBusinessOption[];
  onClose: () => void;
  onSave: (payload: ProcessTaskKioskPayload, kioskId?: number) => Promise<void> | void;
  onDelete: (kiosk: ProcessTaskKiosk) => Promise<void> | void;
  onCopy: (kiosk: ProcessTaskKiosk) => void;
  onOpen: (kiosk: ProcessTaskKiosk) => void;
}

const inputClassName =
  'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 shadow-sm outline-none transition focus:border-[#F4C84A] focus:ring-2 focus:ring-[#F4C84A]/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900';
const labelClassName = 'text-sm font-semibold text-slate-700 dark:text-slate-200';

function createDefaultForm(): ProcessTaskKioskPayload {
  return {
    name: '',
    code: '',
    status: 'active',
    unit_id: null,
    business_id: null,
    metadata: {
      notes: '',
      kiosk_type: 'task_access',
    },
  };
}

function referenceFromName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function formFromKiosk(kiosk: ProcessTaskKiosk): ProcessTaskKioskPayload {
  return {
    name: kiosk.name,
    code: kiosk.code,
    status: kiosk.status,
    unit_id: kiosk.unit_id,
    business_id: kiosk.business_id,
    metadata: {
      ...(kiosk.metadata ?? {}),
      kiosk_type: 'task_access',
    },
  };
}

export function TaskKioskManagementModal({
  isOpen,
  isSaving,
  kiosks,
  unitOptions,
  businessOptions,
  onClose,
  onSave,
  onDelete,
  onCopy,
  onOpen,
}: TaskKioskManagementModalProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingKioskId, setEditingKioskId] = useState<number | undefined>();
  const [form, setForm] = useState<ProcessTaskKioskPayload>(() => createDefaultForm());

  const activeCount = kiosks.filter((kiosk) => kiosk.status === 'active').length;
  const readyCount = kiosks.filter((kiosk) => Boolean(kiosk.public_access_token)).length;

  const availableBusinesses = useMemo(
    () => businessOptions.filter((business) => !form.unit_id || business.unitId === form.unit_id),
    [businessOptions, form.unit_id],
  );

  const selectedContext = useMemo(() => {
    if (form.business_id) {
      const businessName = availableBusinesses.find((business) => business.id === form.business_id)?.name ?? 'Selected business';
      return `${businessName} context. Workers still see their own assigned open tasks.`;
    }
    if (form.unit_id) {
      const unitName = unitOptions.find((unit) => unit.id === form.unit_id)?.name ?? 'Selected unit';
      return `${unitName} context. Workers still see their own assigned open tasks.`;
    }
    return 'Company-wide context. Workers see their own assigned open tasks.';
  }, [availableBusinesses, form.business_id, form.unit_id, unitOptions]);

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingKioskId(undefined);
    setForm(createDefaultForm());
  };

  const handleStartCreate = () => {
    setEditingKioskId(undefined);
    setForm({
      ...createDefaultForm(),
      name: 'Field task access',
      code: `field-task-access-${Math.random().toString(36).slice(2, 7)}`,
    });
    setIsEditorOpen(true);
  };

  const handleStartEdit = (kiosk: ProcessTaskKiosk) => {
    setEditingKioskId(kiosk.id);
    setForm(formFromKiosk(kiosk));
    setIsEditorOpen(true);
  };

  const handleNameChange = (name: string) => {
    const currentGeneratedReference = referenceFromName(form.name);
    const shouldSyncCode = !form.code || form.code === currentGeneratedReference;
    setForm((current) => ({
      ...current,
      name,
      code: shouldSyncCode ? referenceFromName(name) : current.code,
    }));
  };

  const handleSubmit = async () => {
    try {
      await onSave(form, editingKioskId);
      closeEditor();
    } catch {
      // The parent view owns the visible error message.
    }
  };

  const handleClose = () => {
    closeEditor();
    onClose();
  };

  const canSave = form.name.trim().length > 0 && form.code.trim().length > 0 && !isSaving;

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            handleClose();
          }
        }}
      >
        <DialogContent
          hideCloseButton
          className="max-h-[88vh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-0 text-slate-950 shadow-[0_30px_80px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:max-w-5xl"
        >
          <div className="bg-[#F4C84A] px-6 py-4 text-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/25">
                  <MonitorSmartphone className="h-5 w-5" />
                </span>
                <DialogHeader className="gap-1 text-left">
                  <DialogTitle className="text-xl font-bold text-slate-950">Task kiosks</DialogTitle>
                  <DialogDescription className="text-sm font-medium text-slate-800/80">
                    Manage quick access points workers use to complete assigned tasks with their PIN.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  className="h-10 gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800"
                  onClick={handleStartCreate}
                >
                  <Plus className="h-4 w-4" />
                  New kiosk
                </Button>
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#9A6B05]/25 bg-white/35 text-slate-950 transition hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-[#9A6B05]/40"
                  aria-label="Close task kiosks"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto bg-slate-50/70 px-6 py-5 dark:bg-slate-950">
            <section className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950/60">
                <p className="text-2xl font-bold text-slate-950 dark:text-white">{kiosks.length}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Total kiosks</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950/60">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-300">{activeCount}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Active</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950/60">
                <p className="text-2xl font-bold text-[#9A6B05] dark:text-[#FEF3C7]">{readyCount}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Links ready</p>
              </div>
            </section>

            <section className="mt-5">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-950 dark:text-white">Configured kiosks</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Each kiosk opens a public task execution flow for identified workers.
                  </p>
                </div>
                <Button type="button" variant="outline" className="w-fit gap-2 rounded-xl bg-white" onClick={handleStartCreate}>
                  <Plus className="h-4 w-4" />
                  Create kiosk
                </Button>
              </div>

              {kiosks.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {kiosks.map((kiosk) => (
                    <article
                      key={kiosk.id}
                      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-[#F4C84A]/50 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="truncate text-base font-bold text-slate-950 dark:text-white">{kiosk.name}</h4>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${kiosk.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                              {kiosk.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{kiosk.scope_label}</p>
                        </div>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F4C84A]/15 text-[#9A6B05] dark:text-[#FEF3C7]">
                          <MonitorSmartphone className="h-5 w-5" />
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">{kiosk.code}</span>
                        <span className="rounded-full bg-[#F4C84A]/12 px-2.5 py-1 text-[#9A6B05] dark:text-[#FEF3C7]">
                          {kiosk.public_access_token ? 'Link ready' : 'No link'}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Button type="button" size="sm" className="gap-2 bg-[#F4C84A] text-slate-950 hover:bg-[#E5B835]" onClick={() => onOpen(kiosk)}>
                          <ExternalLink className="h-4 w-4" />
                          Open
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => onCopy(kiosk)}>
                          <Copy className="h-4 w-4" />
                          Copy link
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => handleStartEdit(kiosk)}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button type="button" size="sm" variant="outline" className="gap-2 text-red-600 hover:text-red-700" disabled={isSaving} onClick={() => onDelete(kiosk)}>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/40">
                  <MonitorSmartphone className="mx-auto h-11 w-11 text-[#9A6B05] dark:text-[#FEF3C7]" />
                  <p className="mt-4 text-base font-bold text-slate-950 dark:text-white">No kiosks yet</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                    Create a kiosk link so field workers can complete assigned tasks without starting a full session.
                  </p>
                  <Button type="button" className="mt-5 gap-2 bg-[#F4C84A] text-slate-950 hover:bg-[#E5B835]" onClick={handleStartCreate}>
                    <Plus className="h-4 w-4" />
                    Create kiosk
                  </Button>
                </div>
              )}
            </section>
          </div>

          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="mr-auto text-sm font-medium text-slate-600 dark:text-slate-300">
              Kiosk visibility follows the identified worker and their assigned open tasks.
            </p>
            <Button type="button" variant="outline" className="rounded-xl border-slate-200 bg-white text-[#9A6B05] hover:bg-[#F4C84A] hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800" onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isOpen && isEditorOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeEditor();
          }
        }}
      >
        <DialogContent className="rounded-[28px] border border-slate-200 bg-white p-0 text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.2)] dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:max-w-xl">
          <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl font-bold text-slate-950 dark:text-white">
                {editingKioskId ? 'Edit kiosk' : 'Create kiosk'}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
                Configure the access point workers will use to open their assigned tasks.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-4 px-6 py-5">
            <div>
              <label className={labelClassName}>Name</label>
              <input
                value={form.name}
                placeholder="Warehouse task kiosk"
                className={inputClassName}
                onChange={(event) => handleNameChange(event.target.value)}
              />
            </div>
            <div>
              <label className={labelClassName}>Internal reference</label>
              <input
                value={form.code}
                placeholder="warehouse-task-kiosk"
                className={inputClassName}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              />
            </div>
            <div>
              <label className={labelClassName}>Operational context</label>
              <select
                value={form.unit_id ?? ''}
                className={inputClassName}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  unit_id: event.target.value ? Number(event.target.value) : null,
                  business_id: null,
                }))}
              >
                <option value="">All units</option>
                {unitOptions.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClassName}>Business context</label>
              <select
                value={form.business_id ?? ''}
                disabled={!form.unit_id}
                className={inputClassName}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  business_id: event.target.value ? Number(event.target.value) : null,
                }))}
              >
                <option value="">All businesses</option>
                {availableBusinesses.map((business) => (
                  <option key={business.id} value={business.id}>{business.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClassName}>Status</label>
              <select
                value={form.status}
                className={inputClassName}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  status: event.target.value as ProcessTaskKioskPayload['status'],
                }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="rounded-2xl border border-[#F4C84A]/25 bg-[#F4C84A]/10 p-4 text-sm text-[#9A6B05] dark:border-[#F4C84A]/30 dark:bg-[#F4C84A]/15 dark:text-[#FEF3C7]">
              <div className="flex items-start gap-3">
                <Link2 className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-bold">Task visibility follows the identified worker</p>
                  <p className="mt-1">{selectedContext}</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
            <Button type="button" variant="outline" className="rounded-xl" onClick={closeEditor}>
              Cancel
            </Button>
            <Button
              type="button"
              className="gap-2 rounded-xl bg-[#F4C84A] text-slate-950 hover:bg-[#E5B835]"
              disabled={!canSave}
              onClick={() => void handleSubmit()}
            >
              <Save className="h-4 w-4" />
              {editingKioskId ? 'Save kiosk' : 'Create kiosk'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
