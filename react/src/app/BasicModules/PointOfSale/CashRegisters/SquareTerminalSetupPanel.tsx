import { useCallback, useEffect, useMemo, useState } from 'react';
import { Cable, CreditCard, Loader2, MapPin, Monitor, Power, RefreshCw, RotateCcw, Unplug } from 'lucide-react';
import { posBackendApi, type PosCashRegisterResponse, type PosSquareLocationResponse, type PosSquareTerminalResponse, type PosSquareTerminalStatusResponse } from '../Sale/services/posBackendApi';
import { SquareSetupStep, squareButtonClass, squareSelectClass } from './SquareTerminalSetupStep';

interface SquareTerminalSetupPanelProps {
  registers: PosCashRegisterResponse[];
  canManage: boolean;
}

export function SquareTerminalSetupPanel({ registers, canManage }: SquareTerminalSetupPanelProps) {
  const [status, setStatus] = useState<PosSquareTerminalStatusResponse | null>(null);
  const [locations, setLocations] = useState<PosSquareLocationResponse[]>([]);
  const [terminals, setTerminals] = useState<PosSquareTerminalResponse[]>([]);
  const [locationId, setLocationId] = useState('');
  const [terminalId, setTerminalId] = useState('');
  const [registerId, setRegisterId] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const activeRegisters = useMemo(() => (
    registers.filter((register) => register.active && register.status === 'ACTIVE')
  ), [registers]);

  const load = useCallback(async () => {
    setLoading(true); setNotice('');
    try {
      const nextStatus = await posBackendApi.squareStatus();
      setStatus(nextStatus);
      if (!nextStatus.enabled) {
        setLocations([]); setTerminals([]); return;
      }
      const [locationResult, terminalResult] = await Promise.allSettled([
        posBackendApi.squareLocations(),
        posBackendApi.squareTerminals(),
      ]);
      if (locationResult.status === 'fulfilled') setLocations(locationResult.value.items);
      if (terminalResult.status === 'fulfilled') setTerminals(terminalResult.value.items);
      if (locationResult.status === 'rejected') setNotice('Connect Square before linking a location.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Square Terminal status could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!locationId && locations[0]) setLocationId(locations[0].id); }, [locationId, locations]);
  useEffect(() => { if (!terminalId && terminals[0]) setTerminalId(String(terminals[0].terminalId)); }, [terminalId, terminals]);
  useEffect(() => { if (!registerId && activeRegisters[0]) setRegisterId(String(activeRegisters[0].id)); }, [activeRegisters, registerId]);

  const connectSquare = async () => {
    setBusy(true); setNotice('');
    try {
      const response = await posBackendApi.startSquareOAuth();
      window.location.assign(response.authorizationUrl);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Square authorization could not be started.');
      setBusy(false);
    }
  };

  const linkLocation = async () => {
    if (!locationId) return;
    setBusy(true); setNotice('');
    try {
      await posBackendApi.linkSquareLocation(locationId);
      setNotice('Square location linked.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Square location could not be linked.');
    } finally {
      setBusy(false);
    }
  };

  const pairTerminal = async () => {
    if (!locationId) return;
    setBusy(true); setNotice('');
    try {
      const response = await posBackendApi.pairSquareTerminal(locationId, 'Indice POS Terminal');
      setPairingCode(response.pairingCode);
      setNotice('Enter this code on the Square Terminal device.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Square terminal pairing could not be created.');
    } finally {
      setBusy(false);
    }
  };

  const assignTerminal = async () => {
    if (!registerId || !terminalId) return;
    setBusy(true); setNotice('');
    try {
      await posBackendApi.assignSquareTerminal(registerId, terminalId);
      setNotice('Square terminal assigned to register.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Square terminal could not be assigned.');
    } finally {
      setBusy(false);
    }
  };

  const refreshPairingCode = async () => {
    if (!terminalId) return;
    setBusy(true); setNotice('');
    try {
      const response = await posBackendApi.refreshSquareTerminalPairingCode(terminalId);
      setPairingCode(response.pairingCode);
      setNotice('Enter this refreshed code on the Square Terminal device.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Square terminal pairing code could not be refreshed.');
    } finally {
      setBusy(false);
    }
  };

  const unassignTerminal = async () => {
    if (!registerId) return;
    setBusy(true); setNotice('');
    try {
      await posBackendApi.unassignSquareTerminal(registerId);
      setNotice('Square terminal unassigned from register.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Square terminal could not be unassigned.');
    } finally {
      setBusy(false);
    }
  };

  const disableTerminal = async () => {
    if (!terminalId) return;
    setBusy(true); setNotice('');
    try {
      await posBackendApi.disableSquareTerminal(terminalId);
      setNotice('Square terminal disabled.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Square terminal could not be disabled.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#FF6B5E]/10 text-[#B63B32]"><CreditCard className="h-5 w-5" /></span>
          <div>
            <h2 className="text-base font-medium text-slate-950 dark:text-white">Square Terminal</h2>
            <p className="text-sm text-slate-500">Connect Square, pair a device, and assign it to a POS register.</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} className={squareButtonClass} disabled={loading || busy}><RefreshCw className="h-4 w-4" />Refresh</button>
      </div>

      {notice ? <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">{notice}</div> : null}
      {loading ? <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading Square setup...</div> : null}

      {!loading ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-3">
          <SquareSetupStep icon={<Cable className="h-4 w-4" />} title="1. Connect Square" value={status?.enabled ? status.environment : 'disabled'}>
            <button type="button" onClick={connectSquare} className={squareButtonClass} disabled={!canManage || busy || !status?.enabled}>Connect Square</button>
          </SquareSetupStep>
          <SquareSetupStep icon={<MapPin className="h-4 w-4" />} title="2. Link location" value={`${locations.length} available`}>
            <select value={locationId} onChange={(event) => setLocationId(event.target.value)} className={squareSelectClass}>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.currencyCode || 'CAD'}</option>)}
            </select>
            <button type="button" onClick={linkLocation} className={squareButtonClass} disabled={!canManage || busy || !locationId}>Link location</button>
          </SquareSetupStep>
          <SquareSetupStep icon={<Monitor className="h-4 w-4" />} title="3. Pair and assign" value={`${terminals.length} terminals`}>
            <button type="button" onClick={pairTerminal} className={squareButtonClass} disabled={!canManage || busy || !locationId}>Generate pairing code</button>
            {pairingCode ? <strong className="rounded-lg bg-slate-950 px-3 py-2 text-center font-mono text-white">{pairingCode}</strong> : null}
            <select value={terminalId} onChange={(event) => setTerminalId(event.target.value)} className={squareSelectClass}>
              {terminals.map((terminal) => <option key={terminal.terminalId} value={terminal.terminalId}>{terminal.name} · {terminal.status}{terminal.assignedRegisterId ? ` · register ${terminal.assignedRegisterId}` : ''}</option>)}
            </select>
            <select value={registerId} onChange={(event) => setRegisterId(event.target.value)} className={squareSelectClass}>
              {activeRegisters.map((register) => <option key={register.id} value={register.id}>{register.name} · {register.code}</option>)}
            </select>
            <button type="button" onClick={assignTerminal} className={squareButtonClass} disabled={!canManage || busy || !terminalId || !registerId}>Assign to register</button>
            <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <button type="button" onClick={refreshPairingCode} className={squareButtonClass} disabled={!canManage || busy || !terminalId}><RotateCcw className="h-4 w-4" />Refresh code</button>
              <button type="button" onClick={unassignTerminal} className={squareButtonClass} disabled={!canManage || busy || !registerId}><Unplug className="h-4 w-4" />Unassign</button>
              <button type="button" onClick={disableTerminal} className={squareButtonClass} disabled={!canManage || busy || !terminalId}><Power className="h-4 w-4" />Disable</button>
            </div>
          </SquareSetupStep>
        </div>
      ) : null}
    </section>
  );
}
