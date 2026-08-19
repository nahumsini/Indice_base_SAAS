import { useEffect, useState } from 'react';
import { BadgePercent, CalendarRange, Settings2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { usePreferredBusinessCurrency } from '../shared/BusinessCurrencyContext';
import { useSalesCrm } from './salesCrmContext';
import { salesApi, type SalesContextUser } from './salesApi';
import { CommissionRulesModal } from './Sales/components/CommissionRulesModal';
import { CommissionCutModal } from './Sales/components/CommissionCutModal';
import { CommissionsView } from './Sales/components/CommissionsView';
import { useSalesRecords } from './Sales/hooks/useSalesRecords';
import { useSalesTranslations } from './Sales/hooks/useSalesTranslations';
import { commissionRulesService } from './Sales/services/commissionRulesService';
import type { CommissionRule } from './Sales/types/commissions';
import {
  SalesTitleBar,
  salesTitleBarPrimaryActionClassName,
  salesTitleBarSecondaryActionClassName,
} from './components/SalesTitleBar';

type WorkspaceSection = 'generated' | 'cuts';

export default function SalesCommissions({ learningModeActive = false }: { learningModeActive?: boolean }) {
  const t = useSalesTranslations();
  const { products } = useSalesCrm();
  const { preferredCurrency } = usePreferredBusinessCurrency();
  const { records } = useSalesRecords(preferredCurrency);
  const [section, setSection] = useState<WorkspaceSection>('generated');
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [users, setUsers] = useState<SalesContextUser[]>([]);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [cutOpen, setCutOpen] = useState(false);
  const [cutCreated, setCutCreated] = useState(false);
  const [cutRefreshKey, setCutRefreshKey] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void Promise.all([commissionRulesService.list(), salesApi.context()])
      .then(([loadedRules, context]) => {
        if (cancelled) return;
        setRules(loadedRules);
        setUsers(context.users.filter((user) => user.status !== 'inactive'));
      })
      .catch(() => !cancelled && setError(t.commissionWorkspace.loadError));
    return () => { cancelled = true; };
  }, []);

  const saveRule = async (rule: CommissionRule) => {
    const saved = await commissionRulesService.save(rule);
    setRules((current) => current.some((item) => item.id === saved.id)
      ? current.map((item) => item.id === saved.id ? saved : item)
      : [...current, saved]);
    return saved;
  };

  const deleteRule = async (rule: CommissionRule) => {
    await commissionRulesService.delete(rule);
    setRules((current) => current.filter((item) => item.id !== rule.id));
  };

  const sections: Array<{ id: WorkspaceSection; label: string; icon: typeof BadgePercent }> = [
    { id: 'generated', label: t.commissionWorkspace.generated, icon: BadgePercent },
    { id: 'cuts', label: t.commissionWorkspace.cuts, icon: CalendarRange },
  ];

  return (
    <section className="space-y-5">
      <SalesTitleBar
        icon={<BadgePercent className="h-6 w-6" />}
        title={t.commissionWorkspace.title}
        subtitle={t.commissionWorkspace.subtitle}
        actions={(
          <>
            <Button variant="outline" className={salesTitleBarSecondaryActionClassName} onClick={() => { setSection('cuts'); setCutOpen(true); }}><CalendarRange className="h-4 w-4" />{t.commissionWorkspace.generateCut}</Button>
            <Button className={salesTitleBarPrimaryActionClassName} onClick={() => setRulesOpen(true)}><Settings2 className="h-4 w-4" />{t.commissionWorkspace.managePolicies}</Button>
          </>
        )}
      />

      <nav className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900" aria-label={t.commissionWorkspace.sectionsLabel}>
        {sections.map(({ id, label, icon: Icon }) => <Button key={id} type="button" variant="ghost" className={`h-11 rounded-lg px-5 text-sm font-medium focus-visible:ring-[#FF6B5E]/30 ${section === id ? 'bg-[#FF6B5E] text-[#222831] shadow-md hover:bg-[#E85C50]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'}`} onClick={() => setSection(id)}><Icon className="h-4 w-4" />{label}</Button>)}
      </nav>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300">{error}</div> : null}

      {section === 'generated' ? <CommissionsView learningModeActive={learningModeActive} sales={records} rules={rules} t={t} section="generated" /> : null}
      {section === 'cuts' ? <CommissionsView learningModeActive={learningModeActive} sales={records} rules={rules} t={t} section="cuts" cutCreated={cutCreated} cutRefreshKey={cutRefreshKey} /> : null}
      <CommissionRulesModal open={rulesOpen} rules={rules} sales={records} users={users} products={products} t={t} onOpenChange={setRulesOpen} onDeleteRule={deleteRule} onSaveRule={saveRule} />
      <CommissionCutModal open={cutOpen} sales={records} t={t} onOpenChange={setCutOpen} onCreated={() => { setCutCreated(true); setCutRefreshKey((current) => current + 1); }} />
    </section>
  );
}
