import { Building2, Copy, ExternalLink, Link2, MonitorSmartphone, Pencil, Plus, Radio, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '../../../components/ui/button';
import { IndiceModalFrame, IndiceModalSummary, IndiceModalValidation } from '../../../components/indice-modal';
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

const inputClassName = 'mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 shadow-none outline-none transition focus:border-[#F4C84A] focus:ring-2 focus:ring-[#F4C84A]/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const labelClassName = 'text-sm font-medium text-slate-700 dark:text-slate-200';

function createDefaultForm(): ProcessTaskKioskPayload {
  return { name: '', code: '', status: 'active', unit_id: null, business_id: null, metadata: { notes: '', kiosk_type: 'task_access' } };
}

function referenceFromName(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
}

function formFromKiosk(kiosk: ProcessTaskKiosk): ProcessTaskKioskPayload {
  return {
    name: kiosk.name,
    code: kiosk.code,
    status: kiosk.status,
    unit_id: kiosk.unit_id,
    business_id: kiosk.business_id,
    metadata: { ...(kiosk.metadata ?? {}), kiosk_type: 'task_access' },
  };
}

function kioskSaveErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (/unauthorized|401/i.test(message)) return 'La sesión expiró. Inicia sesión nuevamente e inténtalo de nuevo.';
  if (/forbidden|403/i.test(message)) return 'Tu sesión no tiene permiso para administrar kioskos de tareas.';
  return message || 'No fue posible guardar el kiosko. Revisa los campos obligatorios e inténtalo de nuevo.';
}

