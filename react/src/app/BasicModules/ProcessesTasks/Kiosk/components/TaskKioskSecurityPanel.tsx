import { History, KeyRound, Loader2, ShieldX, UserPlus, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import {
  processTaskKioskApi,
  type ProcessTaskKiosk,
  type ProcessTaskKioskAuditEvent,
  type ProcessTaskKioskGrant,
} from '../processTaskKioskApi';

interface TaskKioskSecurityPanelProps {
  kiosk: ProcessTaskKiosk;
  onClose: () => void;
}

type PanelTab = 'grants' | 'audit';

export function TaskKioskSecurityPanel({ kiosk, onClose }: TaskKioskSecurityPanelProps) {
  const [tab, setTab] = useState<PanelTab>('grants');
  const [grants, setGrants] = useState<ProcessTaskKioskGrant[]>([]);
  const [audit, setAudit] = useState<ProcessTaskKioskAuditEvent[]>([]);
  const [identityId, setIdentityId] = useState('');
  const [pendingRevokeId, setPendingRevokeId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextTab: PanelTab) => {
    setIsLoading(true);
    setError(null);
    try {
      if (nextTab === 'grants') {
        setGrants(await processTaskKioskApi.listGrants(kiosk.id));
      } else {
        setAudit(await processTaskKioskApi.listAudit(kiosk.id));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No fue posible cargar la seguridad del kiosko.');
    } finally {
      setIsLoading(false);
    }
  }, [kiosk.id]);

  useEffect(() => {
    void load(tab);
  }, [load, tab]);

  const handleGrant = async () => {
    const numericIdentityId = Number(identityId);
    if (!Number.isInteger(numericIdentityId) || numericIdentityId <= 0) {
      setError('Captura un ID de colaborador válido.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await processTaskKioskApi.grantEmployee(kiosk.id, numericIdentityId);
      setIdentityId('');
      await load('grants');
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : 'No fue posible conceder el acceso.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevoke = async (grantId: number) => {
    if (pendingRevokeId !== grantId) {
      setPendingRevokeId(grantId);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await processTaskKioskApi.revokeGrant(kiosk.id, grantId);
      setPendingRevokeId(null);
      await load('grants');
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : 'No fue posible revocar el acceso.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950" aria-label={`Seguridad de ${kiosk.name}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950 dark:text-white">Accesos y auditoría</p>
          <p className="mt-1 text-xs text-slate-500">El PIN es personal; este kiosko únicamente concede o revoca capacidades.</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar seguridad">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 flex gap-2" role="tablist" aria-label="Administración de seguridad">
        <Button type="button" size="sm" variant={tab === 'grants' ? 'default' : 'outline'} role="tab" aria-selected={tab === 'grants'} onClick={() => setTab('grants')}>
          <KeyRound className="h-4 w-4" />Accesos
        </Button>
        <Button type="button" size="sm" variant={tab === 'audit' ? 'default' : 'outline'} role="tab" aria-selected={tab === 'audit'} onClick={() => setTab('audit')}>
          <History className="h-4 w-4" />Auditoría
        </Button>
      </div>

      {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}
      {isLoading ? <p role="status" className="mt-5 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Cargando...</p> : null}

      {!isLoading && tab === 'grants' ? (
        <div className="mt-4 space-y-4" role="tabpanel">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              ID de colaborador
              <input
                inputMode="numeric"
                min="1"
                type="number"
                value={identityId}
                disabled={isSaving}
                onChange={(event) => setIdentityId(event.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                placeholder="Ej. 81"
              />
            </label>
            <Button type="button" className="self-end" disabled={isSaving || !identityId} onClick={() => void handleGrant()}>
              <UserPlus className="h-4 w-4" />Conceder
            </Button>
          </div>
          {grants.length ? (
            <div className="grid gap-2">
              {grants.map((grant) => (
                <div key={grant.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{grant.identity_type} #{grant.identity_id}</p>
                    <p className="mt-1 text-xs text-slate-500">{grant.capability_key === '*' ? 'Todas las capacidades habilitadas' : grant.capability_key} · {grant.source}</p>
                  </div>
                  {grant.status === 'ACTIVE' ? (
                    <Button type="button" size="sm" variant="outline" disabled={isSaving} className="text-red-600" onClick={() => void handleRevoke(grant.id)}>
                      <ShieldX className="h-4 w-4" />{pendingRevokeId === grant.id ? 'Confirmar revocación' : 'Revocar'}
                    </Button>
                  ) : <span className="text-xs font-medium text-slate-500">Revocado</span>}
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">No hay accesos registrados todavía.</p>}
        </div>
      ) : null}

      {!isLoading && tab === 'audit' ? (
        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto" role="tabpanel">
          {audit.length ? audit.map((event) => (
            <div key={event.event_id} className="rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{eventLabel(event.event_type)}</p>
                <span className="text-xs font-medium text-slate-500">{new Date(event.created_at).toLocaleString('es-MX')}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{event.outcome}{event.capability ? ` · ${event.capability}` : ''}{event.module_reference ? ` · Ref. ${event.module_reference}` : ''}</p>
            </div>
          )) : <p className="text-sm text-slate-500">Aún no hay eventos de auditoría para este kiosko.</p>}
        </div>
      ) : null}
    </section>
  );
}

function eventLabel(eventType: string) {
  return eventType
    .replace(/^KIOSK_/, '')
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}
