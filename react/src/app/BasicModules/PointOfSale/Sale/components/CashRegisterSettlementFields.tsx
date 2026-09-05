import { useEffect, useMemo, useState } from 'react';
import { Banknote, Building2, CreditCard, Landmark, Loader2, Smartphone, WalletCards } from 'lucide-react';
import {
  posBackendApi,
  type PosCheckoutPaymentMethod,
  type PosSettlementRule,
  type PosSettlementRulePayload,
  type PosTreasuryAccount,
} from '../services/posBackendApi';
import { useCashRegistersCopy } from '../../CashRegisters/cashRegistersTranslations';

const methods: Array<{
  key: PosCheckoutPaymentMethod;
  icon: typeof Banknote;
}> = [
  { key: 'CASH', icon: Banknote },
  { key: 'CARD', icon: CreditCard },
  { key: 'TRANSFER', icon: Landmark },
  { key: 'WALLET', icon: Smartphone },
  { key: 'CREDIT', icon: WalletCards },
];

type Props = {
  currencyCode: string;
  disabled?: boolean;
  initialRules?: PosSettlementRule[] | PosSettlementRulePayload[];
  registerId?: number;
  retainedCashAmount: number;
  rules: PosSettlementRulePayload[];
  warehouseId?: number;
  onRetainedCashAmountChange: (amount: number) => void;
  onRulesChange: (rules: PosSettlementRulePayload[]) => void;
};

const allowedForMethod = (method: PosCheckoutPaymentMethod, account: PosTreasuryAccount) => {
  if (method === 'CASH') return account.type === 'CASH' || account.type === 'BANK';
  if (method === 'CARD') return account.type === 'BANK' || account.type === 'CREDIT_CARD';
  if (method === 'TRANSFER' || method === 'WALLET') return account.type === 'BANK';
  return false;
};

const defaultTiming = (
  method: PosCheckoutPaymentMethod,
  account?: PosTreasuryAccount,
): 'IMMEDIATE' | 'DEFERRED' => {
  if (method === 'CARD' || method === 'WALLET') return 'DEFERRED';
  if (method === 'CASH' && account?.type === 'BANK') return 'DEFERRED';
  if (account?.systemKey?.startsWith('POS_UNASSIGNED_')) return 'DEFERRED';
  return 'IMMEDIATE';
};

const buildDefaultRules = (accounts: PosTreasuryAccount[]): PosSettlementRulePayload[] => methods.map(({ key }) => {
  if (key === 'CREDIT') {
    return { paymentMethod: key, destinationPaymentAccountId: null, settlementTiming: 'IMMEDIATE', enabled: true };
  }
  const preferredSystemKey = key === 'CASH' ? 'UNIVERSAL_CASH:' : `POS_UNASSIGNED_${key}:`;
  const account = accounts.find((candidate) => candidate.systemKey?.startsWith(preferredSystemKey))
    ?? accounts.find((candidate) => allowedForMethod(key, candidate));
  return {
    paymentMethod: key,
    destinationPaymentAccountId: account?.id ?? null,
    settlementTiming: defaultTiming(key, account),
    enabled: true,
  };
});

const toPayload = (rule: PosSettlementRule | PosSettlementRulePayload): PosSettlementRulePayload => ({
  paymentMethod: rule.paymentMethod,
  destinationPaymentAccountId: rule.destinationPaymentAccountId ?? null,
  settlementTiming: rule.settlementTiming,
  enabled: rule.enabled,
});

