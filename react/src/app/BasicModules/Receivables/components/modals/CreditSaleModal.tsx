import { useEffect, useMemo, useState } from 'react';
import { Check, CreditCard } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { cn } from '../../../../components/ui/utils';
import { FilterSelect } from '../ReceivablesFilters';
import {
  financeSoftSurfaceClass,
  financeTextClass,
  moduleModalOutlineButtonClassName,
  moduleModalPrimaryButtonClassName,
} from '../../constants/receivables.constants';
import type { ReceivablesTranslations } from '../../translations';
import type { CandidateSale, CreditPolicy, CreditSimulation } from '../../types';
import {
  addMonths,
  buildCompoundSimulations,
  formatMoney,
  formatPercent,
  resolveCreditDefaults,
  todayIso,
} from '../../utils';
import { ReceivablesModalFrame } from './ReceivablesModalFrame';

interface CreditSaleModalProps {
  candidateSales: CandidateSale[];
  copy: ReceivablesTranslations;
  creditPolicies: CreditPolicy[];
  initialSelectedSaleId?: string | null;
  onClose: () => void;
  onCreate: (draft: {
    candidate: CandidateSale;
    financedAmount: number;
    firstDueDate: string;
    creditPolicy: CreditPolicy;
    selectedSimulation: CreditSimulation;
  }) => void;
}

