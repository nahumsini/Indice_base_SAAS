import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { PaymentAccountModal } from '../../../Expenses/PaymentAccounts/components/PaymentAccountModal';
import type { PaymentAccount } from '../../../Expenses/PaymentAccounts/types';
import { paymentAccountsService } from '../../../Expenses/services/payment-accounts.service';
import type { FinanceReferenceOption } from '../../../Expenses/types/finance-reference.types';
import { Button } from '../../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import type { SalesBusinessOption } from '../types/salesTypes';
import type { SalesRecordsTranslations } from '../translations';

export function SalesPaymentAccountField({
  businessId,
  businessUnitId,
  businessOptions,
  currency,
  selectedId,
  t,
  onSelect,
}: {
  businessId?: string;
  businessUnitId?: string;
  businessOptions: SalesBusinessOption[];
  currency: string;
  selectedId?: string;
  t: SalesRecordsTranslations;
  onSelect: (account?: PaymentAccount) => void;
}) {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null | undefined>(undefined);

  const loadAccounts = async () => {
    try {
      setAccounts(await paymentAccountsService.getPaymentAccounts());
    } catch {
      setAccounts([]);
    }
  };

  useEffect(() => { void loadAccounts(); }, []);

  const visibleAccounts = useMemo(() => accounts.filter((account) => (
    account.isActive
    && (!account.unitId || !businessUnitId || account.unitId === businessUnitId)
    && (!account.businessId || !businessId || account.businessId === businessId)
  )), [accounts, businessId, businessUnitId]);
  const selected = accounts.find((account) => account.id === selectedId);
  const unitOptions: FinanceReferenceOption[] = useMemo(() => {
    const units = new Map<string, string>();
    businessOptions.forEach((business) => units.set(business.businessUnitId, business.businessUnitName));
    return [...units].map(([value, label]) => ({ value, label }));
  }, [businessOptions]);
  const financeBusinessOptions: FinanceReferenceOption[] = businessOptions.map((business) => ({
    value: business.id,
    label: business.name,
    unitId: business.businessUnitId,
  }));

  const saveAccount = async (account: PaymentAccount) => {
    const saved = selected?.id === account.id || accounts.some((item) => item.id === account.id)
      ? await paymentAccountsService.updatePaymentAccount(account)
      : await paymentAccountsService.createPaymentAccount(account);
    await loadAccounts();
    onSelect(saved);
    setEditingAccount(undefined);
  };

  return (
    <>
      <div className="flex gap-2">
        <Select value={selectedId || 'none'} onValueChange={(value) => onSelect(accounts.find((account) => account.id === value))}>
          <SelectTrigger aria-label={t.modal.fields.paymentAccount} className="min-h-11 flex-1 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
            <SelectValue placeholder={t.modal.placeholders.paymentAccount} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t.modal.paymentAccounts.none}</SelectItem>
            {visibleAccounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name} · {account.currency} · {account.type.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="icon" aria-label={t.modal.paymentAccounts.add} onClick={() => setEditingAccount(null)}>
          <Plus className="h-4 w-4" />
        </Button>
        {selected ? (
          <Button type="button" variant="outline" size="icon" aria-label={t.modal.paymentAccounts.edit} onClick={() => setEditingAccount(selected)}>
            <Pencil className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {editingAccount !== undefined ? (
        <PaymentAccountModal
          account={editingAccount}
          businessOptions={financeBusinessOptions}
          unitOptions={unitOptions}
          onClose={() => setEditingAccount(undefined)}
          onSubmit={saveAccount}
        />
      ) : null}
    </>
  );
}
