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
      .catch(() => !cancelled && setError('No se pudo cargar la configuración de comisiones.'));
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
    { id: 'generated', label: 'Comisiones generadas', icon: BadgePercent },
    { id: 'cuts', label: 'Cortes', icon: CalendarRange },
  ];

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-[#FF6B5E]/25 bg-[#FF6B5E]/[0.08] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-[#FF6B5E]/15 p-2 text-[#B63B32]"><BadgePercent className="h-6 w-6" /></span>
            <div><h2 className="text-xl font-medium text-slate-950">Comisiones</h2><p className="mt-1 text-sm text-slate-600">Define cómo se gana, revisa lo generado y controla el envío de cada corte hacia Incentivos y Nómina.</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="shrink-0 rounded-lg border-[#FF6B5E]/35 bg-white text-[#B63B32] shadow-sm hover:bg-[#FF6B5E]/10" onClick={() => { setSection('cuts'); setCutOpen(true); }}><CalendarRange className="h-4 w-4" />Generar corte</Button>
            <Button className="shrink-0 rounded-lg bg-[#FF6B5E] text-[#222831] shadow-sm hover:bg-[#E85C50] focus-visible:ring-[#FF6B5E]/30" onClick={() => setRulesOpen(true)}><Settings2 className="h-4 w-4" />Administrar políticas</Button>
          </div>
        </div>
      </div>

      <nav className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Secciones de comisiones">
        {sections.map(({ id, label, icon: Icon }) => <Button key={id} type="button" variant="ghost" className={`h-11 rounded-lg px-5 text-sm font-medium focus-visible:ring-[#FF6B5E]/30 ${section === id ? 'bg-[#FF6B5E] text-[#222831] shadow-md hover:bg-[#E85C50]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`} onClick={() => setSection(id)}><Icon className="h-4 w-4" />{label}</Button>)}
      </nav>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

      {section === 'generated' ? <CommissionsView learningModeActive={learningModeActive} sales={records} rules={rules} t={t} section="generated" /> : null}
      {section === 'cuts' ? <CommissionsView learningModeActive={learningModeActive} sales={records} rules={rules} t={t} section="cuts" cutCreated={cutCreated} cutRefreshKey={cutRefreshKey} /> : null}
      <CommissionRulesModal open={rulesOpen} rules={rules} sales={records} users={users} products={products} t={t} onOpenChange={setRulesOpen} onDeleteRule={deleteRule} onSaveRule={saveRule} />
      <CommissionCutModal open={cutOpen} sales={records} onOpenChange={setCutOpen} onCreated={() => { setCutCreated(true); setCutRefreshKey((current) => current + 1); }} />
    </section>
  );
}