export function TaskKioskManagementModal({
  isOpen, isSaving, kiosks, unitOptions, businessOptions, onClose, onSave, onDelete, onCopy, onOpen,
}: TaskKioskManagementModalProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingKioskId, setEditingKioskId] = useState<number | undefined>();
  const [form, setForm] = useState<ProcessTaskKioskPayload>(() => createDefaultForm());
  const [editorError, setEditorError] = useState<string | null>(null);

  const activeCount = kiosks.filter((kiosk) => kiosk.status === 'active').length;
  const readyCount = kiosks.filter((kiosk) => Boolean(kiosk.public_access_token)).length;
  const availableBusinesses = useMemo(
    () => businessOptions.filter((business) => !form.unit_id || business.unitId === form.unit_id),
    [businessOptions, form.unit_id],
  );
  const selectedContext = useMemo(() => {
    if (form.business_id) {
      const name = availableBusinesses.find((business) => business.id === form.business_id)?.name ?? 'Negocio seleccionado';
      return `${name}. Cada colaborador seguirá viendo únicamente sus tareas abiertas asignadas.`;
    }
    if (form.unit_id) {
      const name = unitOptions.find((unit) => unit.id === form.unit_id)?.name ?? 'Unidad seleccionada';
      return `${name}. Cada colaborador seguirá viendo únicamente sus tareas abiertas asignadas.`;
    }
    return 'Toda la empresa. Cada colaborador verá únicamente sus tareas abiertas asignadas.';
  }, [availableBusinesses, form.business_id, form.unit_id, unitOptions]);

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingKioskId(undefined);
    setEditorError(null);
    setForm(createDefaultForm());
  };
  const handleStartCreate = () => {
    setEditingKioskId(undefined);
    setEditorError(null);
    setForm({ ...createDefaultForm(), name: 'Acceso de tareas en campo', code: `acceso-tareas-${Math.random().toString(36).slice(2, 7)}` });
    setIsEditorOpen(true);
  };
  const handleStartEdit = (kiosk: ProcessTaskKiosk) => {
    setEditingKioskId(kiosk.id);
    setEditorError(null);
    setForm(formFromKiosk(kiosk));
    setIsEditorOpen(true);
  };
  const handleNameChange = (name: string) => {
    setForm((current) => {
      const shouldSyncCode = !current.code || current.code === referenceFromName(current.name);
      return { ...current, name, code: shouldSyncCode ? referenceFromName(name) : current.code };
    });
  };
  const handleSubmit = async () => {
    const payload: ProcessTaskKioskPayload = {
      ...form,
      name: form.name.trim(),
      code: form.code.trim(),
      unit_id: form.unit_id ?? null,
      business_id: form.business_id ?? null,
      metadata: { ...(form.metadata ?? {}), kiosk_type: 'task_access' },
    };
    if (!payload.name || !payload.code) {
      setEditorError('El nombre y la referencia interna son obligatorios.');
      return;
    }
    setEditorError(null);
    try {
      await onSave(payload, editingKioskId);
      closeEditor();
    } catch (error) {
      setEditorError(kioskSaveErrorMessage(error));
    }
  };
  const handleClose = () => {
    closeEditor();
    onClose();
  };
  const canSave = Boolean(form.name.trim() && form.code.trim()) && !isSaving;

  return (
    <IndiceModalFrame
      busy={isSaving}
      closeLabel="Cerrar"
      contentClassName="sm:!max-w-5xl"
      description={isEditorOpen
        ? 'Configura el punto de acceso que utilizará el equipo para consultar y cerrar sus tareas asignadas.'
        : 'Administra accesos diarios para que el equipo cierre tareas asignadas desde celular.'}
      footer={isEditorOpen ? (
        <>
          <Button type="button" variant="outline" disabled={isSaving} onClick={closeEditor}>Cancelar</Button>
          <Button type="button" disabled={!canSave} onClick={() => void handleSubmit()}>
            <Save className="h-4 w-4" />
            {isSaving ? 'Guardando...' : editingKioskId ? 'Guardar cambios' : 'Crear kiosko'}
          </Button>
        </>
      ) : (
        <Button type="button" variant="outline" onClick={handleClose}>Cerrar</Button>
      )}
      footerSummary={isEditorOpen ? selectedContext : `${activeCount} activos · ${readyCount} enlaces listos`}
      icon={<MonitorSmartphone className="h-5 w-5" />}
      modalType="operational-workspace"
      onOpenChange={(nextOpen) => { if (!nextOpen) handleClose(); }}
      open={isOpen}
      title={isEditorOpen ? (editingKioskId ? 'Editar kiosko' : 'Crear kiosko') : 'Centro de kioskos de tareas'}
      tone="yellow"
    >
      {isEditorOpen ? (
        <div className="mx-auto grid w-full max-w-2xl gap-4">
          <IndiceModalValidation messages={editorError ? [editorError] : []} />
          <Field label="Nombre">
            <input value={form.name} placeholder="Kiosko de tareas de almacén" className={inputClassName} disabled={isSaving} onChange={(event) => handleNameChange(event.target.value)} />
          </Field>
          <Field label="Referencia interna">
            <input value={form.code} placeholder="kiosko-tareas-almacen" className={inputClassName} disabled={isSaving} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Unidad">
              <select value={form.unit_id ?? ''} className={inputClassName} disabled={isSaving} onChange={(event) => setForm((current) => ({ ...current, unit_id: event.target.value ? Number(event.target.value) : null, business_id: null }))}>
                <option value="">Todas las unidades</option>
                {unitOptions.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
              </select>
            </Field>
            <Field label="Negocio">
              <select value={form.business_id ?? ''} disabled={!form.unit_id || isSaving} className={inputClassName} onChange={(event) => setForm((current) => ({ ...current, business_id: event.target.value ? Number(event.target.value) : null }))}>
                <option value="">Todos los negocios</option>
                {availableBusinesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Estado">
            <select value={form.status} className={inputClassName} disabled={isSaving} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ProcessTaskKioskPayload['status'] }))}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </Field>
          <IndiceModalValidation tone="info" title="Visibilidad segura" messages={[selectedContext]} />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Cada kiosko abre una pantalla pública con PIN, sin exponer el ERP completo.</p>
            <Button type="button" className="bg-[#F8C842] text-[#222831] hover:bg-[#E7B82F]" onClick={handleStartCreate}><Plus className="h-4 w-4" />Crear kiosko</Button>
          </div>
          <IndiceModalSummary columns={3} items={[
            { label: 'Total de kioskos', value: kiosks.length, emphasized: true },
            { label: 'Activos', value: activeCount },
            { label: 'Enlaces listos', value: readyCount },
          ]} />
          {kiosks.length ? (
            <div className="grid gap-4">
              {kiosks.map((kiosk) => (
                <article key={kiosk.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F4C84A]/15 text-[#9A6B05]"><MonitorSmartphone className="h-5 w-5" /></span>
                        <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-950 dark:text-white">{kiosk.name}</h3><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">{kiosk.status === 'active' ? 'Activo' : 'Inactivo'}</span></div><p className="mt-1 text-sm text-slate-500">{kiosk.code}</p></div>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <ContextCard icon={<Building2 className="h-4 w-4" />} label="Contexto" value={kiosk.scope_label} />
                        <ContextCard icon={<ShieldCheck className="h-4 w-4" />} label="Visibilidad" value="Tareas abiertas asignadas al colaborador identificado." />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium"><span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5"><Link2 className="h-3.5 w-3.5" />{kiosk.public_access_token ? 'Enlace listo' : 'Enlace pendiente'}</span><span className="inline-flex items-center gap-2 rounded-full bg-[#F4C84A]/15 px-3 py-1.5 text-[#9A6B05]"><Radio className="h-3.5 w-3.5" />Acceso por PIN</span></div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" className="bg-[#F4C84A] text-slate-950 hover:bg-[#E5B835]" onClick={() => onOpen(kiosk)}><ExternalLink className="h-4 w-4" />Abrir</Button>
                      <Button type="button" variant="outline" onClick={() => onCopy(kiosk)}><Copy className="h-4 w-4" />Copiar</Button>
                      <Button type="button" variant="outline" onClick={() => handleStartEdit(kiosk)}><Pencil className="h-4 w-4" />Editar</Button>
                      <Button type="button" variant="outline" className="text-red-600" disabled={isSaving} onClick={() => onDelete(kiosk)}><Trash2 className="h-4 w-4" />Eliminar</Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900"><MonitorSmartphone className="mx-auto h-10 w-10 text-[#9A6B05]" /><p className="mt-4 font-medium">Aún no hay kioskos</p><p className="mt-2 text-sm text-slate-500">Crea un enlace para que el equipo cierre tareas asignadas desde campo.</p></div>
          )}
        </div>
      )}
    </IndiceModalFrame>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label className={labelClassName}>{label}{children}</label>;
}

function ContextCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center gap-2 text-xs font-medium text-slate-500">{icon}{label}</div><p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">{value}</p></div>;
}
