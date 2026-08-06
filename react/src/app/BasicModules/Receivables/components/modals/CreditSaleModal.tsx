import { useEffect, useMemo, useState } from 'react';
import { Check, CreditCard } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { IndiceModalValidation, IndiceModalWizardStepper } from '../../../../components/indice-modal';
import { Input } from '../../../../components/ui/input';
import { cn } from '../../../../components/ui/utils';
import {
  financeSoftSurfaceClass,
  financeTextClass,
  moduleModalOutlineButtonClassName,
  moduleModalPrimaryButtonClassName,
} from '../../constants/receivables.constants';
import type { ReceivablesTranslations } from '../../translations';
import type { CandidateSale, CreditPolicy, CreditSimulation } from '../../types';
import { addMonths, buildCompoundSimulations, formatMoney, formatPercent, resolveCreditDefaults, todayIso } from '../../utils';
import { ReceivablesModalFrame } from './ReceivablesModalFrame';
import { ReceivablesSearchSelect } from './ReceivablesSearchSelect';

type CreditSaleStep = 'sale' | 'terms' | 'review';

interface CreditSaleModalProps {
  candidateSales: CandidateSale[];
  copy: ReceivablesTranslations;
  creditPolicies: CreditPolicy[];
  initialSelectedSaleId?: string | null;
  onClose: () => void;
  onCreate: (draft: { candidate: CandidateSale; financedAmount: number; firstDueDate: string; creditPolicy: CreditPolicy; selectedSimulation: CreditSimulation }) => boolean | void | Promise<boolean | void>;
}

