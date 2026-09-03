import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IndiceModalValidationTone } from '../../../components/indice-modal';
import {
  posBackendApi,
  type PosCashRegisterResponse,
  type PosSquareLocationResponse,
  type PosSquarePairTerminalResponse,
  type PosSquareTerminalResponse,
  type PosSquareTerminalStatusResponse,
} from '../Sale/services/posBackendApi';
import type { PointOfSaleLocale } from '../translations';
import type { SquareTerminalSetupCopy } from './squareTerminalSetupTranslations';

export type SetupStepId = 'provider' | 'connect' | 'location' | 'terminal';
export type ConfirmationAction = 'disable' | 'unassign' | null;
export type SetupFeedback = { message: string; tone: IndiceModalValidationTone } | null;

export const squareSetupStepOrder: SetupStepId[] = ['provider', 'connect', 'location', 'terminal'];

export function useSquareTerminalSetupState({
  canManage,
  copy,
  locale,
  open,
  registers,
}: {
  canManage: boolean;
  copy: SquareTerminalSetupCopy;
  locale: PointOfSaleLocale;
  open: boolean;
  registers: PosCashRegisterResponse[];
}) {
  const [activeStep, setActiveStep] = useState<SetupStepId>('provider');
  const [status, setStatus] = useState<PosSquareTerminalStatusResponse | null>(null);
  const [locations, setLocations] = useState<PosSquareLocationResponse[]>([]);
  const [terminals, setTerminals] = useState<PosSquareTerminalResponse[]>([]);
  const [locationId, setLocationId] = useState('');
  const [linkedLocationId, setLinkedLocationId] = useState('');
  const [terminalId, setTerminalId] = useState('');
  const [registerId, setRegisterId] = useState('');
  const [pairing, setPairing] = useState<PosSquarePairTerminalResponse | null>(null);
  const [connectionReady, setConnectionReady] = useState(false);
  const [feedback, setFeedback] = useState<SetupFeedback>(null);
  const [confirmationAction, setConfirmationAction] = useState<ConfirmationAction>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const activeRegisters = useMemo(() => registers
    .filter((register) => register.active && register.status === 'ACTIVE')
    .sort((left, right) => left.name.localeCompare(right.name, locale)), [locale, registers]);
  const selectedTerminal = terminals.find((terminal) => String(terminal.terminalId) === terminalId) ?? null;
  const selectedRegister = activeRegisters.find((register) => String(register.id) === registerId) ?? null;
  const selectedTerminalStatus = selectedTerminal?.status.toUpperCase() ?? '';
  const canAssign = canManage && selectedTerminalStatus === 'PAIRED' && Boolean(registerId);
  const currentStepIndex = squareSetupStepOrder.indexOf(activeStep);

  useEffect(() => {
    if (!open) return;
    setActiveStep('provider');
    setStatus(null);
    setLocations([]);
    setTerminals([]);
    setLocationId('');
    setLinkedLocationId('');
    setTerminalId('');
    setRegisterId('');
    setPairing(null);
    setConnectionReady(false);
    setFeedback(null);
    setConfirmationAction(null);
    setLoading(false);
    setBusy(false);
  }, [open]);

  useEffect(() => {
    if (!locationId && locations[0]) setLocationId(locations[0].id);
  }, [locationId, locations]);
  useEffect(() => {
    if (!terminalId && terminals[0]) setTerminalId(String(terminals[0].terminalId));
  }, [terminalId, terminals]);
  useEffect(() => {
    if (!registerId && activeRegisters[0]) setRegisterId(String(activeRegisters[0].id));
  }, [activeRegisters, registerId]);

  const loadSquareSetup = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const nextStatus = await posBackendApi.squareStatus();
      setStatus(nextStatus);
      if (!nextStatus.enabled) {
        setConnectionReady(false);
        setLocations([]);
        setTerminals([]);
        return;
      }

      const [locationResult, terminalResult] = await Promise.allSettled([
        posBackendApi.squareLocations(),
        posBackendApi.squareTerminals(),
      ]);
      const connected = locationResult.status === 'fulfilled';
      setConnectionReady(connected);
      setLocations(connected ? locationResult.value.items : []);
      setTerminals(terminalResult.status === 'fulfilled' ? terminalResult.value.items : []);
      if (!connected) setFeedback({ message: copy.feedback.connectFirst, tone: 'warning' });
    } catch (error) {
      setConnectionReady(false);
      setFeedback({ message: errorMessage(error, copy.feedback.loadError), tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [copy.feedback.connectFirst, copy.feedback.loadError]);

  const selectSquare = () => {
    setActiveStep('connect');
    void loadSquareSetup();
  };

  const connectSquare = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await posBackendApi.startSquareOAuth();
      window.location.assign(response.authorizationUrl);
    } catch (error) {
      setFeedback({ message: errorMessage(error, copy.feedback.oauthError), tone: 'error' });
      setBusy(false);
    }
  };

  const linkLocation = async () => {
    if (!locationId) return;
    setBusy(true);
    setFeedback(null);
    try {
      await posBackendApi.linkSquareLocation(locationId);
      setLinkedLocationId(locationId);
      await loadSquareSetup();
      setFeedback({ message: copy.feedback.locationLinked, tone: 'success' });
    } catch (error) {
      setFeedback({ message: errorMessage(error, copy.feedback.locationError), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const pairTerminal = async () => {
    if (!locationId) return;
    setBusy(true);
    setFeedback(null);
    try {
      const response = await posBackendApi.pairSquareTerminal(locationId, 'Indice POS Terminal');
      setPairing(response);
      await loadSquareSetup();
      setTerminalId(String(response.terminalId));
      setFeedback({ message: copy.feedback.pairingCreated, tone: 'info' });
    } catch (error) {
      setFeedback({ message: errorMessage(error, copy.feedback.pairingError), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const refreshPairingCode = async () => {
    if (!terminalId) return;
    setBusy(true);
    setFeedback(null);
    try {
      const response = await posBackendApi.refreshSquareTerminalPairingCode(terminalId);
      setPairing(response);
      await loadSquareSetup();
      setTerminalId(String(response.terminalId));
      setFeedback({ message: copy.feedback.pairingRefreshed, tone: 'info' });
    } catch (error) {
      setFeedback({ message: errorMessage(error, copy.feedback.pairingRefreshError), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const assignTerminal = async () => {
    if (!canAssign || !terminalId || !registerId) return;
    setBusy(true);
    setFeedback(null);
    try {
      await posBackendApi.assignSquareTerminal(registerId, terminalId);
      await loadSquareSetup();
      setTerminalId(terminalId);
      setRegisterId(registerId);
      setFeedback({ message: copy.feedback.assigned, tone: 'success' });
    } catch (error) {
      setFeedback({ message: errorMessage(error, copy.feedback.assignError), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const confirmTerminalAction = async () => {
    if (!confirmationAction) return;
    setBusy(true);
    setFeedback(null);
    try {
      if (confirmationAction === 'unassign' && registerId) {
        await posBackendApi.unassignSquareTerminal(registerId);
      } else if (confirmationAction === 'disable' && terminalId) {
        await posBackendApi.disableSquareTerminal(terminalId);
      } else {
        return;
      }
      const completedAction = confirmationAction;
      setConfirmationAction(null);
      await loadSquareSetup();
      setFeedback({ message: completedAction === 'unassign' ? copy.feedback.unassigned : copy.feedback.disabled, tone: 'success' });
    } catch (error) {
      const fallback = confirmationAction === 'unassign' ? copy.feedback.unassignError : copy.feedback.disableError;
      setFeedback({ message: errorMessage(error, fallback), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    const previousStep = squareSetupStepOrder[currentStepIndex - 1];
    if (previousStep) setActiveStep(previousStep);
    setFeedback(null);
    setConfirmationAction(null);
  };

  const continueWizard = () => {
    if (activeStep === 'connect' && connectionReady) setActiveStep('location');
    if (activeStep === 'location' && linkedLocationId === locationId) setActiveStep('terminal');
    setFeedback(null);
  };

  return {
    activeRegisters,
    activeStep,
    assignTerminal,
    busy,
    canAssign,
    confirmationAction,
    confirmTerminalAction,
    connectSquare,
    connectionReady,
    continueWizard,
    currentStepIndex,
    feedback,
    goBack,
    linkedLocationId,
    linkLocation,
    loading,
    locations,
    loadSquareSetup,
    locationId,
    pairTerminal,
    pairing,
    refreshPairingCode,
    registerId,
    selectedRegister,
    selectedTerminal,
    selectedTerminalStatus,
    selectSquare,
    setConfirmationAction,
    setLinkedLocationId,
    setLocationId,
    setRegisterId,
    setTerminalId,
    status,
    terminalId,
    terminals,
  };
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
