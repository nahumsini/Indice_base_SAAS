import { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Monitor, RefreshCw } from 'lucide-react';
import {
  customerDisplayApi,
  type CustomerDisplayPairingCodeResponse,
} from '../../shared/customerDisplay/customerDisplayApi';
import type { Shift } from '../types/shift.types';
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
  const [pairing, setPairing] = useState<CustomerDisplayPairingCodeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const displayUrl = useMemo(() => toAbsoluteUrl(pairing?.displayUrl), [pairing?.displayUrl]);
  const pairingUrl = useMemo(() => toAbsoluteUrl(pairing?.pairingUrl), [pairing?.pairingUrl]);

  const loadPairingCode = async () => {
    if (!shift) {
      setError('Abre un turno antes de configurar pantalla espejo.');
      return;
    }
    setIsLoading(true);
    setError('');
    setCopied(false);
    try {
      const response = await customerDisplayApi.createPairingCode({
        cashRegisterId: Number(shift.cashRegisterId),
        deviceName: `Pantalla cliente - ${shift.cashRegisterCode}`,
      });
      setPairing(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo preparar la pantalla espejo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !shift) {
      return;
    }
    void loadPairingCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, shift?.cashRegisterId]);

  const copyPairingLink = async () => {
    if (!pairingUrl) {
      return;
    }
    await navigator.clipboard?.writeText(pairingUrl);
    setCopied(true);
  };

  const openDisplay = () => {
    if (displayUrl) {
      window.open(displayUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <PosModalFrame
      modalType="standard-form"
      closeLabel="Cerrar pantalla espejo"
      eyebrow="Pantalla cliente"
      icon={<Monitor className="h-6 w-6" />}
      onClose={onClose}
      size="md"
      subtitle="Muestra al cliente el ticket y total en tiempo real."
      title="Pantalla espejo"
      tone="coral"
      zIndexClassName="z-[1000]"
      footerClassName={posModalModuleFooterClassName}
      footer={(
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
            Cerrar
          </button>
        </div>
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs font-black uppercase tracking-normal text-[#FF6B5E]">Emparejamiento fijo por caja</p>
          <h3 className="mt-1 text-xl font-black text-[#222831] dark:text-white">
            {shift ? `Caja ${shift.cashRegisterCode}` : 'Caja sin turno activo'}
          </h3>
          <p className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
            Abre este enlace en la Smart TV, tablet o segundo monitor. La pantalla queda ligada a esta caja y solo muestra datos visibles para cliente.
          </p>

          <div className="mt-5 rounded-lg border border-dashed border-[#59C3A5]/50 bg-[#F7F8FA] p-4 dark:border-[#59C3A5]/30 dark:bg-gray-950/40">
            <p className="text-xs font-black uppercase text-gray-500 dark:text-gray-400">Link de emparejamiento</p>
            <p className="mt-2 break-all text-sm font-bold text-[#222831] dark:text-white">
              {pairingUrl || 'Preparando link...'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyPairingLink}
                disabled={!pairingUrl}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-black text-[#222831] shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Copiado' : 'Copiar link'}
              </button>
              <button
                type="button"
                onClick={openDisplay}
                disabled={!displayUrl}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#59C3A5] px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-[#4ab295] disabled:opacity-50"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir pantalla
              </button>
              <button
                type="button"
                onClick={() => { void loadPairingCode(); }}
                disabled={isLoading || !shift}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#222831] px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Regenerar
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          ) : null}
        </section>

        <aside className="rounded-lg border border-[#F4C84A]/50 bg-[#F4C84A]/15 p-5 text-center dark:border-[#F4C84A]/30 dark:bg-[#F4C84A]/10">
          <p className="text-xs font-black uppercase tracking-normal text-[#8A6500] dark:text-[#F4C84A]">Codigo para TV</p>
          <div className="mt-4 rounded-lg bg-white px-4 py-6 shadow-sm dark:bg-gray-950">
            <p className="select-all text-5xl font-black tracking-normal text-[#222831] dark:text-white">
              {pairing?.pairingCode ?? '------'}
            </p>
          </div>
          <p className="mt-4 text-sm font-bold text-gray-700 dark:text-gray-200">
            En la pantalla externa abre:
          </p>
          <p className="mt-1 break-all text-xs font-black text-[#222831] dark:text-white">
            {toAbsoluteUrl('/pos-display/pair')}
          </p>
          <p className="mt-4 text-xs font-semibold text-gray-600 dark:text-gray-300">
            El codigo expira en 15 minutos. La pantalla seguira enlazada despues de emparejarse.
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
