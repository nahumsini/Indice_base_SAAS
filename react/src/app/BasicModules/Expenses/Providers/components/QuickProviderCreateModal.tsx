import { Check, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import {
  FinanceFieldLabel,
  financeModalInputClass,
  financeModalPrimaryButtonClass,
  financeModalSecondaryButtonClass,
} from '../../components/modals/FinanceModalPrimitives';
import type { ProviderFormValues } from '../useProveedoresLogic';

type QuickProviderCreateModalProps = {
  onClose: () => void;
  onSubmit: (values: ProviderFormValues) => void | Promise<void>;
};

export function QuickProviderCreateModal({ onClose, onSubmit }: QuickProviderCreateModalProps) {
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const normalizedName = name.trim();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizedName || isSaving) return;
    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSubmit({
        accountingAccount: '',
        address: '',
        authorizer: '',
        business: '',
        businessUnit: '',
        company: '',
        contactName: '',
        email: '',
        name: normalizedName,
        performer: '',
        phone: '',
        status: 'active',
        taxId: '',
        type: 'Servicios',
      });
    } catch {
      setErrorMessage('No se pudo crear el proveedor. Inténtalo nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <IndiceModalFrame
      busy={isSaving}
      closeLabel="Cerrar"
      description="Captura únicamente el nombre. Podrás completar los demás datos después."
      footer={(
        <>
          <button type="button" className={financeModalSecondaryButtonClass} disabled={isSaving} onClick={onClose}>Cancelar</button>
          <button type="submit" form="quick-provider-create-form" className={financeModalPrimaryButtonClass} disabled={!normalizedName || isSaving}>
            <Check className="h-4 w-4" />
            {isSaving ? 'Guardando…' : 'Crear proveedor'}
          </button>
        </>
      )}
      footerSummary={normalizedName || 'Proveedor sin nombre'}
      icon={<UserPlus className="h-5 w-5" />}
      onOpenChange={(open) => !open && onClose()}
      open
      title="Agregar proveedor rápido"
      tone="coral"
    >
      <form id="quick-provider-create-form" onSubmit={handleSubmit}>
        <IndiceModalValidation messages={errorMessage ? [errorMessage] : []} title="No se pudo guardar" />
        <label className="block">
          <FinanceFieldLabel label="Nombre del proveedor" required />
          <input
            autoFocus
            maxLength={160}
            required
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setErrorMessage('');
            }}
            className={financeModalInputClass}
            placeholder="Ej. Distribuidora del Norte"
          />
        </label>
      </form>
    </IndiceModalFrame>
  );
}
