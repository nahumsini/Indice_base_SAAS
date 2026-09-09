import { useLanguage } from '../shared/context';
import { getInductionCopy } from './translations/induction';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Landmark,
  PackageSearch,
  ReceiptText,
  ShoppingCart,
  Sparkles,
  Store,
  Target,
  Users,
  Workflow,
} from 'lucide-react';

export function IndiceInduction() {
  const { currentLanguage } = useLanguage();
  const { t, number } = getInductionCopy(currentLanguage.code);
  const pillars = [
    {
      title: t('lesson0'), icon: Users, color: '#59C3A5',
      promise: t('lesson1'),
      questions: [t('lesson2'), t('lesson3'), t('lesson4')],
      modules: t('lesson5'),
    },
    {
      title: t('lesson6'), icon: Workflow, color: '#F4C84A',
      promise: t('lesson7'),
      questions: [t('lesson8'), t('lesson9'), t('lesson10')],
      modules: t('lesson11'),
    },
    {
      title: t('lesson12'), icon: Boxes, color: '#FF6B63',
      promise: t('lesson13'),
      questions: [t('lesson14'), t('lesson15'), t('lesson16')],
      modules: t('lesson17'),
    },
    {
      title: t('lesson18'), icon: CircleDollarSign, color: '#2563EB',
      promise: t('lesson19'),
      questions: [t('lesson20'), t('lesson21'), t('lesson22')],
      modules: t('lesson23'),
    },
  ];

  const countries = [
    {
      country: t('lesson24'), flag: '🇲🇽',
      opportunity: t('lesson25'),
      conversation: t('lesson26'),
      entry: t('lesson27'),
    },
    {
      country: t('lesson28'), flag: '🇨🇴',
      opportunity: t('lesson29'),
      conversation: t('lesson30'),
      entry: t('lesson31'),
    },
    {
      country: t('lesson32'), flag: '🇨🇦',
      opportunity: t('lesson33'),
      conversation: t('lesson34'),
      entry: t('lesson35'),
    },
    {
      country: t('lesson36'), flag: '🇺🇸',
      opportunity: t('lesson37'),
      conversation: t('lesson38'),
      entry: t('lesson39'),
    },
    {
      country: t('lesson40'), flag: '🇧🇷',
      opportunity: t('lesson41'),
      conversation: t('lesson42'),
      entry: t('lesson43'),
    },
  ];

  const modules = [
    {
      title: t('lesson44'), icon: Building2, color: '#2563EB', purpose: t('lesson45'),
      functions: [t('lesson46'), t('lesson47'), t('lesson48'), t('lesson49')],
      value: t('lesson50'),
    },
    {
      title: t('lesson51'), icon: Users, color: '#59C3A5', purpose: t('lesson52'),
      functions: [t('lesson53'), t('lesson54'), t('lesson55'), t('lesson56')],
      value: t('lesson57'),
    },
    {
      title: t('lesson58'), icon: Workflow, color: '#F4C84A', purpose: t('lesson59'),
      functions: [t('lesson60'), t('lesson61'), t('lesson62'), t('lesson63')],
      value: t('lesson64'),
    },
    {
      title: t('lesson65'), icon: ReceiptText, color: '#177D66', purpose: t('lesson66'),
      functions: [t('lesson67'), t('lesson68'), t('lesson69'), t('lesson70')],
      value: t('lesson71'),
    },
    {
      title: t('lesson72'), icon: Landmark, color: '#177D66', purpose: t('lesson73'),
      functions: [t('lesson74'), t('lesson75'), t('lesson76'), t('lesson77')],
      value: t('lesson78'),
    },
    {
      title: t('lesson79'), icon: Store, color: '#FF6B63', purpose: t('lesson80'),
      functions: [t('lesson81'), t('lesson82'), t('lesson83'), t('lesson84')],
      value: t('lesson85'),
    },
    {
      title: t('lesson86'), icon: ShoppingCart, color: '#FF6B63', purpose: t('lesson87'),
      functions: [t('lesson88'), t('lesson89'), t('lesson90'), t('lesson91')],
      value: t('lesson92'),
    },
    {
      title: t('lesson93'), icon: PackageSearch, color: '#FF6B63', purpose: t('lesson94'),
      functions: [t('lesson95'), t('lesson96'), t('lesson97'), t('lesson98')],
      value: t('lesson99'),
    },
    {
      title: t('lesson100'), icon: ClipboardList, color: '#177D66', purpose: t('lesson101'),
      functions: [t('lesson102'), t('lesson103'), t('lesson104'), t('lesson105')],
      value: t('lesson106'),
    },
    {
      title: t('kpis'), icon: BarChart3, color: '#8B5CF6', purpose: t('lesson107'),
      functions: [t('lesson108'), t('lesson109'), t('lesson110'), t('lesson111')],
      value: t('lesson112'),
    },
  ];

  const operatingJourney = [
    { title: t('lesson113'), text: t('lesson114') },
    { title: t('lesson115'), text: t('lesson116') },
    { title: t('lesson117'), text: t('lesson118') },
    { title: t('lesson119'), text: t('lesson120') },
    { title: t('lesson121'), text: t('lesson122') },
    { title: t('lesson123'), text: t('lesson124') },
    { title: t('lesson125'), text: t('lesson126') },
  ];

  const painScenarios = [
    {
      pain: t('lesson127'),
      diagnosis: t('lesson128'),
      module: t('lesson72'),
      pillar: t('lesson18'),
      result: t('lesson129'),
    },
    {
      pain: t('lesson130'),
      diagnosis: t('lesson131'),
      module: t('lesson51'),
      pillar: t('lesson0'),
      result: t('lesson132'),
    },
    {
      pain: t('lesson133'),
      diagnosis: t('lesson134'),
      module: t('lesson58'),
      pillar: t('lesson6'),
      result: t('lesson135'),
    },
    {
      pain: t('lesson136'),
      diagnosis: t('lesson137'),
      module: t('lesson86'),
      pillar: t('lesson12'),
      result: t('lesson138'),
    },
    {
      pain: t('lesson139'),
      diagnosis: t('lesson140'),
      module: t('lesson93'),
      pillar: t('lesson12'),
      result: t('lesson141'),
    },
  ];

  const knowledgeOptions = [
    { label: t('lesson142'), correct: false, feedback: t('lesson143') },
    { label: t('lesson144'), correct: true, feedback: t('lesson145') },
    { label: t('lesson146'), correct: false, feedback: t('lesson147') },
  ];

  const [activePillar, setActivePillar] = useState(0);
  const [activeJourneyStep, setActiveJourneyStep] = useState(0);
  const [activeCountry, setActiveCountry] = useState(0);
  const [activeScenario, setActiveScenario] = useState(0);
  const [activeModule, setActiveModule] = useState(0);
  const [knowledgeAnswer, setKnowledgeAnswer] = useState<number | null>(null);

  const selectedPillar = pillars[activePillar];
  const SelectedPillarIcon = selectedPillar.icon;
  const selectedMarket = countries[activeCountry];
  const selectedScenario = painScenarios[activeScenario];
  const selectedModule = modules[activeModule];
  const SelectedModuleIcon = selectedModule.icon;

  return (
    <div className="space-y-6" data-training-view="induction">
      <section className="overflow-hidden rounded-xl border border-[#59C3A5]/25 bg-white dark:border-[#59C3A5]/30 dark:bg-slate-900">
        <div className="grid lg:grid-cols-[1.15fr_.85fr]">
          <div className="p-6 lg:p-8">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#59C3A5]/15 text-[#177D66] dark:text-[#8FE0CA]"><Sparkles className="h-5 w-5" /></span><div><p className="text-xs font-medium text-[#177D66] dark:text-[#8FE0CA]">{t('lesson148')}</p><p className="text-xs text-slate-500 dark:text-slate-400">{t('lesson149')}</p></div></div>
            <h2 className="mt-5 max-w-3xl text-3xl font-medium leading-tight text-slate-950 dark:text-white">{t('lesson150')}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{t('lesson151')}</p>
            <div className="mt-6 flex flex-wrap gap-2">{[t('lesson152'), t('lesson153'), t('lesson154')].map((item, index) => <span key={item} className="inline-flex items-center gap-2 rounded-full border border-[#59C3A5]/25 bg-[#59C3A5]/5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#177D66] text-[10px] text-white">{number(index + 1)}</span>{item}</span>)}</div>
          </div>
          <div className="border-t border-[#59C3A5]/20 bg-[#59C3A5]/8 p-6 dark:bg-[#59C3A5]/10 lg:border-l lg:border-t-0">
            <p className="text-xs font-medium text-[#177D66] dark:text-[#8FE0CA]">{t('lesson155')}</p>
            <blockquote className="mt-3 text-lg leading-7 text-slate-900 dark:text-white">{t('lesson156')}</blockquote>
            <div className="mt-5 rounded-xl border border-white/70 bg-white/80 p-4 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300"><span className="font-medium text-slate-900 dark:text-white">{t('lesson157')}</span>  {t('lesson158')}</div>
          </div>
        </div>
      </section>

      <InteractiveSection number={number(1, 2)} eyebrow={t('lesson159')} title={t('lesson160')} description={t('lesson161')}>
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1" role="tablist" aria-label={t('lesson162')}>{pillars.map((pillar, index) => { const Icon = pillar.icon; const active = index === activePillar; return <button key={pillar.title} type="button" role="tab" aria-selected={active} onClick={() => setActivePillar(index)} className={`flex min-h-14 items-center gap-3 rounded-xl border p-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5] ${active ? 'border-transparent bg-slate-950 text-white dark:bg-white dark:text-slate-950' : 'border-slate-200 bg-white text-slate-700 hover:border-[#59C3A5] hover:bg-[#59C3A5]/5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: active ? `${pillar.color}30` : `${pillar.color}18`, color: active ? '#fff' : pillar.color }}><Icon className="h-4 w-4" /></span><span>{pillar.title}</span></button>; })}</div>
          <article role="tabpanel" className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${selectedPillar.color}18`, color: selectedPillar.color }}><SelectedPillarIcon className="h-6 w-6" /></span><div><p className="text-xs font-medium" style={{ color: selectedPillar.color }}>{t('pillarCount', { current: activePillar + 1, total: pillars.length })}</p><h4 className="mt-1 text-xl font-medium text-slate-950 dark:text-white">{selectedPillar.title}</h4><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{selectedPillar.promise}</p></div></div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">{selectedPillar.questions.map((question) => <div key={question} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><Target className="h-4 w-4" style={{ color: selectedPillar.color }} /><p className="mt-3 text-sm leading-5 text-slate-700 dark:text-slate-200">{question}</p></div>)}</div>
            <p className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300"><span className="font-medium text-slate-900 dark:text-white">{t('lesson165')}</span> {selectedPillar.modules}</p>
          </article>
        </div>
      </InteractiveSection>

      <InteractiveSection number={number(2, 2)} eyebrow={t('lesson166')} title={t('lesson167')} description={t('lesson168')}>
        <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7" role="tablist" aria-label={t('lesson169')}>{operatingJourney.map((step, index) => <button key={step.title} type="button" role="tab" aria-selected={activeJourneyStep === index} onClick={() => setActiveJourneyStep(index)} className={`min-h-20 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${activeJourneyStep === index ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}><span className="text-xs opacity-70">{number(index + 1, 2)}</span><span className="mt-2 block text-sm font-medium leading-5">{step.title}</span></button>)}</div>
        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-blue-50 p-4 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100"><div><p className="text-xs font-medium text-blue-700 dark:text-blue-300">{t('stageCount', { current: activeJourneyStep + 1 })}</p><p className="mt-1 text-sm leading-6">{operatingJourney[activeJourneyStep].text}</p></div><div className="flex shrink-0 gap-2"><IconButton label={t('lesson171')} disabled={activeJourneyStep === 0} onClick={() => setActiveJourneyStep((value) => Math.max(0, value - 1))}><ArrowLeft className="h-4 w-4" /></IconButton><IconButton label={t('lesson172')} disabled={activeJourneyStep === operatingJourney.length - 1} onClick={() => setActiveJourneyStep((value) => Math.min(operatingJourney.length - 1, value + 1))}><ArrowRight className="h-4 w-4" /></IconButton></div></div>
      </InteractiveSection>

      <InteractiveSection number={number(3, 2)} eyebrow={t('lesson173')} title={t('lesson174')} description={t('lesson175')}>
        <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
          <div className="space-y-2" role="listbox" aria-label={t('lesson176')}>{painScenarios.map((scenario, index) => <button key={scenario.pain} type="button" role="option" aria-selected={activeScenario === index} onClick={() => setActiveScenario(index)} className={`w-full rounded-xl border p-4 text-left text-sm leading-5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5] ${activeScenario === index ? 'border-[#177D66] bg-[#59C3A5]/10 text-slate-950 dark:text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>{scenario.pain}</button>)}</div>
          <div className="rounded-xl bg-slate-950 p-5 text-white dark:bg-slate-800">
            <p className="text-xs font-medium text-[#8FE0CA]">{t('lesson177')}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><ReasoningCard label={t('lesson178')} value={selectedScenario.pain} /><ReasoningCard label={t('lesson179')} value={selectedScenario.diagnosis} /><ReasoningCard label={t('lesson180')} value={`${selectedScenario.pillar} · ${selectedScenario.module}`} /><ReasoningCard label={t('lesson182')} value={selectedScenario.result} /></div>
            <p className="mt-5 border-t border-white/10 pt-4 text-sm leading-6 text-slate-300"><span className="font-medium text-white">{t('lesson183')}</span>  {t('lesson184')}</p>
          </div>
        </div>
      </InteractiveSection>

      <InteractiveSection number={number(4, 2)} eyebrow={t('lesson185')} title={t('lesson186')} description={t('lesson187')}>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('lesson188')}>{countries.map((market, index) => <button key={market.country} type="button" role="tab" aria-selected={activeCountry === index} onClick={() => setActiveCountry(index)} className={`rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5] ${activeCountry === index ? 'border-[#177D66] bg-[#177D66] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>{market.flag} {market.country}</button>)}</div>
        <article className="mt-5 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60 lg:grid-cols-[1.1fr_.9fr]">
          <div><p className="text-xs font-medium text-[#177D66] dark:text-[#8FE0CA]">{t('marketOpportunity', { country: selectedMarket.country })}</p><p className="mt-2 text-base leading-7 text-slate-800 dark:text-slate-100">{selectedMarket.opportunity}</p></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><InfoCard label={t('lesson190')} value={selectedMarket.conversation} tone="blue" /><InfoCard label={t('lesson191')} value={selectedMarket.entry} tone="aqua" /></div>
        </article>
      </InteractiveSection>

      <InteractiveSection number={number(5, 2)} eyebrow={t('lesson192')} title={t('lesson193')} description={t('lesson194')}>
        <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label={t('lesson195')}>{modules.map((module, index) => <button key={module.title} type="button" role="tab" aria-selected={activeModule === index} onClick={() => setActiveModule(index)} className={`shrink-0 rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5] ${activeModule === index ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950' : 'border-slate-200 bg-white text-slate-600 hover:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>{module.title}</button>)}</div>
        <article className="mt-4 grid gap-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-[.8fr_1.2fr]">
          <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${selectedModule.color}18`, color: selectedModule.color }}><SelectedModuleIcon className="h-6 w-6" /></span><div><h4 className="text-xl font-medium text-slate-950 dark:text-white">{selectedModule.title}</h4><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{selectedModule.purpose}</p><p className="mt-4 rounded-xl bg-[#59C3A5]/10 p-4 text-sm leading-6 text-slate-700 dark:text-slate-200"><span className="font-medium text-[#177D66] dark:text-[#8FE0CA]">{t('lesson196')}</span> {selectedModule.value}</p></div></div>
          <div className="grid gap-3 sm:grid-cols-2">{selectedModule.functions.map((feature) => <div key={feature} className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200"><CheckCircle2 className="h-5 w-5 shrink-0 text-[#177D66] dark:text-[#8FE0CA]" />{feature}</div>)}</div>
        </article>
      </InteractiveSection>

      <section className="rounded-xl border border-[#59C3A5]/30 bg-[#59C3A5]/10 p-5 dark:bg-[#59C3A5]/10">
        <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-xs font-medium text-[#177D66] dark:text-[#8FE0CA]">{t('lesson197')}</p><h3 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">{t('lesson198')}</h3><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t('lesson199')}</p></div><div className="space-y-2">{knowledgeOptions.map((option, index) => { const selected = knowledgeAnswer === index; return <button key={option.label} type="button" onClick={() => setKnowledgeAnswer(index)} className={`w-full rounded-xl border p-4 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5] ${selected ? option.correct ? 'border-[#177D66] bg-white text-slate-950 dark:bg-slate-900 dark:text-white' : 'border-rose-300 bg-rose-50 text-rose-950 dark:bg-rose-950/30 dark:text-rose-100' : 'border-white/80 bg-white/70 text-slate-700 hover:border-[#59C3A5] dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200'}`}><span className="flex items-start gap-3"><span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selected ? option.correct ? 'border-[#177D66] bg-[#177D66] text-white' : 'border-rose-500 bg-rose-500 text-white' : 'border-slate-300'}`}>{selected ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}</span><span><span>{option.label}</span>{selected ? <span className="mt-2 block text-xs leading-5 opacity-80">{option.feedback}</span> : null}</span></span></button>; })}</div></div>
      </section>
    </div>
  );
}

function InteractiveSection({ number, eyebrow, title, description, children }: { number: string; eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:p-6"><div className="mb-5 flex items-start gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#59C3A5]/15 text-sm font-medium text-[#177D66] dark:text-[#8FE0CA]">{number}</span><div><p className="text-xs font-medium text-[#177D66] dark:text-[#8FE0CA]">{eyebrow}</p><h3 className="mt-1 text-2xl font-medium text-slate-950 dark:text-white">{title}</h3><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p></div></div>{children}</section>;
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="grid h-9 w-9 place-items-center rounded-xl border border-blue-200 bg-white text-blue-700 transition hover:border-blue-400 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-200">{children}</button>;
}

function ReasoningCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs font-medium text-[#8FE0CA]">{label}</p><p className="mt-2 text-sm leading-6 text-slate-200">{value}</p></div>;
}

function InfoCard({ label, value, tone }: { label: string; value: string; tone: 'blue' | 'aqua' }) {
  const toneClasses = tone === 'blue' ? 'bg-blue-50 text-blue-950 dark:bg-blue-950/35 dark:text-blue-100' : 'bg-[#59C3A5]/10 text-slate-800 dark:text-slate-100';
  return <div className={`rounded-xl p-4 ${toneClasses}`}><p className="text-xs font-medium opacity-70">{label}</p><p className="mt-2 text-sm leading-6">{value}</p></div>;
}
