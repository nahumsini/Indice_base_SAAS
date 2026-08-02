import { useEffect, useMemo, useState } from 'react';
import { Gift, Plus, ReceiptText, SlidersHorizontal, Trash2, WalletCards } from 'lucide-react';
import { Button } from '../../../../../../../components/ui/button';
import { IndiceModalFrame } from '../../../../../../../components/indice-modal';
import { Switch } from '../../../../../../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../../../../components/ui/tabs';
import type { PayrollVariablePayCopy } from '../../../../translations/types';

export type VariablePayItem = {
    id: string;
    type: 'bonus' | 'commission' | 'adjustment';
    source: 'automatic' | 'manual';
    name: string;
    amount: number;
    taxable: boolean;
    included: boolean;
    notes?: string;
    metadata?: {
        baseAmount?: number;
        commissionRate?: number;
        integratesSBC?: boolean;
        applyToStatutoryPayroll?: boolean;
        affectsNetPay?: boolean;
    };
};

type VariablePayModalProps = {
    copy: PayrollVariablePayCopy;
    isOpen: boolean;
    employeeName: string;
    items: VariablePayItem[];
    onClose: () => void;
    onSave: (items: VariablePayItem[]) => void;
};

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const money = (value: number) => value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const toSafeNumber = (value: number) => (Number.isFinite(value) ? value : 0);

const defaultAdjustmentDraft = {
    reason: '',
    amount: 0,
    kind: 'earning' as 'earning' | 'deduction',
    taxable: false,
    affectsNetPay: true,
    notes: '',
};

const normalizeItem = (item: VariablePayItem): VariablePayItem => ({
    ...item,
    source: item.source === 'automatic' || item.source === 'manual' ? item.source : 'manual',
    metadata: {
        baseAmount: item.metadata?.baseAmount,
        commissionRate: item.metadata?.commissionRate,
        integratesSBC: item.metadata?.integratesSBC,
        applyToStatutoryPayroll: item.metadata?.applyToStatutoryPayroll,
        affectsNetPay: item.metadata?.affectsNetPay,
    },
});

