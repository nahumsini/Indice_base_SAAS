import { AlertTriangle } from 'lucide-react';
import { KioskModalFrame } from '../../../../components/kiosk-engine/KioskModalFrame';
import { IndiceModalSummary, IndiceModalValidation } from '../../../../components/indice-modal';
import { Button } from '../../../../components/ui/button';

type Props = {
  busy: boolean;
  cancelLabel: string;
  confirmLabel: string;
  description: string;
  error?: string | null;
  itemName?: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
};

export function TaskKioskConfirmationDialog({
  busy,
  cancelLabel,
  confirmLabel,
  description,
  error,
  itemName,
  onCancel,
  onConfirm,
  open,
  title,
}: Props) {
  return (
    <KioskModalFrame
      busy={busy}
      closeLabel={cancelLabel}
      description={description}
      footer={(
        <Button
          type="button"
          disabled={busy}
          className="rounded-lg bg-white font-semibold text-red-700 hover:bg-red-50"
          onClick={onConfirm}
        >
          {busy ? 'Procesando...' : confirmLabel}
        </Button>
      )}
      footerLeading={(
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
          {cancelLabel}
        </Button>
      )}
      icon={<AlertTriangle className="h-5 w-5" />}
      onOpenChange={(nextOpen) => { if (!nextOpen && !busy) onCancel(); }}
      open={open}
      size="compact"
      surface="administration"
      title={title}
      tone="coral"
    >
      <IndiceModalValidation className="mb-4" messages={error ? [error] : []} />
      <IndiceModalSummary
        columns={2}
        items={[{ label: 'Kiosko', value: itemName || 'Kiosko seleccionado', emphasized: true }]}
        variant="accent"
      />
    </KioskModalFrame>
  );
}
