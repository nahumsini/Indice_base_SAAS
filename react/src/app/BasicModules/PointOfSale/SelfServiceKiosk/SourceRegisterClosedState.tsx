import { LockKeyhole, RefreshCw } from 'lucide-react';
import { usePointOfSaleKioskTranslations } from '../Kiosks/kioskTranslations';

type SourceRegisterClosedStateProps = {
  registerName: string;
  onRetry: () => void;
};

export function SourceRegisterClosedState({
  registerName,
  onRetry,
}: SourceRegisterClosedStateProps) {
  const { copy } = usePointOfSaleKioskTranslations();

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-100 px-6">
      <section className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-100 text-amber-700">
          <LockKeyhole className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-medium text-slate-950">
          {copy.selfServicePublic.sourceRegisterClosed}
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          {copy.selfServicePublic.sourceRegisterClosedDescription(registerName)}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#FF6B5E] px-6 text-sm font-medium text-[#222831]"
        >
          <RefreshCw className="h-5 w-5" />
          {copy.selfServicePublic.retry}
        </button>
      </section>
    </main>
  );
}
