import { Check, LockKeyhole, MonitorSmartphone } from 'lucide-react';
import type { ConfigCenterEmployeeKiosk } from '../../../api/configCenter';
import { routeForBackendSlug } from '../../../config/moduleCatalog';
import { cn } from '../../../components/ui/utils';
import type { UsersTranslations } from './usersTranslations';

interface Props {
  kiosks: ConfigCenterEmployeeKiosk[];
  selectedIds: number[];
  selectedModuleIds: string[];
  unitId: number | null;
  businessId: number | null;
  onChange: (ids: number[]) => void;
  copy: UsersTranslations['kioskPermissions'];
}

const scopeAllows = (
  kiosk: ConfigCenterEmployeeKiosk,
  unitId: number | null,
  businessId: number | null,
) => {
  if (unitId == null && businessId == null) return true;
  if (kiosk.unit_id != null && kiosk.unit_id !== unitId) return false;
  if (businessId != null && kiosk.business_id != null && kiosk.business_id !== businessId) return false;
  return true;
};

export function UsersKioskPermissionPicker({
  kiosks,
  selectedIds,
  selectedModuleIds,
  unitId,
  businessId,
  onChange,
  copy,
}: Props) {
  const selected = new Set(selectedIds);
  const moduleIds = new Set(selectedModuleIds);
  const rows = kiosks.map(kiosk => {
    const route = routeForBackendSlug(kiosk.module_slug);
    const moduleAllowed = Boolean(route && moduleIds.has(route));
    return {
      kiosk,
      allowed: moduleAllowed && scopeAllows(kiosk, unitId, businessId),
    };
  });

  const toggle = (id: number, allowed: boolean) => {
    if (!allowed) return;
    onChange(selected.has(id)
      ? selectedIds.filter(candidate => candidate !== id)
      : [...selectedIds, id]);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50"><MonitorSmartphone className="h-4 w-4" /></div>
          <div>
            <h3 className="text-sm font-medium text-slate-950 dark:text-white">{copy.title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">{copy.description}</p>
          </div>
        </div>
        <span className="self-start rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{copy.assigned(selectedIds.length)}</span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-5 text-center text-xs text-slate-500">{copy.empty}</p>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {rows.map(({ kiosk, allowed }) => {
            const active = selected.has(kiosk.id) && allowed;
            const scope = kiosk.business_name || kiosk.unit_name || copy.companyWide;
            return (
              <button
                key={kiosk.id}
                type="button"
                disabled={!allowed}
                onClick={() => toggle(kiosk.id, allowed)}
                className={cn(
                  'flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left transition',
                  active
                    ? 'border-blue-300 bg-blue-50/80 text-blue-950 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-100'
                    : allowed
                      ? 'border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
                      : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400 opacity-65 dark:border-slate-800 dark:bg-slate-900/40',
                )}
              >
                <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg border', active ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-400')}>
                  {active ? <Check className="h-4 w-4" /> : allowed ? <MonitorSmartphone className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{kiosk.name}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{scope}</span></span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