export function CreditSaleModal({ candidateSales, copy, creditPolicies, initialSelectedSaleId, onClose, onCreate }: CreditSaleModalProps) {
  const [activeStep, setActiveStep] = useState<CreditSaleStep>('sale');
  const [selectedSaleId, setSelectedSaleId] = useState(initialSelectedSaleId ?? candidateSales[0]?.id ?? '');
  const selectedSale = candidateSales.find((sale) => sale.id === selectedSaleId) ?? candidateSales[0] ?? null;
  const activeCreditPolicies = useMemo(() => creditPolicies.filter((policy) => policy.status === 'active'), [creditPolicies]);
  const originalActivePolicy = selectedSale ? activeCreditPolicies.find((policy) => policy.customerId === selectedSale.customerId) : undefined;
  const requiresCreditCustomerAssignment = Boolean(selectedSale && (selectedSale.source === 'pos' || !originalActivePolicy));
  const [selectedCreditPolicyId, setSelectedCreditPolicyId] = useState(originalActivePolicy?.id ?? activeCreditPolicies[0]?.id ?? '');
  const selectedAssignedPolicy = activeCreditPolicies.find((policy) => policy.id === selectedCreditPolicyId);
  const selectedPolicy = requiresCreditCustomerAssignment ? selectedAssignedPolicy : originalActivePolicy;
  const defaults = selectedPolicy
    ? { annualInterestRate: selectedPolicy.annualInterestRate, termMonths: selectedPolicy.defaultTermMonths }
    : resolveCreditDefaults(selectedSale, creditPolicies);
  const [financedAmount, setFinancedAmount] = useState(selectedSale?.amount ?? 0);
  const [termMonths, setTermMonths] = useState(defaults.termMonths);
  const [annualInterestRate, setAnnualInterestRate] = useState(defaults.annualInterestRate);
  const [firstDueDate, setFirstDueDate] = useState(addMonths(todayIso(), 1));
  const simulations = useMemo(() => buildCompoundSimulations({ amount: Math.max(0, financedAmount), annualInterestRate, termMonths }), [annualInterestRate, financedAmount, termMonths]);
  const [selectedSimulationId, setSelectedSimulationId] = useState(simulations[0]?.id ?? 'balanced');
  const selectedSimulation = simulations.find((simulation) => simulation.id === selectedSimulationId) ?? simulations[0];
  const overLimit = selectedPolicy ? financedAmount > selectedPolicy.availableCredit : false;
  const canApprove = Boolean(selectedSale && selectedSimulation && selectedPolicy && !overLimit && financedAmount > 0 && termMonths >= 1 && annualInterestRate >= 0 && firstDueDate);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (initialSelectedSaleId && candidateSales.some((sale) => sale.id === initialSelectedSaleId)) setSelectedSaleId(initialSelectedSaleId);
    else if (!candidateSales.some((sale) => sale.id === selectedSaleId)) setSelectedSaleId(candidateSales[0]?.id ?? '');
  }, [candidateSales, initialSelectedSaleId, selectedSaleId]);

  useEffect(() => {
    if (!selectedSale) return;
    const nextPolicy = activeCreditPolicies.find((policy) => policy.customerId === selectedSale.customerId);
    setFinancedAmount(selectedSale.amount);
    setSelectedCreditPolicyId(nextPolicy?.id ?? activeCreditPolicies[0]?.id ?? '');
  }, [activeCreditPolicies, selectedSale]);

  useEffect(() => {
    if (!selectedSale) return;
    const originalPolicy = activeCreditPolicies.find((policy) => policy.customerId === selectedSale.customerId);
    const policy = selectedSale.source === 'pos' || !originalPolicy
      ? activeCreditPolicies.find((item) => item.id === selectedCreditPolicyId) ?? originalPolicy ?? activeCreditPolicies[0]
      : originalPolicy;
    const nextDefaults = policy ? { annualInterestRate: policy.annualInterestRate, termMonths: policy.defaultTermMonths } : resolveCreditDefaults(selectedSale, creditPolicies);
    setTermMonths(nextDefaults.termMonths);
    setAnnualInterestRate(nextDefaults.annualInterestRate);
  }, [activeCreditPolicies, creditPolicies, selectedCreditPolicyId, selectedSale]);

  useEffect(() => {
    if (!simulations.some((simulation) => simulation.id === selectedSimulationId)) setSelectedSimulationId(simulations[0]?.id ?? 'balanced');
  }, [selectedSimulationId, simulations]);

  const handleCreate = async () => {
    if (!selectedSale || !selectedSimulation || !selectedPolicy || !canApprove || isSaving) return;
    setIsSaving(true);
    setSubmitError('');
    try {
      const result = await onCreate({ candidate: selectedSale, financedAmount, firstDueDate, creditPolicy: selectedPolicy, selectedSimulation });
      if (result === false) setSubmitError(copy.errors.createCreditSale);
      else onClose();
    } catch (error) {
      setSubmitError(error instanceof Error && error.message ? error.message : copy.errors.createCreditSale);
    } finally {
      setIsSaving(false);
    }
  };

  const steps: Array<{ id: CreditSaleStep; label: string }> = [
    { id: 'sale', label: copy.modals.creditSale.sourceSale },
    { id: 'terms', label: copy.modals.creditSale.creditCustomer },
    { id: 'review', label: copy.modals.creditSale.simulations },
  ];

  return (
    <ReceivablesModalFrame
      busy={isSaving}
      closeLabel={copy.common.close}
      description={copy.modals.creditSale.description}
      footerSummary={selectedSimulation && selectedSale ? `${formatMoney(financedAmount, selectedSale.currency)} · ${termMonths} ${copy.modals.creditSale.months.toLowerCase()} · ${formatMoney(selectedSimulation.monthlyPayment, selectedSale.currency)} / ${copy.modals.creditSale.months.toLowerCase()}` : undefined}
      icon={<CreditCard className="h-5 w-5" />}
      modalType="wizard"
      onClose={onClose}
      title={copy.modals.creditSale.title}
      footer={activeStep === 'review' ? <><Button type="button" variant="outline" className={moduleModalOutlineButtonClassName} onClick={() => setActiveStep('terms')} disabled={isSaving}>{copy.common.cancel}</Button><Button type="button" disabled={!canApprove || isSaving} className={moduleModalPrimaryButtonClassName} onClick={() => void handleCreate()}>{copy.modals.creditSale.approve}</Button></> : <><Button type="button" variant="outline" className={moduleModalOutlineButtonClassName} onClick={onClose} disabled={isSaving}>{copy.common.cancel}</Button><Button type="button" className={moduleModalPrimaryButtonClassName} disabled={!selectedSale || (activeStep === 'terms' && !selectedPolicy)} onClick={() => setActiveStep(activeStep === 'sale' ? 'terms' : 'review')}>{activeStep === 'sale' ? copy.modals.creditSale.creditCustomer : copy.modals.creditSale.simulations}</Button></>}
    >
      {selectedSale ? <div className="space-y-5">
        <IndiceModalValidation messages={submitError ? [submitError] : []} />
        <IndiceModalWizardStepper activeStepId={activeStep} accent="green" onStepSelect={(step) => setActiveStep(step as CreditSaleStep)} progressLabel={copy.modals.creditSale.title} steps={steps} />
        {activeStep === 'sale' ? <SaleStep copy={copy} candidateSales={candidateSales} sale={selectedSale} onChange={setSelectedSaleId} /> : null}
        {activeStep === 'terms' ? <TermsStep copy={copy} policies={activeCreditPolicies} requiresAssignment={requiresCreditCustomerAssignment} sale={selectedSale} selectedPolicy={selectedPolicy} selectedPolicyId={selectedCreditPolicyId} onPolicyChange={setSelectedCreditPolicyId} financedAmount={financedAmount} firstDueDate={firstDueDate} termMonths={termMonths} annualInterestRate={annualInterestRate} overLimit={overLimit} onFinancedAmountChange={setFinancedAmount} onFirstDueDateChange={setFirstDueDate} onTermMonthsChange={setTermMonths} onAnnualInterestRateChange={setAnnualInterestRate} /> : null}
        {activeStep === 'review' ? <ReviewStep copy={copy} sale={selectedSale} simulations={simulations} selectedSimulationId={selectedSimulationId} onSelect={setSelectedSimulationId} financedAmount={financedAmount} firstDueDate={firstDueDate} /> : null}
      </div> : <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900">{copy.modals.creditSale.noSales}</p>}
    </ReceivablesModalFrame>
  );
}

