import { useEffect, useMemo, useState } from 'react';
import { BadgePercent, Plus, RotateCcw, Save } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import { cn } from '../../../../components/ui/utils';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { SalesRecordsTranslations } from '../translations';
import type { CommissionRule, CommissionRuleStatus, CommissionType } from '../types/commissions';
import type { SaleRecord } from '../types/salesTypes';
import { calculateCommission, formatCommissionType } from '../utils/commissionRules';
import { formatSalesCurrency } from '../utils/salesFormatters';
import { FormField, salesFieldClassName } from './SalesModalPrimitives';

const actionClassNames = getSalesModalActionClassNames('coral');
const commissionTypes: CommissionType[] = ['fixed_per_sale', 'fixed_per_product', 'percentage_of_sale', 'percentage_of_product'];
const ruleStatuses: CommissionRuleStatus[] = ['active', 'inactive'];

function createEmptyRule(): CommissionRule {
  return {
    id: '',
    name: '',
    userId: '',
    userName: '',
    productId: '',
    productName: '',
    categoryId: '',
    categoryName: '',
    type: 'percentage_of_sale',
    value: 0,
    validFrom: '',
    validUntil: '',
    status: 'active',
    priority: 50,
    notes: '',
  };
}

function uniqueOptions(values: Array<{ id: string; name: string }>) {
  return values
    .filter((option) => option.id && option.name)
    .filter((option, index, items) => items.findIndex((item) => item.id === option.id) === index)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function CommissionRulesModal({
  open,
  rules,
  sales,
  t,
  onOpenChange,
  onRulesChange,
}: {
  open: boolean;
  rules: CommissionRule[];
  sales: SaleRecord[];
  t: SalesRecordsTranslations;
  onOpenChange: (open: boolean) => void;
  onRulesChange: (rules: CommissionRule[]) => void;
}) {
  const [draft, setDraft] = useState<CommissionRule>(() => createEmptyRule());
  const [exampleSaleAmount, setExampleSaleAmount] = useState(50000);
  const [exampleQuantity, setExampleQuantity] = useState(1);

  useEffect(() => {
    if (open && !draft.id && !draft.name) {
      setDraft(createEmptyRule());
    }
  }, [draft.id, draft.name, open]);

  const userOptions = useMemo(
    () => uniqueOptions(sales.map((sale) => ({ id: sale.sellerId ?? sale.sellerName, name: sale.sellerName }))),
    [sales],
  );
  const productOptions = useMemo(
    () => uniqueOptions(sales.flatMap((sale) => sale.saleLines.map((line) => ({ id: line.productId, name: line.productName })))),
    [sales],
  );
  const previewCommission = useMemo(
    () => calculateCommission({
      type: draft.type,
      value: Number(draft.value) || 0,
      saleAmount: Number(exampleSaleAmount) || 0,
      productAmount: Number(exampleSaleAmount) || 0,
      quantity: Number(exampleQuantity) || 1,
    }),
    [draft.type, draft.value, exampleQuantity, exampleSaleAmount],
  );

  const handleSelectRule = (rule: CommissionRule) => {
    setDraft(rule);
  };

  const handleReset = () => {
    setDraft(createEmptyRule());
  };

  const handleSave = () => {
    const ruleId = draft.id || `COM-RULE-${String(rules.length + 1).padStart(3, '0')}`;
    const nextRule: CommissionRule = {
      ...draft,
      id: ruleId,
      name: draft.name.trim() || t.commissions.rules.defaultRuleName,
    };
    const exists = rules.some((rule) => rule.id === ruleId);

    onRulesChange(exists ? rules.map((rule) => (rule.id === ruleId ? nextRule : rule)) : [...rules, nextRule]);
    setDraft(nextRule);
  };

  return (
    <SalesModalFrame
      open={open}
      onOpenChange={onOpenChange}
      icon={<BadgePercent className="h-6 w-6" />}
      title={t.commissions.rules.title}
      description={t.commissions.rules.description}
      contentClassName="max-h-[90vh] max-w-[980px]"
      bodyClassName="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]"
      footer={(
        <>
          <Button type="button" variant="outline" className={actionClassNames.secondary} onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
            {t.commissions.rules.resetDraft}
          </Button>
          <Button type="button" className={actionClassNames.primary} onClick={handleSave}>
            <Save className="h-4 w-4" />
            {t.commissions.rules.saveRule}
          </Button>
        </>
      )}
    >
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase tracking-normal text-slate-500">{t.commissions.rules.sections.rules}</h3>
              <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-lg border-[#FF6B5E]/25 bg-white text-[#B63B32]" onClick={handleReset}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              {rules.length ? rules.map((rule) => (
                <button
                  key={rule.id}
                  type="button"
                  className={cn(
                    'w-full rounded-lg border bg-white p-3 text-left transition-colors dark:bg-slate-800',
                    draft.id === rule.id ? 'border-[#FF6B5E]/40 ring-2 ring-[#FF6B5E]/15' : 'border-slate-200 hover:border-[#FF6B5E]/25',
                  )}
                  onClick={() => handleSelectRule(rule)}
                >
                  <p className="font-black text-slate-950 dark:text-white">{rule.name}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{formatCommissionType(rule.type)} · {rule.value}</p>
                  <span className={cn(
                    'mt-2 inline-flex rounded-full border px-2 py-1 text-xs font-black uppercase tracking-normal',
                    rule.status === 'active'
                      ? 'border-[#59C3A5]/30 bg-[#59C3A5]/10 text-[#177d66]'
                      : 'border-slate-300 bg-slate-100 text-slate-500',
                  )}>
                    {t.commissions.ruleStatuses[rule.status]}
                  </span>
                </button>
              )) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm font-semibold text-slate-500">{t.commissions.rules.noRules}</div>
              )}
            </div>
          </section>

          <section className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label={t.commissions.rules.fields.ruleName}>
                <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className={salesFieldClassName} />
              </FormField>
              <FormField label={t.commissions.rules.fields.user}>
                <Select
                  value={draft.userId || 'all'}
                  onValueChange={(value) => {
                    const user = userOptions.find((option) => option.id === value);
                    setDraft((current) => ({ ...current, userId: value === 'all' ? '' : value, userName: user?.name ?? '' }));
                  }}
                >
                  <SelectTrigger className={salesFieldClassName}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.common.all}</SelectItem>
                    {userOptions.map((user) => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label={t.commissions.rules.fields.product}>
                <Select
                  value={draft.productId || 'all'}
                  onValueChange={(value) => {
                    const product = productOptions.find((option) => option.id === value);
                    setDraft((current) => ({ ...current, productId: value === 'all' ? '' : value, productName: product?.name ?? '' }));
                  }}
                >
                  <SelectTrigger className={salesFieldClassName}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.common.all}</SelectItem>
                    {productOptions.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label={t.commissions.rules.fields.category}>
                <Input value={draft.categoryName ?? ''} onChange={(event) => setDraft((current) => ({ ...current, categoryName: event.target.value }))} className={salesFieldClassName} />
              </FormField>
              <FormField label={t.commissions.rules.fields.type}>
                <Select value={draft.type} onValueChange={(value) => setDraft((current) => ({ ...current, type: value as CommissionType }))}>
                  <SelectTrigger className={salesFieldClassName}><SelectValue /></SelectTrigger>
                  <SelectContent>{commissionTypes.map((type) => <SelectItem key={type} value={type}>{t.commissions.types[type]}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label={t.commissions.rules.fields.value}>
                <Input type="number" value={draft.value} onChange={(event) => setDraft((current) => ({ ...current, value: Number(event.target.value) }))} className={salesFieldClassName} />
              </FormField>
              <FormField label={t.commissions.rules.fields.validFrom}>
                <Input type="date" value={draft.validFrom ?? ''} onChange={(event) => setDraft((current) => ({ ...current, validFrom: event.target.value }))} className={salesFieldClassName} />
              </FormField>
              <FormField label={t.commissions.rules.fields.validUntil}>
                <Input type="date" value={draft.validUntil ?? ''} onChange={(event) => setDraft((current) => ({ ...current, validUntil: event.target.value }))} className={salesFieldClassName} />
              </FormField>
              <FormField label={t.commissions.rules.fields.status}>
                <Select value={draft.status} onValueChange={(value) => setDraft((current) => ({ ...current, status: value as CommissionRuleStatus }))}>
                  <SelectTrigger className={salesFieldClassName}><SelectValue /></SelectTrigger>
                  <SelectContent>{ruleStatuses.map((status) => <SelectItem key={status} value={status}>{t.commissions.ruleStatuses[status]}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label={t.commissions.rules.fields.priority}>
                <Input type="number" value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: Number(event.target.value) }))} className={salesFieldClassName} />
              </FormField>
              <FormField label={t.commissions.rules.fields.notes}>
                <Textarea value={draft.notes ?? ''} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} className="min-h-24 rounded-lg border-slate-200 shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20" />
              </FormField>
              <div className="rounded-lg border border-[#59C3A5]/25 bg-[#59C3A5]/10 p-4">
                <p className="text-sm font-black text-[#177d66]">{t.commissions.rules.sections.preview}</p>
                <div className="mt-3 grid gap-3">
                  <Input type="number" value={exampleSaleAmount} onChange={(event) => setExampleSaleAmount(Number(event.target.value))} className={salesFieldClassName} aria-label={t.commissions.rules.fields.exampleSaleAmount} />
                  <Input type="number" value={exampleQuantity} onChange={(event) => setExampleQuantity(Number(event.target.value))} className={salesFieldClassName} aria-label={t.commissions.rules.fields.exampleQuantity} />
                </div>
                <p className="mt-4 text-xs font-black uppercase tracking-normal text-[#177d66]">{t.commissions.rules.estimatedCommission}</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{formatSalesCurrency(previewCommission)}</p>
              </div>
            </div>

            <p className="rounded-lg border border-[#FF6B5E]/20 bg-[#FF6B5E]/5 p-3 text-sm font-semibold leading-6 text-[#B63B32]">
              {t.commissions.rules.backendReadyNote}
            </p>
          </section>
    </SalesModalFrame>
  );
}