export function VariablePayModal({
    copy,
    isOpen,
    employeeName,
    items,
    onClose,
    onSave,
}: VariablePayModalProps) {
    const bonusTemplates = copy.templates.bonuses;
    const commissionTemplates = copy.templates.commissions;
    const [localItems, setLocalItems] = useState<VariablePayItem[]>(items);
    const [addMode, setAddMode] = useState<'bonus' | 'commission' | 'adjustment' | null>(null);

    const [selectedBonusTemplateId, setSelectedBonusTemplateId] = useState<string>(bonusTemplates[0].id);
    const [selectedCommissionTemplateId, setSelectedCommissionTemplateId] = useState<string>(commissionTemplates[0].id);
    const [adjustmentDraft, setAdjustmentDraft] = useState(defaultAdjustmentDraft);

    useEffect(() => {
        setLocalItems(items.map(normalizeItem));
    }, [items, isOpen]);

    const bonuses = useMemo(
        () => localItems.filter((item) => item.type === 'bonus' && item.included),
        [localItems],
    );

    const commissions = useMemo(
        () => localItems.filter((item) => item.type === 'commission' && item.included),
        [localItems],
    );

    const adjustments = useMemo(
        () => localItems.filter((item) => item.type === 'adjustment' && item.included),
        [localItems],
    );

    const selectedBonusTemplate = useMemo(
        () => bonusTemplates.find((template) => template.id === selectedBonusTemplateId) ?? bonusTemplates[0],
        [selectedBonusTemplateId],
    );

    const selectedCommissionTemplate = useMemo(
        () => commissionTemplates.find((template) => template.id === selectedCommissionTemplateId) ?? commissionTemplates[0],
        [selectedCommissionTemplateId],
    );

    const selectedCommissionAmount = useMemo(
        () => toSafeNumber((selectedCommissionTemplate.defaultBaseAmount * selectedCommissionTemplate.defaultRate) / 100),
        [selectedCommissionTemplate],
    );

    const updateItem = (id: string, next: Partial<VariablePayItem>) => {
        setLocalItems((current) => current.map((item) => (item.id === id ? { ...item, ...next } : item)));
    };

    const removeItem = (id: string) => {
        // Exclude this item from the current payroll run without deleting source data.
        setLocalItems((current) => current.map((item) => (
            item.id === id ? { ...item, included: false } : item
        )));
    };

    const applyBonusTemplate = (template: PayrollVariablePayCopy['templates']['bonuses'][number]) => {
        setSelectedBonusTemplateId(template.id);
    };

    const applyCommissionTemplate = (template: PayrollVariablePayCopy['templates']['commissions'][number]) => {
        setSelectedCommissionTemplateId(template.id);
    };

    const addBonus = () => {
        setLocalItems((current) => [
            ...current,
            {
                id: makeId(),
                type: 'bonus',
                source: 'manual',
                name: selectedBonusTemplate.name,
                amount: toSafeNumber(selectedBonusTemplate.defaultAmount),
                taxable: true,
                included: true,
                metadata: {
                    integratesSBC: true,
                    applyToStatutoryPayroll: true,
                },
            },
        ]);
        setAddMode(null);
    };

    const addCommission = () => {
        setLocalItems((current) => [
            ...current,
            {
                id: makeId(),
                type: 'commission',
                source: 'manual',
                name: selectedCommissionTemplate.name,
                amount: selectedCommissionAmount,
                taxable: true,
                included: true,
                metadata: {
                    baseAmount: toSafeNumber(selectedCommissionTemplate.defaultBaseAmount),
                    commissionRate: toSafeNumber(selectedCommissionTemplate.defaultRate),
                    integratesSBC: true,
                    applyToStatutoryPayroll: true,
                },
            },
        ]);
        setAddMode(null);
    };

    const addAdjustment = () => {
        const reason = adjustmentDraft.reason.trim();
        const baseAmount = Math.abs(toSafeNumber(adjustmentDraft.amount));
        const signedAmount = adjustmentDraft.kind === 'deduction' ? -baseAmount : baseAmount;
        setLocalItems((current) => [
            ...current,
            {
                id: makeId(),
                type: 'adjustment',
                source: 'manual',
                name: reason || copy.manualAdjustmentFallback,
                amount: signedAmount,
                taxable: adjustmentDraft.taxable,
                included: true,
                notes: adjustmentDraft.notes.trim() || undefined,
                metadata: {
                    integratesSBC: false,
                    applyToStatutoryPayroll: false,
                    affectsNetPay: adjustmentDraft.affectsNetPay,
                },
            },
        ]);
        setAdjustmentDraft(defaultAdjustmentDraft);
        setAddMode(null);
    };

    const renderSummaryCard = (item: VariablePayItem, badgeLabel: string) => (
        <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/50">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.name}</p>
                    <span className="mt-1 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {badgeLabel}
                    </span>
                </div>
                <div className="min-w-[120px] text-right">
                    <p className="text-sm font-medium text-[#59C3A5] dark:text-blue-300">${money(item.amount)}</p>
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span>{copy.labels.taxable}</span>
                    <Switch checked={item.taxable} onCheckedChange={(checked) => updateItem(item.id, { taxable: checked })} />
                </label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 border-rose-200 px-2 text-rose-600 hover:bg-rose-50"
                    onClick={() => removeItem(item.id)}
                >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    {copy.labels.remove}
                </Button>
            </div>
        </div>
    );

    return (
        <>
            <IndiceModalFrame
                open={isOpen}
                onOpenChange={(open) => {
                    if (!open) onClose();
                }}
                modalType="operational-workspace"
                tone="aqua"
                icon={<WalletCards className="h-5 w-5" />}
                title={copy.title}
                description={employeeName}
                closeLabel={copy.actions.cancel}
                contentClassName="z-[140] h-[min(88vh,860px)] sm:max-w-[980px]"
                bodyClassName="px-5 py-4"
                footer={(
                    <>
                        <Button type="button" variant="outline" onClick={onClose}>{copy.actions.cancel}</Button>
                        <Button type="button" onClick={() => onSave(localItems)}>{copy.actions.saveChanges}</Button>
                    </>
                )}
            >
                        <Tabs defaultValue="bonuses" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="bonuses">{copy.tabs.bonuses}</TabsTrigger>
                                <TabsTrigger value="commissions">{copy.tabs.commissions}</TabsTrigger>
                                <TabsTrigger value="adjustments">{copy.tabs.adjustments}</TabsTrigger>
                            </TabsList>

                            <TabsContent value="bonuses" className="space-y-3">
                                <div className="flex justify-end">
                                    <Button type="button" size="sm" className="h-8 bg-[#59C3A5] px-2 text-slate-950 hover:bg-[#3AAE90]" onClick={() => setAddMode('bonus')}>
                                        <Plus className="mr-1 h-3.5 w-3.5" />
                                        {copy.actions.addBonus}
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {bonuses.length === 0 ? (
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{copy.empty.bonuses}</p>
                                    ) : bonuses.map((item) => renderSummaryCard(
                                        item,
                                        item.source === 'automatic' ? copy.badges.automaticBonus : copy.badges.manualBonus,
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="commissions" className="space-y-3">
                                <div className="flex justify-end">
                                    <Button type="button" size="sm" className="h-8 bg-[#59C3A5] px-2 text-slate-950 hover:bg-[#3AAE90]" onClick={() => setAddMode('commission')}>
                                        <Plus className="mr-1 h-3.5 w-3.5" />
                                        {copy.actions.addCommission}
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {commissions.length === 0 ? (
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{copy.empty.commissions}</p>
                                    ) : commissions.map((item) => renderSummaryCard(
                                        item,
                                        item.source === 'automatic' ? copy.badges.automaticCommission : copy.badges.manualCommission,
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="adjustments" className="space-y-3">
                                <div className="flex justify-end">
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="h-8 bg-[#59C3A5] px-2 text-slate-950 hover:bg-[#3AAE90]"
                                        onClick={() => {
                                            setAdjustmentDraft(defaultAdjustmentDraft);
                                            setAddMode('adjustment');
                                        }}
                                    >
                                        <Plus className="mr-1 h-3.5 w-3.5" />
                                        {copy.actions.addAdjustment}
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {adjustments.length === 0 ? (
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{copy.empty.adjustments}</p>
                                    ) : adjustments.map((item) => renderSummaryCard(item, copy.badges.manualAdjustment))}
                                </div>
                            </TabsContent>
                        </Tabs>
            </IndiceModalFrame>

            <IndiceModalFrame
                open={addMode === 'bonus'}
                onOpenChange={(open) => {
                    if (!open) setAddMode(null);
                }}
                modalType="standard-form"
                tone="aqua"
                icon={<Gift className="h-5 w-5" />}
                title={copy.labels.addManualBonus}
                description={selectedBonusTemplate.description}
                closeLabel={copy.actions.cancel}
                contentClassName="z-[230] sm:max-w-[760px]"
                overlayClassName="z-[220]"
                footer={(
                    <>
                        <Button type="button" variant="outline" onClick={() => setAddMode(null)}>{copy.actions.cancel}</Button>
                        <Button type="button" onClick={addBonus}>{copy.actions.addSelectedBonus}</Button>
                    </>
                )}
            >
                    <div className="space-y-3">
                        {bonusTemplates.map((template) => (
                            <button
                                key={template.id}
                                type="button"
                                onClick={() => applyBonusTemplate(template)}
                                className={`w-full rounded-xl border p-3 text-left ${selectedBonusTemplateId === template.id ? 'border-[#59C3A5] bg-[#59C3A5]/5' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/60'}`}
                            >
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{template.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{template.description}</p>
                            </button>
                        ))}
                    </div>
            </IndiceModalFrame>

            <IndiceModalFrame
                open={addMode === 'commission'}
                onOpenChange={(open) => {
                    if (!open) setAddMode(null);
                }}
                modalType="standard-form"
                tone="aqua"
                icon={<ReceiptText className="h-5 w-5" />}
                title={copy.labels.addManualCommission}
                description={selectedCommissionTemplate.description}
                closeLabel={copy.actions.cancel}
                contentClassName="z-[230] sm:max-w-[760px]"
                overlayClassName="z-[220]"
                footer={(
                    <>
                        <Button type="button" variant="outline" onClick={() => setAddMode(null)}>{copy.actions.cancel}</Button>
                        <Button type="button" onClick={addCommission}>{copy.actions.addSelectedCommission}</Button>
                    </>
                )}
            >
                    <div className="space-y-3">
                        {commissionTemplates.map((template) => (
                            <button
                                key={template.id}
                                type="button"
                                onClick={() => applyCommissionTemplate(template)}
                                className={`w-full rounded-xl border p-3 text-left ${selectedCommissionTemplateId === template.id ? 'border-[#59C3A5] bg-[#59C3A5]/5' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/60'}`}
                            >
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{template.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{template.description}</p>
                            </button>
                        ))}
                        <div className="rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
                            {copy.labels.commissionAmount}: <span className="font-medium text-slate-900 dark:text-slate-100">${money(selectedCommissionAmount)}</span>
                        </div>
                    </div>
            </IndiceModalFrame>

            <IndiceModalFrame
                open={addMode === 'adjustment'}
                onOpenChange={(open) => {
                    if (!open) {
                        setAdjustmentDraft(defaultAdjustmentDraft);
                        setAddMode(null);
                    }
                }}
                modalType="standard-form"
                tone="aqua"
                icon={<SlidersHorizontal className="h-5 w-5" />}
                title={copy.labels.addPayrollAdjustment}
                description={copy.labels.adjustmentSavedAs}
                closeLabel={copy.actions.cancel}
                contentClassName="z-[230] sm:max-w-[760px]"
                overlayClassName="z-[220]"
                footer={(
                    <>
                        <Button type="button" variant="outline" onClick={() => setAddMode(null)}>{copy.actions.cancel}</Button>
                        <Button
                            type="button"
                            onClick={addAdjustment}
                            disabled={!adjustmentDraft.reason.trim()}
                        >
                            {copy.actions.addAdjustment}
                        </Button>
                    </>
                )}
            >
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => setAdjustmentDraft((current) => ({ ...current, kind: 'earning' }))}
                                className={`h-9 rounded-md border px-3 text-left text-sm font-medium ${adjustmentDraft.kind === 'earning' ? 'border-[#59C3A5] bg-[#59C3A5]/5 text-[#59C3A5]' : 'border-slate-200 text-slate-700 dark:border-slate-600 dark:text-slate-200'}`}
                            >
                                {copy.labels.perception}
                            </button>
                            <button
                                type="button"
                                onClick={() => setAdjustmentDraft((current) => ({ ...current, kind: 'deduction' }))}
                                className={`h-9 rounded-md border px-3 text-left text-sm font-medium ${adjustmentDraft.kind === 'deduction' ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' : 'border-slate-200 text-slate-700 dark:border-slate-600 dark:text-slate-200'}`}
                            >
                                {copy.labels.deduction}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <label className="text-xs text-slate-600 dark:text-slate-300">{copy.labels.reason}
                                <input
                                    value={adjustmentDraft.reason}
                                    onChange={(event) => setAdjustmentDraft((current) => ({ ...current, reason: event.target.value }))}
                                    placeholder={copy.labels.placeholderReason}
                                    className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                                />
                            </label>
                            <label className="text-xs text-slate-600 dark:text-slate-300">{copy.labels.amount}
                                <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={Math.abs(adjustmentDraft.amount)}
                                    onChange={(event) => setAdjustmentDraft((current) => ({ ...current, amount: Math.abs(Number(event.target.value) || 0) }))}
                                    className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                                />
                            </label>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {copy.labels.adjustmentSavedAs} {adjustmentDraft.kind === 'deduction' ? copy.labels.negativeAmount : copy.labels.positiveAmount} {copy.labels.amountSuffix}
                        </p>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <label className="flex items-center justify-between rounded-md border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700">
                                {copy.labels.taxable}
                                <Switch
                                    checked={adjustmentDraft.taxable}
                                    onCheckedChange={(checked) => setAdjustmentDraft((current) => ({ ...current, taxable: checked }))}
                                />
                            </label>
                            <label className="flex items-center justify-between rounded-md border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700">
                                {copy.labels.affectsNetPay}
                                <Switch
                                    checked={adjustmentDraft.affectsNetPay}
                                    onCheckedChange={(checked) => setAdjustmentDraft((current) => ({ ...current, affectsNetPay: checked }))}
                                />
                            </label>
                        </div>

                        <label className="text-xs text-slate-600 dark:text-slate-300">{copy.labels.notes}
                            <input
                                value={adjustmentDraft.notes}
                                onChange={(event) => setAdjustmentDraft((current) => ({ ...current, notes: event.target.value }))}
                                className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                            />
                        </label>
                    </div>
            </IndiceModalFrame>
        </>
    );
}
