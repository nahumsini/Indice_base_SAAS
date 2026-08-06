import { useState } from 'react';
import { UsersRound } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { IndiceModalValidation } from '../../../../components/indice-modal';
import { Input } from '../../../../components/ui/input';
import { FilterSelect } from '../ReceivablesFilters';
import {
  moduleModalOutlineButtonClassName,
  moduleModalPrimaryButtonClassName,
} from '../../constants/receivables.constants';
import type { ReceivablesTranslations } from '../../translations';
import type { CandidateCreditCustomer, CreditPolicy } from '../../types';
import { ReceivablesModalFrame } from './ReceivablesModalFrame';
import { ReceivablesSearchSelect } from './ReceivablesSearchSelect';

interface CreditPolicyModalProps {
  candidateCustomers: CandidateCreditCustomer[];
  copy: ReceivablesTranslations;
  initialPolicy?: CreditPolicy;
  onClose: () => void;
  onSubmit: (policy: Omit<CreditPolicy, 'id' | 'availableCredit'>) => boolean | void | Promise<boolean | void>;
}

export function CreditPolicyModal({
  candidateCustomers,
  copy,
  initialPolicy,
  onClose,
  onSubmit,
}: CreditPolicyModalProps) {
  const isEditing = Boolean(initialPolicy);
  const initialCustomer = initialPolicy
    ? {
        business: initialPolicy.business,
        businessId: initialPolicy.businessId,
        contactId: initialPolicy.contactId,
        id: initialPolicy.customerId,
        name: initialPolicy.customerName,
        unit: initialPolicy.unit,
        unitId: initialPolicy.unitId,
      }
    : null;
  const customers = initialCustomer && !candidateCustomers.some((customer) => customer.id === initialCustomer.id)
    ? [initialCustomer, ...candidateCustomers]
    : candidateCustomers;
  const [customerId, setCustomerId] = useState(initialPolicy?.customerId ?? customers[0]?.id ?? '');
  const selectedCustomer = customers.find((customer) => customer.id === customerId) ?? customers[0] ?? null;
  const [creditLine, setCreditLine] = useState(initialPolicy?.creditLine ?? 100000);
  const [monthlyPurchaseLimit, setMonthlyPurchaseLimit] = useState(initialPolicy?.monthlyPurchaseLimit ?? 50000);
  const [defaultTermMonths, setDefaultTermMonths] = useState(initialPolicy?.defaultTermMonths ?? 6);
  const [annualInterestRate, setAnnualInterestRate] = useState(initialPolicy?.annualInterestRate ?? 24);
  const [status, setStatus] = useState<CreditPolicy['status']>(initialPolicy?.status ?? 'active');
  const [notes, setNotes] = useState(initialPolicy?.notes ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const isFormValid = Boolean(
    selectedCustomer
    && Number.isFinite(creditLine) && creditLine >= 0
    && Number.isFinite(monthlyPurchaseLimit) && monthlyPurchaseLimit >= 0
    && Number.isFinite(defaultTermMonths) && defaultTermMonths >= 1
    && Number.isFinite(annualInterestRate) && annualInterestRate >= 0,
  );

  const handleSubmit = async () => {
    if (!selectedCustomer || !isFormValid || isSaving) return;

    setIsSaving(true);
    setSubmitError('');
    try {
      const result = await onSubmit({
        customerId: selectedCustomer.id,
        businessId: selectedCustomer.businessId ?? null,
        contactId: selectedCustomer.contactId ?? null,
        customerName: selectedCustomer.name,
        creditLine,
        monthlyPurchaseLimit,
        defaultTermMonths,
        annualInterestRate,
        status,
        unit: selectedCustomer.unit,
        unitId: selectedCustomer.unitId ?? null,
        business: selectedCustomer.business,
        notes,
      });
      if (result === false) {
        setSubmitError(copy.errors.createCreditPolicy);
        return;
      }
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error && error.message ? error.message : copy.errors.createCreditPolicy);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ReceivablesModalFrame
      busy={isSaving}
      closeLabel={copy.common.close}
      description={isEditing ? copy.modals.creditPolicy.editDescription : copy.modals.creditPolicy.description}
      icon={<UsersRound className="h-5 w-5" />}
      onClose={onClose}
      title={isEditing ? copy.modals.creditPolicy.editTitle : copy.modals.creditPolicy.title}
      footer={(
        <>
          <Button type="button" variant="outline" className={moduleModalOutlineButtonClassName} onClick={onClose} disabled={isSaving}>
            {copy.common.cancel}
          </Button>
          <Button
            type="button"
            disabled={!isFormValid || isSaving}
            className={moduleModalPrimaryButtonClassName}
            onClick={() => void handleSubmit()}
          >
            {isEditing ? copy.modals.creditPolicy.update : copy.modals.creditPolicy.save}
          </Button>
        </>
      )}
    >
      {selectedCustomer ? (
        <div className="space-y-4">
          <IndiceModalValidation messages={submitError ? [submitError] : []} />
          {isEditing ? (
            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.modals.creditPolicy.customer}</span>
              <div className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                {selectedCustomer.name}
              </div>
            </div>
          ) : (
            <ReceivablesSearchSelect
              label={copy.modals.creditPolicy.customer}
              value={selectedCustomer.id}
              onChange={setCustomerId}
              emptyLabel={copy.modals.creditPolicy.noCustomers}
              options={customers.map((customer) => ({ id: customer.id, label: customer.name, searchText: `${customer.unit} ${customer.business}` }))}
              searchLabel={copy.filters.search}
              searchPlaceholder={copy.filters.searchPlaceholder}
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.modals.creditPolicy.creditLine}</span>
              <Input type="number" min="0" value={creditLine} onChange={(event) => setCreditLine(Number(event.target.value))} className="h-11 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.modals.creditPolicy.monthlyLimit}</span>
              <Input type="number" min="0" value={monthlyPurchaseLimit} onChange={(event) => setMonthlyPurchaseLimit(Number(event.target.value))} className="h-11 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.modals.creditPolicy.suggestedTerm}</span>
              <Input type="number" min="1" value={defaultTermMonths} onChange={(event) => setDefaultTermMonths(Number(event.target.value))} className="h-11 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.modals.creditPolicy.annualInterest}</span>
              <Input type="number" min="0" value={annualInterestRate} onChange={(event) => setAnnualInterestRate(Number(event.target.value))} className="h-11 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <FilterSelect
              label={copy.modals.creditPolicy.status}
              value={status}
              onChange={(value) => setStatus(value as CreditPolicy['status'])}
              options={[
                { value: 'active', label: copy.creditCustomerStatus.active },
                { value: 'review', label: copy.creditCustomerStatus.review },
                { value: 'blocked', label: copy.creditCustomerStatus.blocked },
              ]}
            />
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.modals.creditPolicy.notes}</span>
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} className="h-11 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950" />
            </label>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          {copy.modals.creditPolicy.noCustomers}
        </p>
      )}
    </ReceivablesModalFrame>
  );
}
