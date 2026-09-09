import { useLanguage } from "../../shared/context";
import { catalogLocale, getCatalogCopy, formatCatalogCopy } from "./translations";
import { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { IndiceConfirmationDialog } from '../../components/indice-modal';

export function CatalogPublishDialog({
  open, busy, english, mode, versionCode, error, onCancel, onConfirm,
}: {
  open: boolean;
  busy: boolean;
  english: boolean;
  mode: 'TEST' | 'LIVE';
  versionCode: string;
  error: string | null;
  onCancel: () => void;
  onConfirm: (confirmation: string) => void;
}) {
  const { currentLanguage } = useLanguage();
  const languageCode = catalogLocale(currentLanguage.code);
  const [confirmation, setConfirmation] = useState('');
  useEffect(() => setConfirmation(''), [open, versionCode, mode]);
  const live = mode === 'LIVE';
  return (
    <IndiceConfirmationDialog
      open={open}
      busy={busy}
      title={formatCatalogCopy(getCatalogCopy(languageCode).publishOfferInStripe, mode)}
      description={getCatalogCopy(languageCode).savedPricesWillBeSynchronizedAndVerifiedBefore}
      itemName={versionCode}
      icon={<BadgeCheck className="h-5 w-5" />}
      cancelLabel={getCatalogCopy(languageCode).cancel}
      confirmLabel={busy
        ? (getCatalogCopy(languageCode).synchronizingAndPublishing)
        : (getCatalogCopy(languageCode).syncAndPublishOffer)}
      confirmDisabled={live && confirmation !== 'PUBLICAR EN STRIPE LIVE'}
      onCancel={onCancel}
      onConfirm={() => onConfirm(confirmation)}
    >
      {live ? (
        <label className="block space-y-2 text-sm text-slate-700 dark:text-slate-200">
          <span>{getCatalogCopy(languageCode).typePUBLICARENSTRIPELIVEToConfirm}</span>
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={busy}
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-900"
          />
        </label>
      ) : null}
      {busy ? <p role="status" className="text-sm text-slate-500">{getCatalogCopy(languageCode).stripeVerificationCanTakeAFewMinutesKeep}</p> : null}
      {error ? <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}
    </IndiceConfirmationDialog>
  );
}
