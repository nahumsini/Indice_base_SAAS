import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, ExternalLink, Monitor, RefreshCw } from 'lucide-react';
import type { PosCashRegisterOption } from '../SelfServiceKiosk/selfServiceKioskApi';
import {
  customerDisplayApi,
  type CustomerDisplayPairingCodeResponse,
} from '../shared/customerDisplay/customerDisplayApi';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from '../Sale/components/PosModalFrame';
import { usePointOfSaleKioskTranslations } from './kioskTranslations';

type CustomerDisplaySetupModalProps = {
  registers: PosCashRegisterOption[];
  onClose: () => void;
  onGenerated: () => void;
};

export function CustomerDisplaySetupModal({
  registers,
  onClose,
  onGenerated,
}: CustomerDisplaySetupModalProps) {
  const { copy } = usePointOfSaleKioskTranslations();
  const [cashRegisterId, setCashRegisterId] = useState(() => String(registers[0]?.id ?? ''));
  const [deviceName, setDeviceName] = useState(() => defaultDeviceName(registers[0], copy.customerDisplaySetup.defaultDeviceName));
  const [pairing, setPairing] = useState<CustomerDisplayPairingCodeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const requestGeneration = useRef(0);

  const selectedRegister = useMemo(
    () => registers.find((register) => String(register.id) === cashRegisterId) ?? null,
    [cashRegisterId, registers],
  );
  const displayUrl = useMemo(() => toAbsoluteUrl(pairing?.displayUrl), [pairing?.displayUrl]);
  const pairingUrl = useMemo(() => toAbsoluteUrl(pairing?.pairingUrl), [pairing?.pairingUrl]);

  useEffect(() => () => {
    requestGeneration.current += 1;
  }, []);

  const selectRegister = (registerId: string) => {
    const register = registers.find((candidate) => String(candidate.id) === registerId);
    setCashRegisterId(registerId);
    setDeviceName(defaultDeviceName(register, copy.customerDisplaySetup.defaultDeviceName));
    setPairing(null);
    setCopied(false);
    setError('');
  };

  const generatePairing = async () => {
    if (!selectedRegister) {
      setError(copy.customerDisplaySetup.registerRequired);
      return;
    }
    const generation = requestGeneration.current + 1;
    requestGeneration.current = generation;
    setIsLoading(true);
    setError('');
    setCopied(false);
    try {
      const response = await customerDisplayApi.createPairingCode({
        cashRegisterId: selectedRegister.id,
        deviceName: deviceName.trim() || copy.customerDisplaySetup.defaultDeviceName(selectedRegister.code),
      });
      if (requestGeneration.current !== generation) return;
      setPairing(response);
      onGenerated();
    } catch (requestError) {
      if (requestGeneration.current === generation) {
        setError(requestError instanceof Error ? requestError.message : copy.customerDisplaySetup.prepareError);
      }
    } finally {
      if (requestGeneration.current === generation) setIsLoading(false);
    }
  };

  const copyPairingLink = async () => {
    if (!pairingUrl) return;
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

  return (
    <PosModalFrame
      modalType="standard-form"
      closeLabel={copy.customerDisplaySetup.closeLabel}
      eyebrow={copy.customerDisplaySetup.eyebrow}
      icon={<Monitor className="h-6 w-6" />}
      isCloseDisabled={isLoading}
      onClose={onClose}
      size="md"
      subtitle={copy.customerDisplaySetup.subtitle}
      title={copy.customerDisplaySetup.title}
      tone="coral"
      zIndexClassName="z-[1000]"
      footerClassName={posModalModuleFooterClassName}
      footer={(
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isLoading} className={posModalSecondaryActionClassName}>
            {copy.common.cancel}
          </button>
          <button
            type="button"
            onClick={() => void generatePairing()}
            disabled={isLoading || !selectedRegister}
            className={posModalPrimaryActionClassName}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {pairing ? copy.customerDisplaySetup.regenerate : copy.customerDisplaySetup.generateCode}
          </button>
        </div>
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs font-medium text-[#C74337]">{copy.customerDisplaySetup.fixedPairing}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-medium">{copy.customerDisplaySetup.registerSelection}</span>
              <select
                value={cashRegisterId}
                onChange={(event) => selectRegister(event.target.value)}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                {registers.map((register) => (
                  <option key={register.id} value={register.id}>
                    {register.code} · {register.name} · {register.warehouseName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm font-medium">{copy.customerDisplaySetup.deviceName}</span>
              <input
                value={deviceName}
                onChange={(event) => setDeviceName(event.target.value)}
                maxLength={180}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
          </div>

          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            {copy.customerDisplaySetup.description}
          </p>

          {pairing ? (
            <div className="mt-5 rounded-xl border border-dashed border-[#59C3A5]/50 bg-[#F7F8FA] p-4 dark:border-[#59C3A5]/30 dark:bg-gray-950/40">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{copy.customerDisplaySetup.pairingLink}</p>
              <p className="mt-2 break-all text-sm font-medium text-[#222831] dark:text-white">{pairingUrl}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => void copyPairingLink()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium dark:border-gray-700 dark:bg-gray-950">
                  <Copy className="h-4 w-4" />
                  {copied ? copy.customerDisplaySetup.copied : copy.customerDisplaySetup.copyLink}
                </button>
                <button type="button" onClick={() => window.open(displayUrl, '_blank', 'noopener,noreferrer')} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#59C3A5] px-4 text-sm font-medium text-[#222831]">
                  <ExternalLink className="h-4 w-4" />
                  {copy.customerDisplaySetup.openDisplay}
                </button>
              </div>
            </div>
          ) : null}

          {error ? (
            <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          ) : null}
        </section>

        <aside className="rounded-xl border border-[#F4C84A]/50 bg-[#F4C84A]/15 p-5 text-center dark:border-[#F4C84A]/30 dark:bg-[#F4C84A]/10">
          <p className="text-xs font-medium text-[#8A6500] dark:text-[#F4C84A]">{copy.customerDisplaySetup.codeForTv}</p>
          <div className="mt-4 rounded-xl bg-white px-4 py-6 shadow-sm dark:bg-gray-950">
            <p className="select-all break-all text-3xl font-medium text-[#222831] dark:text-white sm:text-5xl">
              {pairing?.pairingCode ?? '------'}
            </p>
          </div>
          <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-200">{copy.customerDisplaySetup.externalScreen}</p>
          <p className="mt-1 break-all text-xs font-medium text-[#222831] dark:text-white">{toAbsoluteUrl('/pos-display/pair')}</p>
          <p className="mt-4 text-xs text-gray-600 dark:text-gray-300">{copy.customerDisplaySetup.expirationHelp}</p>
        </aside>
      </div>
    </PosModalFrame>
  );
}

function defaultDeviceName(
  register: PosCashRegisterOption | undefined,
  format: (code: string) => string,
) {
  return register ? format(register.code) : '';
}

function toAbsoluteUrl(path?: string | null) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
}