function SaleStep({ candidateSales, copy, onChange, sale }: { candidateSales: CandidateSale[]; copy: ReceivablesTranslations; onChange: (id: string) => void; sale: CandidateSale }) {
  return <div className="space-y-4"><ReceivablesSearchSelect label={copy.modals.creditSale.sourceSale} value={sale.id} onChange={onChange} emptyLabel={copy.modals.creditSale.noSales} options={candidateSales.map((item) => ({ id: item.id, label: `${item.saleNumber} - ${item.customerName}`, searchText: `${item.customerName} ${item.saleNumber} ${item.unit} ${item.business}` }))} searchLabel={copy.filters.search} searchPlaceholder={copy.filters.searchPlaceholder} /><SaleSummary copy={copy} sale={sale} /></div>;
}

function TermsStep({ annualInterestRate, copy, financedAmount, firstDueDate, onAnnualInterestRateChange, onFinancedAmountChange, onFirstDueDateChange, onPolicyChange, onTermMonthsChange, overLimit, policies, requiresAssignment, sale, selectedPolicy, selectedPolicyId, termMonths }: { annualInterestRate: number; copy: ReceivablesTranslations; financedAmount: number; firstDueDate: string; onAnnualInterestRateChange: (value: number) => void; onFinancedAmountChange: (value: number) => void; onFirstDueDateChange: (value: string) => void; onPolicyChange: (id: string) => void; onTermMonthsChange: (value: number) => void; overLimit: boolean; policies: CreditPolicy[]; requiresAssignment: boolean; sale: CandidateSale; selectedPolicy?: CreditPolicy; selectedPolicyId: string; termMonths: number }) {
  return <div className="space-y-4"><SaleSummary copy={copy} sale={sale} compact />{requiresAssignment ? policies.length ? <ReceivablesSearchSelect label={copy.modals.creditSale.creditCustomer} value={selectedPolicyId} onChange={onPolicyChange} emptyLabel={copy.modals.creditSale.noActiveCreditCustomers} options={policies.map((policy) => ({ id: policy.id, label: `${policy.customerName} · ${formatMoney(policy.availableCredit, sale.currency)}`, searchText: `${policy.customerName} ${policy.unit} ${policy.business}` }))} searchLabel={copy.filters.search} searchPlaceholder={copy.filters.searchPlaceholder} /> : <Notice message={copy.modals.creditSale.noActiveCreditCustomers} warning /> : null}<div className="grid gap-4 sm:grid-cols-2"><NumberField label={copy.modals.creditSale.financedAmount} value={financedAmount} onChange={onFinancedAmountChange} /><DateField label={copy.modals.creditSale.firstDueDate} value={firstDueDate} onChange={onFirstDueDateChange} /><NumberField label={copy.modals.creditSale.months} value={termMonths} onChange={onTermMonthsChange} minimum={1} /><NumberField label={copy.modals.creditSale.annualInterest} value={annualInterestRate} onChange={onAnnualInterestRateChange} /></div><Notice message={!selectedPolicy ? copy.modals.creditSale.creditCustomerRequired : overLimit ? copy.modals.creditSale.overLimit : copy.modals.creditSale.availableLine(formatMoney(selectedPolicy.availableCredit, sale.currency), selectedPolicy.defaultTermMonths)} warning={!selectedPolicy || overLimit} /></div>;
}

