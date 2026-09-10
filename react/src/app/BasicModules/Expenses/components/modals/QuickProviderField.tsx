import { ExpenseAccountSelect } from '../table/ExpenseAccountSelect';
import { useRef, useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import type { Provider } from '../../types/expenses.types';
import { useExpensesTranslations } from '../../Expenses/hooks/useExpensesTranslations';

type QuickProviderFieldProps = {
  disabled?: boolean;
  emptyLabel: string;
  label: string;
  onChange: (providerId: string) => void;
  onCreateProvider?: (name: string) => Promise<Provider>;
  providers: Provider[];
  required?: boolean;
  value: string;
};

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-none placeholder:text-slate-400 transition-colors focus:border-[#147514] focus:outline-none focus:ring-2 focus:ring-[#147514]/15 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100';

export function QuickProviderField({ disabled = false, emptyLabel, label, onChange, onCreateProvider, providers, required, value }: QuickProviderFieldProps) {
  const t = useExpensesTranslations();
  const copy = t.expenses.payableAccount;
  const [errorMessage, setErrorMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const creatingRef = useRef(false);

  const createProvider = async () => {
    if (disabled || creatingRef.current) return;
    const normalizedName = name.trim();
    if (!normalizedName) {
      setErrorMessage(copy.quickProviderRequired);
      return;
    }
    if (!onCreateProvider) return;

    creatingRef.current = true;
    setIsCreating(true);
    setErrorMessage('');
    try {
      const provider = await onCreateProvider(normalizedName);
      onChange(provider.id);
      setName('');
      setIsOpen(false);
    } catch {
      setErrorMessage(copy.quickProviderSaveFailed);
    } finally {
      creatingRef.current = false;
      setIsCreating(false);
    }
  };

  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}{required ? ' *' : ''}</span>
      <ExpenseAccountSelect disabled={disabled || isCreating} label={label} emptyLabel={emptyLabel} value={value} onChange={onChange}
        options={providers.filter(provider => provider.status !== 'inactive').map(provider => ({ value: provider.id, label: provider.name }))} />

      {onCreateProvider ? (
        <button
          type="button"
          disabled={disabled || isCreating}
          aria-expanded={isOpen}
          onClick={() => {
            setIsOpen(current => !current);
            setErrorMessage('');
          }}
          className="mt-1 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#147514] transition hover:text-[#105010] dark:text-emerald-300"
        >
          <UserPlus className="h-4 w-4" />
          {copy.quickProviderAction}
        </button>
      ) : null}

      {isOpen ? (
        <div className="mt-3 rounded-2xl border border-[#147514]/20 bg-[#147514]/5 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/10">
          <div className="grid gap-3">
            <label>
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">{copy.quickProviderName} *</span>
              <Input
                autoFocus
                disabled={disabled || isCreating}
                maxLength={160}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setErrorMessage('');
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  void createProvider();
                }}
                placeholder={copy.quickProviderPlaceholder}
                className={inputClass}
              />
            </label>
            <Button type="button" disabled={disabled || isCreating || !name.trim()} onClick={() => void createProvider()} className="h-11 rounded-xl bg-[#147514] px-4 text-white hover:bg-[#105010]">
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {isCreating ? copy.quickProviderCreating : copy.quickProviderCreate}
            </Button>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{copy.quickProviderHint}</p>
          {errorMessage ? <p role="alert" className="mt-2 text-sm font-medium text-red-600 dark:text-red-300">{errorMessage}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
