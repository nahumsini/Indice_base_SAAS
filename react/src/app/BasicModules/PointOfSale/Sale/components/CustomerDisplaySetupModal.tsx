import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, ExternalLink, Monitor, RefreshCw } from 'lucide-react';
import {
  customerDisplayApi,
  type CustomerDisplayPairingCodeResponse,
} from '../../shared/customerDisplay/customerDisplayApi';
import type { Shift } from '../types/shift.types';
import { usePointOfSaleKioskTranslations } from '../../Kiosks/kioskTranslations';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalSecondaryActionClassName,
} from './PosModalFrame';

interface CustomerDisplaySetupModalProps {
  isOpen: boolean;
  shift: Shift | null;
  onClose: () => void;
}

export function CustomerDisplaySetupModal({
  isOpen,
  shift,
  onClose,
}: CustomerDisplaySetupModalProps) {
  const { copy } = usePointOfSaleKioskTranslations();
  const [pairing, setPairing] = useState<CustomerDisplayPairingCodeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const requestGeneration = useRef(0);
  const setupCopyRef = useRef(copy.customerDisplaySetup);
  const cashRegisterId = shift ? Number(shift.cashRegisterId) : null;
  const cashRegisterCode = shift?.cashRegisterCode ?? '';

  const displayUrl = useMemo(() => toAbsoluteUrl(pairing?.displayUrl), [pairing?.displayUrl]);
  const pairingUrl = useMemo(() => toAbsoluteUrl(pairing?.pairingUrl), [pairing?.pairingUrl]);

  useEffect(() => {
    setupCopyRef.current = copy.customerDisplaySetup;
  }, [copy.customerDisplaySetup]);

  const clearSensitiveState = useCallback(() => {
    requestGeneration.current += 1;
    setPairing(null);
    setIsLoading(false);
    setError('');
    setCopied(false);
  }, []);

  const loadPairingCode = useCallback(async () => {
    const setupCopy = setupCopyRef.current;
    const generation = requestGeneration.current + 1;
    requestGeneration.current = generation;
    setPairing(null);
    setCopied(false);
    if (!cashRegisterId || !cashRegisterCode) {
      setIsLoading(false);
      setError(setupCopy.shiftRequired);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await customerDisplayApi.createPairingCode({
        cashRegisterId,
        deviceName: setupCopy.defaultDeviceName(cashRegisterCode),
      });
      if (requestGeneration.current === generation) setPairing(response);
    } catch {
      if (requestGeneration.current === generation) {
        setError(setupCopy.prepareError);
      }
    } finally {
      if (requestGeneration.current === generation) setIsLoading(false);
    }
  }, [cashRegisterCode, cashRegisterId]);

  useEffect(() => {
    if (!isOpen) {
      clearSensitiveState();
      return;
    }
    void loadPairingCode();
    return () => {
      requestGeneration.current += 1;
    };
  }, [clearSensitiveState, isOpen, loadPairingCode]);

  const copyPairingLink = async () => {
    if (!pairingUrl) {
      return;
    }
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(pairingUrl);
      setCopied(true);
      setError('');
    } catch {
      setCopied(false);
      setError(copy.customerDisplaySetup.copyError);
    }
  };

  const openDisplay = () => {
    if (displayUrl) {
      window.open(displayUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const closeModal = () => {
    clearSensitiveState();
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <PosModalFrame
      modalType="standard-form"
      closeLabel={copy.customerDisplaySetup.closeLabel}
      eyebrow={copy.customerDisplaySetup.eyebrow}
      icon={<Monitor className="h-6 w-6" />}
      onClose={closeModal}
      size="md"
      subtitle={copy.customerDisplaySetup.subtitle}
      title={copy.customerDisplaySetup.title}
      tone="coral"
      zIndexClassName="z-[1000]"
      footerClassName={posModalModuleFooterClassName}
      footer={(
        <div className="flex justify-end">
          <button type="button" onClick={closeModal} className={posModalSecondaryActionClassName}>
            {copy.customerDisplaySetup.close}
          </button>
        </div>
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs font-medium tracking-normal text-[#FF6B5E]">{copy.customerDisplaySetup.fixedPairing}</p>
          <h3 className="mt-1 text-xl font-medium text-[#222831] dark:text-white">
            {cashRegisterCode ? copy.customerDisplaySetup.register(cashRegisterCode) : copy.customerDisplaySetup.noActiveShift}
          </h3>
          <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-300">
            {copy.customerDisplaySetup.description}
          </p>

          <div className="mt-5 rounded-lg border border-dashed border-[#59C3A5]/50 bg-[#F7F8FA] p-4 dark:border-[#59C3A5]/30 dark:bg-gray-950/40">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{copy.customerDisplaySetup.pairingLink}</p>
            <p className="mt-2 break-all text-sm font-medium text-[#222831] dark:text-white">
              {pairingUrl || copy.customerDisplaySetup.preparingLink}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyPairingLink}
                disabled={!pairingUrl}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#222831] shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              >
                <Copy className="h-4 w-4" />
                {copied ? copy.customerDisplaySetup.copied : copy.customerDisplaySetup.copyLink}
              </button>
              <button
                type="button"
                onClick={openDisplay}
                disabled={!displayUrl}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#59C3A5] px-4 py-2 text-sm font-medium text-[#222831] shadow-sm transition hover:bg-[#4ab295] disabled:opacity-50"
              >
                <ExternalLink className="h-4 w-4" />
                {copy.customerDisplaySetup.openDisplay}
              </button>
              <button
                type="button"
                onClick={() => { void loadPairingCode(); }}
                disabled={isLoading || !cashRegisterId}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#222831] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                {copy.customerDisplaySetup.regenerate}
              </button>
            </div>
          </div>

          {error ? (
            <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          ) : null}
        </section>

        <aside className="rounded-lg border border-[#F4C84A]/50 bg-[#F4C84A]/15 p-5 text-center dark:border-[#F4C84A]/30 dark:bg-[#F4C84A]/10">
          <p className="text-xs font-medium tracking-normal text-[#8A6500] dark:text-[#F4C84A]">{copy.customerDisplaySetup.codeForTv}</p>
          <div className="mt-4 rounded-lg bg-white px-4 py-6 shadow-sm dark:bg-gray-950">
            <p className="select-all break-all text-3xl font-medium tracking-normal text-[#222831] dark:text-white sm:text-5xl">
              {pairing?.pairingCode ?? '------'}
            </p>
          </div>
          <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-200">
            {copy.customerDisplaySetup.externalScreen}
          </p>
          <p className="mt-1 break-all text-xs font-medium text-[#222831] dark:text-white">
            {toAbsoluteUrl('/pos-display/pair')}
          </p>
          <p className="mt-4 text-xs font-medium text-gray-600 dark:text-gray-300">
            {copy.customerDisplaySetup.expirationHelp}
          </p>
        </aside>
      </div>
    </PosModalFrame>
  );
}

function toAbsoluteUrl(path?: string | null) {
  if (!path) {
    return '';
  }
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
}
