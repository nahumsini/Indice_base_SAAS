import { useLanguage } from "../../shared/context";
import { catalogLocale, getCatalogCopy } from "../CatalogWorkspace/translations";
import { Plug } from 'lucide-react';
import { IndiceConfirmationDialog } from '../../components/indice-modal';

export type StripeDemoConnectionDialogProps = {
  open: boolean;
  english: boolean;
  onClose: () => void;
  onActivate: (active: boolean) => void;
};

export function StripeDemoConnectionDialog({ open, english, onClose, onActivate }: StripeDemoConnectionDialogProps) {
  const { currentLanguage } = useLanguage();
  const languageCode = catalogLocale(currentLanguage.code);
  return (
    <IndiceConfirmationDialog
      open={open}
      title={getCatalogCopy(languageCode).localStripeDemo}
      description={getCatalogCopy(languageCode).simulateAConnectedStripeAccountForThisLocal}
      icon={<Plug className="h-5 w-5" />}
      tone="aqua"
      cancelLabel={getCatalogCopy(languageCode).cancel}
      confirmLabel={getCatalogCopy(languageCode).activateDemo}
      onCancel={onClose}
      onConfirm={() => {
        onActivate(true);
        onClose();
      }}
    >
      <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
        {getCatalogCopy(languageCode).noStripeAccountOrCredentialsAreUsedThis}
      </p>
      <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
        {getCatalogCopy(languageCode).theSimulatedConnectionLastsOnlyInThisPage}
      </p>
    </IndiceConfirmationDialog>
  );
}