function ReviewStep({ copy, financedAmount, firstDueDate, onSelect, sale, selectedSimulationId, simulations }: { copy: ReceivablesTranslations; financedAmount: number; firstDueDate: string; onSelect: (id: string) => void; sale: CandidateSale; selectedSimulationId: string; simulations: CreditSimulation[] }) {
  const selected = simulations.find((simulation) => simulation.id === selectedSimulationId) ?? simulations[0];
  return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-3"><Metric label={copy.modals.creditSale.financedAmount} value={formatMoney(financedAmount, sale.currency)} /><Metric label={copy.modals.creditSale.firstDueDate} value={firstDueDate} /><Metric label={copy.modals.creditSale.totalPayable} value={selected ? formatMoney(selected.totalPayable, sale.currency) : '—'} /></div><h3 className="text-lg font-medium text-slate-950 dark:text-white">{copy.modals.creditSale.simulations}</h3>{simulations.map((simulation) => <SimulationCard key={simulation.id} copy={copy} currency={sale.currency} simulation={simulation} selected={selectedSimulationId === simulation.id} onSelect={onSelect} />)}</div>;
}

function SaleSummary({ compact = false, copy, sale }: { compact?: boolean; copy: ReceivablesTranslations; sale: CandidateSale }) { return <div className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900', compact ? 'p-3' : 'p-4')}><p className="text-sm font-medium text-slate-950 dark:text-white">{sale.customerName}</p><p className="mt-1 text-sm font-medium text-slate-500">{sale.saleNumber} · {sale.unit} - {sale.business}</p><p className={cn('mt-3 text-2xl font-medium', financeTextClass)}>{formatMoney(sale.amount, sale.currency)}</p><p className="mt-1 text-xs font-medium text-slate-500">{copy.modals.creditSale.source}: {sale.source.toUpperCase()} · {sale.currency}</p></div>; }
function Notice({ message, warning = false }: { message: string; warning?: boolean }) { return <div className={cn('rounded-2xl border p-4 text-sm font-medium', warning ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200' : financeSoftSurfaceClass)}>{message}</div>; }
function NumberField({ label, minimum = 0, onChange, value }: { label: string; minimum?: number; onChange: (value: number) => void; value: number }) { return <label className="space-y-2"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span><Input type="number" min={minimum} value={value} onChange={(event) => onChange(Number(event.target.value))} className="h-11 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950" /></label>; }
function DateField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) { return <label className="space-y-2"><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span><Input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950" /></label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-base font-medium text-slate-950 dark:text-white">{value}</p></div>; }
function SimulationCard({ copy, currency, onSelect, selected, simulation }: { copy: ReceivablesTranslations; currency: string; onSelect: (id: string) => void; selected: boolean; simulation: CreditSimulation }) { return <button type="button" onClick={() => onSelect(simulation.id)} className={cn('grid w-full gap-3 rounded-2xl border p-4 text-left transition sm:grid-cols-[1fr_130px_130px_130px]', selected ? 'border-[#147514] bg-[#147514]/10 shadow-sm dark:bg-emerald-400/10' : 'border-slate-200 bg-white hover:border-[#147514]/30 hover:bg-[#147514]/5 dark:border-slate-700 dark:bg-slate-900')}><div><div className="flex items-center gap-2">{selected ? <Check className={cn('h-4 w-4', financeTextClass)} /> : null}<p className="font-medium text-slate-950 dark:text-white">{simulation.name}</p></div><p className="mt-1 text-sm font-medium text-slate-500">{simulation.termMonths} {copy.modals.creditSale.months.toLowerCase()} · {formatPercent(simulation.annualInterestRate)}</p></div><Metric label={copy.modals.creditSale.monthlyPayment} value={formatMoney(simulation.monthlyPayment, currency)} /><Metric label={copy.modals.creditSale.totalInterest} value={formatMoney(simulation.totalInterest, currency)} /><Metric label={copy.modals.creditSale.totalPayable} value={formatMoney(simulation.totalPayable, currency)} /></button>; }