export function CreditSaleModal({
  candidateSales,
  copy,
  creditPolicies,
  initialSelectedSaleId,
  onClose,
  onCreate,
}: CreditSaleModalProps) {
  const [selectedSaleId, setSelectedSaleId] = useState(initialSelectedSaleId ?? candidateSales[0]?.id ?? '');
  const selectedSale = candidateSales.find((sale) => sale.id === selectedSaleId) ?? candidateSales[0] ?? null;
  const activeCreditPolicies = useMemo(
    () => creditPolicies.filter((policy) => policy.status === 'active'),
    [creditPolicies],
  );
  const originalActivePolicy = selectedSale
    ? activeCreditPolicies.find((policy) => policy.customerId === selectedSale.customerId)
    : undefined;
  const requiresCreditCustomerAssignment = Boolean(selectedSale && (selectedSale.source === 'pos' || !originalActivePolicy));
  const [selectedCreditPolicyId, setSelectedCreditPolicyId] = useState(originalActivePolicy?.id ?? activeCreditPolicies[0]?.id ?? '');
  const selectedAssignedPolicy = activeCreditPolicies.find((policy) => policy.id === selectedCreditPolicyId);
  const selectedPolicy = requiresCreditCustomerAssignment ? selectedAssignedPolicy : originalActivePolicy;
  const defaults = selectedPolicy
    ? {
        annualInterestRate: selectedPolicy.annualInterestRate,
        termMonths: selectedPolicy.defaultTermMonths,
      }
    : resolveCreditDefaults(selectedSale, creditPolicies);
  const [financedAmount, setFinancedAmount] = useState(selectedSale?.amount ?? 0);
  const [termMonths, setTermMonths] = useState(defaults.termMonths);
  const [annualInterestRate, setAnnualInterestRate] = useState(defaults.annualInterestRate);
  const [firstDueDate, setFirstDueDate] = useState(addMonths(todayIso(), 1));
  const simulations = useMemo(() => buildCompoundSimulations({
    amount: Math.max(0, financedAmount),
    annualInterestRate,
    termMonths,
  }), [annualInterestRate, financedAmount, termMonths]);
  const [selectedSimulationId, setSelectedSimulationId] = useState(simulations[0]?.id ?? 'balanced');
  const selectedSimulation = simulations.find((simulation) => simulation.id === selectedSimulationId) ?? simulations[0];
  const overLimit = selectedPolicy ? financedAmount > selectedPolicy.availableCredit : false;
  const canApprove = Boolean(selectedSale && selectedSimulation && selectedPolicy && !overLimit);

  useEffect(() => {
    if (initialSelectedSaleId && candidateSales.some((sale) => sale.id === initialSelectedSaleId)) {
      setSelectedSaleId(initialSelectedSaleId);
      return;
    }

    if (!candidateSales.some((sale) => sale.id === selectedSaleId)) {
      setSelectedSaleId(candidateSales[0]?.id ?? '');
    }
  }, [candidateSales, initialSelectedSaleId, selectedSaleId]);

  useEffect(() => {
    if (!selectedSale) {
      return;
    }

    const nextOriginalPolicy = activeCreditPolicies.find((policy) => policy.customerId === selectedSale.customerId);
    setFinancedAmount(selectedSale.amount);
    setSelectedCreditPolicyId(nextOriginalPolicy?.id ?? activeCreditPolicies[0]?.id ?? '');
  }, [activeCreditPolicies, selectedSale]);

  useEffect(() => {
    if (!selectedSale) {
      return;
    }

    const nextOriginalPolicy = activeCreditPolicies.find((policy) => policy.customerId === selectedSale.customerId);
    const nextRequiresAssignment = selectedSale.source === 'pos' || !nextOriginalPolicy;
    const nextPolicy = nextRequiresAssignment
      ? activeCreditPolicies.find((policy) => policy.id === selectedCreditPolicyId) ?? nextOriginalPolicy ?? activeCreditPolicies[0]
      : nextOriginalPolicy;

    if (nextRequiresAssignment && nextPolicy && selectedCreditPolicyId !== nextPolicy.id) {
      setSelectedCreditPolicyId(nextPolicy.id);
    }

    const nextDefaults = nextPolicy
      ? {
          annualInterestRate: nextPolicy.annualInterestRate,
          termMonths: nextPolicy.defaultTermMonths,
        }
      : resolveCreditDefaults(selectedSale, creditPolicies);
    setTermMonths(nextDefaults.termMonths);
    setAnnualInterestRate(nextDefaults.annualInterestRate);
  }, [activeCreditPolicies, creditPolicies, selectedCreditPolicyId, selectedSale]);

  useEffect(() => {
    if (!simulations.some((simulation) => simulation.id === selectedSimulationId)) {
      setSelectedSimulationId(simulations[0]?.id ?? 'balanced');
    }
  }, [selectedSimulationId, simulations]);

  return (
    <ReceivablesModalFrame
      description={copy.modals.creditSale.description}
      icon={<CreditCard className="h-5 w-5" />}
      maxWidthClassName="max-w-5xl"
      onClose={onClose}
      title={copy.modals.creditSale.title}
      footer={(
        <>
          <Button type="button" variant="outline" className={moduleModalOutlineButtonClassName} onClick={onClose}>
            {copy.common.cancel}
          </Button>
          <Button
            type="button"
            disabled={!canApprove}
            className={moduleModalPrimaryButtonClassName}
            onClick={() => {
              if (!selectedSale || !selectedSimulation || !selectedPolicy) {
                return;
              }
              onCreate({
                candidate: selectedSale,
                financedAmount,
                firstDueDate,
                creditPolicy: selectedPolicy,
                selectedSimulation,
              });
            }}
          >
            {copy.modals.creditSale.approve}
          </Button>
        </>
      )}
    >
      {selectedSale ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <FilterSelect
              label={copy.modals.creditSale.sourceSale}
              value={selectedSale.id}
              onChange={setSelectedSaleId}
              options={candidateSales.map((sale) => ({
                value: sale.id,
                label: `${sale.saleNumber} - ${sale.customerName}`,
              }))}
            />
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm font-black text-slate-950 dark:text-white">{selectedSale.customerName}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">{selectedSale.unit} - {selectedSale.business}</p>
              <p className={cn('mt-3 text-2xl font-black', financeTextClass)}>
                {formatMoney(selectedSale.amount, selectedSale.currency)}
              </p>
            </div>
            {requiresCreditCustomerAssignment ? (
              <div className="space-y-2">
                {activeCreditPolicies.length > 0 ? (
                  <FilterSelect
                    label={copy.modals.creditSale.creditCustomer}
                    value={selectedPolicy?.id ?? activeCreditPolicies[0]?.id ?? ''}
                    onChange={setSelectedCreditPolicyId}
                    options={activeCreditPolicies.map((policy) => ({
                      value: policy.id,
                      label: `${policy.customerName} · ${formatMoney(policy.availableCredit)}`,
                    }))}
                  />
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    {copy.modals.creditSale.noActiveCreditCustomers}
                  </div>
                )}
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {copy.modals.creditSale.creditCustomerHelp}
                </p>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.modals.creditSale.financedAmount}</span>
                <Input
                  type="number"
                  min="0"
                  value={financedAmount}
                  onChange={(event) => setFinancedAmount(Number(event.target.value))}
                  className="h-11 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.modals.creditSale.firstDueDate}</span>
                <Input
                  type="date"
                  value={firstDueDate}
                  onChange={(event) => setFirstDueDate(event.target.value)}
                  className="h-11 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.modals.creditSale.months}</span>
                <Input
                  type="number"
                  min="1"
                  value={termMonths}
                  onChange={(event) => setTermMonths(Number(event.target.value))}
                  className="h-11 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.modals.creditSale.annualInterest}</span>
                <Input
                  type="number"
                  min="0"
                  value={annualInterestRate}
                  onChange={(event) => setAnnualInterestRate(Number(event.target.value))}
                  className="h-11 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            </div>
            <div
              className={cn(
                'rounded-2xl border p-4 text-sm font-semibold',
                !selectedPolicy || overLimit
                  ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
                  : financeSoftSurfaceClass,
              )}
            >
              {!selectedPolicy
                ? copy.modals.creditSale.creditCustomerRequired
                : overLimit
                  ? copy.modals.creditSale.overLimit
                  : copy.modals.creditSale.availableLine(formatMoney(selectedPolicy.availableCredit), selectedPolicy.defaultTermMonths)}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-black text-slate-950 dark:text-white">{copy.modals.creditSale.simulations}</h3>
            {simulations.map((simulation) => {
              const selected = selectedSimulationId === simulation.id;

              return (
                <button
                  key={simulation.id}
                  type="button"
                  onClick={() => setSelectedSimulationId(simulation.id)}
                  className={cn(
                    'grid w-full gap-3 rounded-2xl border p-4 text-left transition md:grid-cols-[1fr_140px_140px]',
                    selected
                      ? 'border-[#147514] bg-[#147514]/10 shadow-sm dark:bg-emerald-400/10'
                      : 'border-slate-200 bg-white hover:border-[#147514]/30 hover:bg-[#147514]/5 dark:border-slate-700 dark:bg-slate-900',
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      {selected ? <Check className={cn('h-4 w-4', financeTextClass)} /> : null}
                      <p className="font-black text-slate-950 dark:text-white">{simulation.name}</p>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {simulation.termMonths} {copy.modals.creditSale.months.toLowerCase()} - {formatPercent(simulation.annualInterestRate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500">{copy.modals.creditSale.monthlyPayment}</p>
                    <p className="mt-1 font-black text-slate-950 dark:text-white">{formatMoney(simulation.monthlyPayment, selectedSale.currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500">{copy.modals.creditSale.totalInterest}</p>
                    <p className={cn('mt-1 font-black', financeTextClass)}>{formatMoney(simulation.totalInterest, selectedSale.currency)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          {copy.modals.creditSale.noSales}
        </p>
      )}
    </ReceivablesModalFrame>
  );
}