export function CashRegisterSettlementFields({
  currencyCode,
  disabled = false,
  initialRules = [],
  onRetainedCashAmountChange,
  onRulesChange,
  registerId,
  retainedCashAmount,
  rules,
  warehouseId,
}: Props) {
  const { copy } = useCashRegistersCopy();
  const [accounts, setAccounts] = useState<PosTreasuryAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currencyCode || (!registerId && !warehouseId)) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    const load = async () => {
      try {
        const [nextAccounts, persistedRules] = await Promise.all([
          registerId
            ? posBackendApi.getCashRegisterSettlementAccounts(registerId, currencyCode)
            : posBackendApi.getWarehouseSettlementAccounts(warehouseId as number, currencyCode),
          registerId
            ? posBackendApi.getCashRegisterSettlementPolicy(registerId, currencyCode)
            : Promise.resolve(initialRules),
        ]);
        if (cancelled) return;
        setAccounts(nextAccounts);
        const configuredRules = persistedRules.length > 0
          ? persistedRules.map(toPayload)
          : buildDefaultRules(nextAccounts);
        onRulesChange(configuredRules);
      } catch (requestError) {
        if (!cancelled) {
          setAccounts([]);
          setError(requestError instanceof Error ? requestError.message : copy.settlement.loadError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
    // The form is deliberately reloaded only when its register, warehouse or currency changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copy.settlement.loadError, currencyCode, registerId, warehouseId]);

  const rulesByMethod = useMemo(() => new Map(rules.map((rule) => [rule.paymentMethod, rule])), [rules]);
  const updateRule = (method: PosCheckoutPaymentMethod, patch: Partial<PosSettlementRulePayload>) => {
    const current = rulesByMethod.get(method) ?? buildDefaultRules(accounts).find((rule) => rule.paymentMethod === method)!;
    onRulesChange(methods.map(({ key }) => {
      const existing = rulesByMethod.get(key) ?? buildDefaultRules(accounts).find((rule) => rule.paymentMethod === key)!;
      return key === method ? { ...current, ...patch } : existing;
    }));
  };

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/40">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-sm font-medium text-slate-950 dark:text-white">{copy.settlement.title}</h4>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {copy.settlement.description(currencyCode)}
          </p>
        </div>
        {loading ? <span className="inline-flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{copy.settlement.loading}</span> : null}
      </div>

      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</div> : null}

      <label className="block rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{copy.settlement.retainedTitle}</span>
        <span className="mt-1 block text-xs text-slate-500">{copy.settlement.retainedHelp}</span>
        <div className="relative mt-3 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            disabled={disabled}
            value={Number.isFinite(retainedCashAmount) ? retainedCashAmount : 0}
            onChange={(event) => onRetainedCashAmountChange(Math.max(0, Number(event.target.value) || 0))}
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
        </div>
      </label>

      <div className="space-y-2">
        {methods.map(({ key, icon: Icon }) => {
          const rule = rulesByMethod.get(key);
          const methodCopy = copy.settlement.methods[key];
          const enabled = rule?.enabled ?? true;
          const eligibleAccounts = accounts.filter((account) => allowedForMethod(key, account));
          const destinationAccount = accounts.find((account) => account.id === rule?.destinationPaymentAccountId);
          const timingIsFixed = key !== 'TRANSFER' || destinationAccount?.systemKey?.startsWith('POS_UNASSIGNED_');
          return (
            <div key={key} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-[minmax(13rem,0.8fr)_minmax(16rem,1.2fr)] lg:items-center">
              <label className="flex min-w-0 items-start gap-3">
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={disabled || key === 'CASH'}
                  onChange={(event) => updateRule(key, { enabled: event.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#FF6B5E] focus:ring-[#FF6B5E]"
                />
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#FFF0EE] text-[#B63B32] dark:bg-[#FF6B5E]/15 dark:text-[#FFB0AA]"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0">
                  <strong className="block text-sm font-medium text-slate-900 dark:text-white">{methodCopy.label}</strong>
                  <span className="mt-0.5 block text-xs leading-4 text-slate-500">{methodCopy.help}</span>
                </span>
              </label>
              {key === 'CREDIT' ? (
                <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">{copy.settlement.creditHelp}</span>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    aria-label={`${methodCopy.label} · ${copy.settlement.selectDestination}`}
                    disabled={disabled || loading || !enabled}
                    value={rule?.destinationPaymentAccountId ?? ''}
                    onChange={(event) => {
                      const account = accounts.find((candidate) => candidate.id === Number(event.target.value));
                      updateRule(key, {
                        destinationPaymentAccountId: account?.id ?? null,
                        settlementTiming: defaultTiming(key, account),
                      });
                    }}
                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="">{copy.settlement.selectDestination}</option>
                    {eligibleAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}{account.systemKey?.startsWith('POS_UNASSIGNED_') ? ` · ${copy.settlement.needsConfiguration}` : ''}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={`${methodCopy.label} · ${copy.settlement.settlementTiming}`}
                    disabled={disabled || loading || !enabled || timingIsFixed}
                    value={rule?.settlementTiming ?? defaultTiming(key, destinationAccount)}
                    onChange={(event) => updateRule(key, {
                      settlementTiming: event.target.value as 'IMMEDIATE' | 'DEFERRED',
                    })}
                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="IMMEDIATE">{copy.settlement.immediateTiming}</option>
                    <option value="DEFERRED">{copy.settlement.deferredTiming}</option>
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
        <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
        {copy.settlement.deferredHelp}
      </div>
    </section>
  );
}
