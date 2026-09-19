import { useEffect, useState } from 'react';
import { ArrowRight, Bell, Bot, Building2, Check, ChevronDown, CircleDollarSign, CreditCard, Download, ExternalLink, GraduationCap, Globe, LayoutPanelTop, LogOut, MonitorSmartphone, Moon, Settings, ShieldCheck, Sun, User } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { IndiceWorkspaceNavigation } from '../../components/frontend-os/IndiceWorkspaceNavigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { getHeaderTranslations } from '../../components/header/translations';
import { customerJourneyUi, investmentOverviewParagraphs, investmentSections, investmentTabs, marketSignals, marketSource, partnerPortalUi, resolveInvestmentTab, type InvestmentItem, type InvestmentSection, type InvestmentTab } from './investmentContent';
import { investmentModuleCatalog } from './investmentModules';
import { investmentProformaAssumptions, investmentProformaCopy, investmentProformaMilestones, investmentProformaNetworks, investmentProformaOperatingBalanceRate, investmentProformaScenarios } from './investmentProforma';
import { getInvestmentUiCopy, investmentLanguages, type InvestmentLocale } from './investmentUiCopy';
import { useInvestmentMetadata } from './useInvestmentMetadata';
import './investment.css';

const tabEmojis: Record<InvestmentTab, string> = {
  overview: '🧭',
  modules: '🧩',
  market: '🎯',
  business: '💼',
  partners: '🤝',
  ai: '🤖',
  proforma: '📊',
};
const notificationModules = [
  ['humanResources', '👥'], ['processes', '✅'], ['finance', '💰'],
  ['expenses', '💸'], ['sales', '💼'], ['pos', '🛒'],
] as const;
const customerJourneyEmojis = ['👋', '🧭', '🚀', '🤝', '🗓️', '🌐'] as const;
const notificationModuleLabels = {
  es: { humanResources: 'Recursos Humanos', processes: 'Procesos y tareas', finance: 'Finanzas', expenses: 'Gastos', sales: 'Ventas', pos: 'Punto de venta' },
  en: { humanResources: 'Human Resources', processes: 'Processes & Tasks', finance: 'Finance', expenses: 'Expenses', sales: 'Sales', pos: 'Point of Sale' },
  fr: { humanResources: 'Ressources humaines', processes: 'Processus et tâches', finance: 'Finances', expenses: 'Dépenses', sales: 'Ventes', pos: 'Point de vente' },
  pt: { humanResources: 'Recursos Humanos', processes: 'Processos e tarefas', finance: 'Finanças', expenses: 'Despesas', sales: 'Vendas', pos: 'Ponto de venda' },
  ko: { humanResources: '인사 관리', processes: '프로세스 및 작업', finance: '재무', expenses: '비용', sales: '영업', pos: '판매 시점' },
  zh: { humanResources: '人力资源', processes: '流程和任务', finance: '财务', expenses: '费用', sales: '销售', pos: '销售点' },
} as const;

function EvidenceList({ emphasis = false, roadmap = false, title, items }: { emphasis?: boolean; roadmap?: boolean; title: string; items: readonly InvestmentItem[] }) {
  return <section className={`investment-evidence${emphasis ? ' investment-evidence--criteria' : ''}${roadmap ? ' investment-evidence--ai' : ''}`}><h3>{title}</h3><dl>{items.map((entry, index) => <div key={entry.title}><dt>{emphasis && <span className="investment-criterion-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>}<span>{entry.title}</span></dt><dd>{entry.description}</dd></div>)}</dl></section>;
}

function CustomerJourney({ locale, section }: { locale: InvestmentLocale; section: InvestmentSection }) {
  const journeyCopy = customerJourneyUi[locale];
  const phases = [section.items.slice(0, 3), section.items.slice(3, 6)];
  return <section className="investment-customer-journey" aria-labelledby="investment-customer-journey-title">
    <h3 id="investment-customer-journey-title">{section.itemsTitle}</h3>
    <div className="investment-customer-phases">{phases.map((steps, phaseIndex) => <section className="investment-customer-phase" key={journeyCopy.phases[phaseIndex]}>
      <header className="investment-customer-phase-heading"><span>{phaseIndex === 0 ? '01—03' : '04—06'}</span><h4>{journeyCopy.phases[phaseIndex]}</h4></header>
      <ol start={phaseIndex * 3 + 1}>{steps.map((entry, localIndex) => {
        const index = phaseIndex * 3 + localIndex;
        const isPivotal = index === 1;
        return <li className={`${isPivotal ? 'is-pivotal' : ''}${index === 4 ? ' is-included' : ''}`} key={entry.title}>
          <div className="investment-customer-step-heading"><span className="investment-customer-step-icon" aria-hidden="true">{customerJourneyEmojis[index]}</span><span className="investment-customer-step-number">{String(index + 1).padStart(2, '0')}</span></div>
          {isPivotal && <span className="investment-customer-highlight">{journeyCopy.highlight}</span>}
          <h5>{entry.title}</h5><p>{entry.description}</p>
        </li>;
      })}</ol>
    </section>)}</div>
  </section>;
}

function PartnerCertificationPanel({ locale, section }: { locale: InvestmentLocale; section: InvestmentSection }) {
  const portalCopy = partnerPortalUi[locale];
  return <section className="investment-partner-academy" aria-labelledby="investment-partner-academy-title">
    <header className="investment-partner-academy-heading">
      <span className="investment-partner-academy-icon" aria-hidden="true"><GraduationCap size={22} /></span>
      <div><p className="investment-eyebrow">{portalCopy.eyebrow}</p><h3 id="investment-partner-academy-title">{portalCopy.title}</h3><p>{portalCopy.description}</p></div>
      <span className="investment-partner-academy-badge"><ShieldCheck size={15} />{portalCopy.badge}</span>
    </header>
    <div className="investment-partner-certification-path">{section.evidence.map((entry, index) => <article key={entry.title}>
      <span>{String(index + 1).padStart(2, '0')}</span><h4>{entry.title}</h4><p>{entry.description}</p>
    </article>)}</div>
    <div className="investment-partner-library">
      <div className="investment-partner-library-heading"><div><h4>{portalCopy.libraryTitle}</h4><p>{portalCopy.libraryDescription}</p></div><a href="/distributor-portal?tab=training" target="_blank" rel="noopener noreferrer">{portalCopy.portalLink}<ExternalLink size={15} /></a></div>
      <div className="investment-partner-resources">{portalCopy.resources.map(resource => <a key={resource.id} href={`/api/v1/distributor-portal/training/resources/${resource.id}/pdf?download=true`} target="_blank" rel="noopener noreferrer" aria-label={`${portalCopy.downloadLabel}: ${resource.title}`}><Download size={17} /><span><small>{portalCopy.downloadLabel}</small><strong>{resource.title}</strong></span></a>)}</div>
      <p className="investment-partner-access-note"><ShieldCheck size={14} />{portalCopy.accessNote}</p>
    </div>
  </section>;
}

const formatMxn = (value: number, locale: InvestmentLocale, compact = false) => new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: investmentProformaAssumptions.currency,
  currencyDisplay: 'narrowSymbol',
  notation: compact ? 'compact' : 'standard',
  maximumFractionDigits: compact ? 3 : 0,
}).format(value);

function ProformaPanel({ locale }: { locale: InvestmentLocale }) {
  const proforma = investmentProformaCopy[locale];
  const allocations = [
    { label: proforma.allocationLabels[0], rate: investmentProformaAssumptions.distributorRate, tone: 'channel' },
    { label: proforma.allocationLabels[1], rate: investmentProformaAssumptions.fiscalReserveRate, tone: 'fiscal' },
    { label: proforma.allocationLabels[2], rate: investmentProformaAssumptions.capexRate, tone: 'capex' },
    { label: proforma.allocationLabels[3], rate: investmentProformaAssumptions.promotionRate, tone: 'promotion' },
    { label: proforma.allocationLabels[4], rate: investmentProformaOperatingBalanceRate, tone: 'balance' },
  ] as const;

  return <section className="investment-proforma" aria-labelledby="investment-proforma-evolution-title">
    <aside className="investment-proforma-assumptions" aria-label={proforma.assumptionsLabel}>
      <strong>{proforma.assumptionsLabel}</strong>
      <div>{proforma.assumptionPills.map(item => <span key={item}>{item}</span>)}</div>
    </aside>

    <section className="investment-proforma-evolution">
      <header><h3 id="investment-proforma-evolution-title">{proforma.evolutionTitle}</h3><p>{proforma.evolutionDescription}</p></header>
      <ol>{investmentProformaMilestones.map(milestone => <li key={milestone.month}>
        <span>{proforma.monthLabel} {milestone.month}</span>
        <strong>{formatMxn(milestone.portfolioMrrMxn, locale, true)}</strong>
        <small>{proforma.portfolioMrrLabel}</small>
        <p>{proforma.cumulativeRevenueLabel}: <b>{formatMxn(milestone.cumulativeRevenueMxn, locale, true)}</b></p>
      </li>)}</ol>
    </section>

    <section className="investment-proforma-scenarios" aria-labelledby="investment-proforma-scenarios-title">
      <header><h3 id="investment-proforma-scenarios-title">{proforma.scenariosTitle}</h3><p>{proforma.scenariosDescription}</p></header>
      <div>{investmentProformaScenarios.map(scenario => <article key={scenario.monthlyNewRevenueMxn}>
        <p className="investment-proforma-scenario-pace"><strong>{formatMxn(scenario.monthlyNewRevenueMxn, locale)}</strong><span>{proforma.monthlyNewRevenueLabel}</span></p>
        <p className="investment-proforma-scenario-result"><span>{proforma.yearOneRevenueLabel}</span><strong>{formatMxn(scenario.yearOneRevenueMxn, locale, true)}</strong></p>
        <dl>
          <div><dt>{proforma.decemberMrrLabel}</dt><dd>{formatMxn(scenario.decemberMrrMxn, locale, true)}</dd></div>
          <div><dt>{proforma.distributorAllocationLabel}</dt><dd>{formatMxn(scenario.distributorAllocationMxn, locale, true)}</dd></div>
          <div><dt>{proforma.operatingBalanceLabel}</dt><dd>{formatMxn(scenario.operatingBalanceMxn, locale, true)}</dd></div>
        </dl>
      </article>)}</div>
    </section>

    <section className="investment-proforma-allocation" aria-labelledby="investment-proforma-allocation-title">
      <header><h3 id="investment-proforma-allocation-title">{proforma.allocationsTitle}</h3><p>{proforma.allocationsDescription}</p></header>
      <div className="investment-proforma-allocation-bar" aria-hidden="true">{allocations.map(allocation => <span className={`investment-proforma-allocation--${allocation.tone}`} key={allocation.tone} style={{ width: `${allocation.rate * 100}%` }} />)}</div>
      <div className="investment-proforma-allocation-legend">{allocations.map(allocation => <div key={allocation.tone}><i className={`investment-proforma-allocation--${allocation.tone}`} aria-hidden="true" /><span>{allocation.label}</span><strong>{Math.round(allocation.rate * 100)}%</strong></div>)}</div>
    </section>

    <section className="investment-proforma-national" aria-labelledby="investment-proforma-national-title">
      <header><h3 id="investment-proforma-national-title">{proforma.nationalTitle}</h3><p>{proforma.nationalDescription}</p></header>
      <div className="investment-proforma-network-grid">{investmentProformaNetworks.map(network => {
        const labels = proforma.networkLabels[String(network.consultants) as keyof typeof proforma.networkLabels];
        return <article className={network.consultants === 32 ? 'is-target' : ''} key={network.consultants}>
          <header><span>{network.consultants} {proforma.consultantsLabel}</span><h4>{labels.title}</h4><p>{labels.description}</p></header>
          <p className="investment-proforma-network-revenue"><span>{proforma.yearOneRevenueLabel}</span><strong>{formatMxn(network.yearOneRevenueMxn, locale, true)}</strong></p>
          <dl className="investment-proforma-network-metrics">
            <div><dt>{proforma.aggregateMonthlyNewRevenueLabel}</dt><dd>{formatMxn(network.aggregateMonthlyNewRevenueMxn, locale, true)}</dd></div>
            <div><dt>{proforma.decemberMrrLabel}</dt><dd>{formatMxn(network.decemberMrrMxn, locale, true)}</dd></div>
            <div><dt>{proforma.exitArrLabel}</dt><dd>{formatMxn(network.exitArrMxn, locale, true)}</dd></div>
            <div><dt>{proforma.operatingBalanceLabel}</dt><dd>{formatMxn(network.operatingBalanceMxn, locale, true)}</dd></div>
          </dl>
          <p className="investment-proforma-network-allocations"><strong>{proforma.allocationDetailLabel}:</strong> {proforma.allocationLabels[0]} {formatMxn(network.distributorAllocationMxn, locale, true)} · {proforma.allocationLabels[1]} {formatMxn(network.fiscalReserveMxn, locale, true)} · {proforma.allocationLabels[2]} {formatMxn(network.capexMxn, locale, true)} · {proforma.allocationLabels[3]} {formatMxn(network.promotionMxn, locale, true)}</p>
        </article>;
      })}</div>
    </section>

    <aside className="investment-proforma-note"><ShieldCheck size={18} /><p><strong>{proforma.modelNoteTitle}</strong>{proforma.modelNote}</p></aside>
  </section>;
}

function ModuleCatalogTable({ locale }: { locale: InvestmentLocale }) {
  const catalog = investmentModuleCatalog[locale];
  return <section className="investment-module-catalog" aria-labelledby="investment-module-catalog-title">
    <div className="investment-module-catalog-heading">
      <h3 id="investment-module-catalog-title">{catalog.title}</h3>
      <p>{catalog.description}</p>
    </div>
    <p className="investment-module-scroll-hint">{catalog.scrollHint}</p>
    <div className="investment-module-table-shell">
      <div className="investment-module-table-scroll" role="region" aria-labelledby="investment-module-catalog-title" tabIndex={0}>
        <table className="investment-module-table">
          <caption className="investment-visually-hidden">{catalog.caption}</caption>
          <colgroup><col className="investment-module-column" /><col className="investment-functions-column" /><col className="investment-tools-column" /></colgroup>
          <thead><tr><th scope="col">{catalog.columns.module}</th><th scope="col">{catalog.columns.functions}</th><th scope="col">{catalog.columns.tools}</th></tr></thead>
          <tbody>{catalog.modules.map(module => <tr key={module.id}>
            <th scope="row"><span className="investment-module-name"><span className={`investment-module-catalog-icon investment-module-catalog-icon--${module.tone}`} aria-hidden="true">{module.emoji}</span><span><strong>{module.name}</strong><small>{catalog.kinds[module.kind]}</small></span></span></th>
            <td><ul className="investment-module-function-list">{module.functions.map((item, index) => <li key={`${module.id}-function-${index + 1}`}>{item}</li>)}</ul></td>
            <td><ul className="investment-module-tool-list">{module.tools.map((item, index) => <li key={`${module.id}-tool-${index + 1}`}>{item}</li>)}</ul></td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
    <aside className="investment-module-shared-note"><strong>{catalog.sharedLabel}</strong><p>{catalog.sharedNote}</p></aside>
  </section>;
}

function CarlosAcknowledgement() {
  return <section className="investment-acknowledgement" aria-labelledby="investment-acknowledgement-title">
    <span className="investment-acknowledgement-mark" aria-hidden="true">🙏</span>
    <p className="investment-eyebrow">Un agradecimiento personal</p>
    <h3 id="investment-acknowledgement-title">Muchas gracias por su atención y por su tiempo.</h3>
    <div className="investment-acknowledgement-message">
      <p>Queremos agradecerle por inspirarnos, por compartir su conocimiento y por dedicar su esfuerzo a que la comunidad salga adelante.</p>
      <p>Nuestro propósito es lograr que <strong>un millón de empresarios en México se hagan chingones.</strong> Ojalá pueda ayudarnos a conseguirlo. Compartimos su causa, una causa que, de alguna forma, usted sembró e inspiró en nuestros corazones.</p>
      <p>Gracias, incluso si no pudiera ayudarnos, porque su contenido ya lo hizo. Gracias por enseñarnos que siempre habrá espacio para preguntar:</p>
    </div>
    <blockquote>“¿Dónde está la oportunidad?”</blockquote>
  </section>;
}

type InvestmentPageProps = {
  welcomeName?: string;
  showAcknowledgement?: boolean;
  footerMessage?: string;
};

type PresentationTab = InvestmentTab | 'acknowledgement';

const personalizedWelcome = (locale: InvestmentLocale, name: string) => {
  if (locale.startsWith('es')) return `Bienvenido, ${name}`;
  if (locale.startsWith('en')) return `Welcome, ${name}`;
  if (locale === 'fr-CA') return `Bienvenue, ${name}`;
  if (locale === 'pt-BR') return `Bem-vindo, ${name}`;
  if (locale === 'ko-CA') return `${name}님, 환영합니다`;
  return `${name}，欢迎您`;
};

export default function InvestmentPage({ welcomeName, showAcknowledgement = false, footerMessage }: InvestmentPageProps = {}) {
  const [params, setParams] = useSearchParams();
  const [locale, setLocale] = useState<InvestmentLocale>('es-MX');
  const [currency, setCurrency] = useState('USD');
  const [darkMode, setDarkMode] = useState(() => typeof document !== 'undefined' && (document.documentElement.classList.contains('dark') || document.body.classList.contains('dark')));
  const [learningMode, setLearningMode] = useState(false);
  const requestedTab = params.get('tab');
  const activeTab: PresentationTab = showAcknowledgement && requestedTab === 'acknowledgement'
    ? 'acknowledgement'
    : resolveInvestmentTab(requestedTab);
  const section = investmentSections[locale][activeTab === 'acknowledgement' ? 'overview' : activeTab];
  const headerCopy = getHeaderTranslations(locale);
  const currentLanguage = investmentLanguages.find(language => language.code === locale) ?? investmentLanguages[0];
  const copy = getInvestmentUiCopy(locale);
  const welcome = welcomeName ? personalizedWelcome(locale, welcomeName) : copy.welcome;
  const notificationLanguage = locale.startsWith('es') ? 'es' : locale.startsWith('en') ? 'en' : locale.slice(0, 2) as 'fr' | 'pt' | 'ko' | 'zh';
  const moduleLabels = notificationModuleLabels[notificationLanguage];
  useInvestmentMetadata(`Índice | ${copy.document}`);
  useEffect(() => {
    const previousColorScheme = document.documentElement.style.colorScheme;
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
    return () => { document.documentElement.style.colorScheme = previousColorScheme; };
  }, [darkMode]);
  useEffect(() => {
    const previousLanguage = document.documentElement.lang;
    document.documentElement.lang = locale;
    return () => { document.documentElement.lang = previousLanguage; };
  }, [locale]);

  const navigationItems = [
    ...investmentTabs.map(tab => ({
      id: tab[0] as PresentationTab,
      label: tab[1][locale],
      icon: <span className="investment-tab-emoji">{tabEmojis[tab[0]]}</span>,
    })),
    ...(showAcknowledgement ? [{
      id: 'acknowledgement' as PresentationTab,
      label: 'Agradecimiento',
      icon: <span className="investment-tab-emoji">🙏</span>,
    }] : []),
  ];
  const selectTab = (tab: PresentationTab) => setParams(previous => {
    const next = new URLSearchParams(previous);
    tab === 'overview' ? next.delete('tab') : next.set('tab', tab);
    return next;
  }, { preventScrollReset: true });

  return <div className={`investment-page${darkMode ? ' investment-dark' : ''}`} lang={locale}>
    <a className="investment-skip" href="#investment-content">{copy.skip}</a>
    <header className="investment-header"><div className="investment-shell-container investment-header-inner">
      <div className="investment-greeting"><h1><span aria-hidden="true">👋</span> {welcome}</h1></div>
      <div className="investment-tools" role="group" aria-label={copy.toolsLabel}>
        <span className="investment-demo-badge"><MonitorSmartphone size={16} /> {copy.demo}</span>
        <span className="investment-company-pill"><Building2 size={16} /><span>{copy.document}</span></span>
        <label className="investment-select-control" title={copy.currency}><CircleDollarSign size={18} /><select value={currency} onChange={event => setCurrency(event.target.value)} aria-label={copy.currency}><option>USD</option><option>MXN</option><option>CAD</option><option>COP</option></select><ChevronDown size={14} /></label>
        <DropdownMenu><DropdownMenuTrigger asChild><button type="button" title={headerCopy.actions.notifications} aria-label={headerCopy.actions.notifications}><Bell size={19} /><span className="investment-notification-count">6</span></button></DropdownMenuTrigger>
          <DropdownMenuContent lang={locale} align="end" className={`investment-dropdown investment-notifications-menu${darkMode ? ' investment-dropdown-dark' : ''}`}>
            <div className="investment-dropdown-heading"><div><Bell size={18} /><strong>{headerCopy.actions.notifications}</strong></div><span>6 {copy.notificationsNew}</span></div>
            <div className="investment-notifications-list">{notificationModules.map(([moduleId, emoji], index) => <DropdownMenuItem key={moduleId} aria-disabled="true" className="investment-notification-item" onSelect={event => event.preventDefault()}>
              <span className={`investment-notification-icon investment-notification-icon--${moduleId}`} aria-hidden="true">{emoji}</span><div><strong>{copy.sampleNotification}</strong><div className="investment-notification-meta"><span className={`investment-notification-module investment-notification-module--${moduleId}`}>{moduleLabels[moduleId]}</span><small>{index < 3 ? copy.now : copy.fiveMinutesAgo}</small></div></div><i aria-hidden="true" />
            </DropdownMenuItem>)}</div>
            <div className="investment-dropdown-footer">{copy.notificationFooter} · {copy.demo}</div>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu><DropdownMenuTrigger asChild><button type="button" title={headerCopy.actions.language} aria-label={`${headerCopy.actions.language}: ${currentLanguage.name}`}><Globe size={19} /><span className="investment-language-flag">{currentLanguage.flag}</span></button></DropdownMenuTrigger>
          <DropdownMenuContent lang={locale} align="end" className={`investment-dropdown investment-language-menu${darkMode ? ' investment-dropdown-dark' : ''}`}>{investmentLanguages.map(language => <DropdownMenuItem key={language.code} className={locale === language.code ? 'is-selected' : ''} onSelect={() => setLocale(language.code)}><span className="investment-language-option-flag" aria-hidden="true">{language.flag}</span><span>{language.name}</span>{locale === language.code && <Check size={16} aria-hidden="true" />}</DropdownMenuItem>)}</DropdownMenuContent>
        </DropdownMenu>
        <button type="button" onClick={() => setDarkMode(value => !value)} title={darkMode ? headerCopy.actions.lightMode : headerCopy.actions.darkMode} aria-label={darkMode ? headerCopy.actions.lightMode : headerCopy.actions.darkMode} aria-pressed={darkMode}>{darkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
        <button type="button" className={learningMode ? 'is-active' : ''} onClick={() => setLearningMode(value => !value)} title={copy.learning} aria-label={copy.learning} aria-pressed={learningMode}><GraduationCap size={20} /></button>
        <DropdownMenu><DropdownMenuTrigger asChild><button type="button" title={headerCopy.actions.profile} aria-label={headerCopy.actions.profile}><span className="investment-avatar">IR</span></button></DropdownMenuTrigger>
          <DropdownMenuContent lang={locale} align="end" className={`investment-dropdown investment-profile-menu${darkMode ? ' investment-dropdown-dark' : ''}`}>
            <div className="investment-profile-heading"><span className="investment-profile-avatar">IR</span><div><strong>{copy.profileName}</strong><p>investor.demo@indiceapp.com</p><span>PLATFORM_ROOT · DEMO</span></div></div>
            <div className="investment-profile-note"><ShieldCheck size={16} /><p>{copy.profileNote}</p></div>
            <div className="investment-profile-actions">
              <DropdownMenuItem aria-disabled="true" className="investment-profile-item" onSelect={event => event.preventDefault()}><User size={17} /><span>{headerCopy.actions.profile}</span><small>Demo</small></DropdownMenuItem>
              <DropdownMenuSeparator />
              {[[Bot, headerCopy.actions.connectAi], [MonitorSmartphone, copy.kioskCenter], [CreditCard, headerCopy.actions.subscription], [ShieldCheck, headerCopy.actions.platformAdmin]].map(([Icon, label]) => <DropdownMenuItem key={String(label)} aria-disabled="true" className="investment-profile-item" onSelect={event => event.preventDefault()}><Icon size={17} /><span>{String(label)}</span><small>Demo</small></DropdownMenuItem>)}
              <DropdownMenuSeparator />
              {[[Settings, headerCopy.actions.settings], [LayoutPanelTop, headerCopy.actions.workbarLayout]].map(([Icon, label]) => <DropdownMenuItem key={String(label)} aria-disabled="true" className="investment-profile-item" onSelect={event => event.preventDefault()}><Icon size={17} /><span>{String(label)}</span><small>Demo</small></DropdownMenuItem>)}
            </div>
            <div className="investment-profile-footer"><DropdownMenuItem aria-disabled="true" className="investment-profile-logout" onSelect={event => event.preventDefault()}><LogOut size={16} /> {headerCopy.actions.logout}<small>Demo</small></DropdownMenuItem></div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div></header>
    <section className="investment-workbar"><div className="investment-shell-container">
      <div className="investment-module-identity"><span className="investment-module-icon">📣</span><div><div><strong>{copy.module}</strong><span>/</span><em>{navigationItems.find(tab => tab.id === activeTab)?.label}</em></div><p>{copy.subtitle}</p></div></div>
      <IndiceWorkspaceNavigation ariaLabel={copy.sections} items={navigationItems} value={activeTab} onValueChange={selectTab} tone="blue" variant="sections" className="investment-navigation" />
    </div></section>
    <main className="investment-shell-container investment-main">
      {learningMode && <aside className="investment-learning-banner"><GraduationCap size={20} /><div><strong>{copy.learningOn}</strong><p>{copy.learningHint}</p></div><Check size={18} /></aside>}
      <section className="investment-module-titlebar"><div><span className="investment-module-title-icon">{navigationItems.find(tab => tab.id === activeTab)?.icon}</span><div><p>{copy.overview}</p><h2>{activeTab === 'acknowledgement' ? 'Gracias por inspirar esta causa.' : section.title}</h2></div></div><span className="investment-module-state"><Check size={14} /> {copy.demo}</span></section>
      <div id="investment-content" role="tabpanel" tabIndex={0} className="investment-panel">
        {activeTab === 'acknowledgement' ? <CarlosAcknowledgement /> : activeTab === 'overview' ? <section className="investment-overview-copy">
          <span className="investment-eyebrow">{section.eyebrow}</span>
          <div className="investment-overview-paragraphs">
            {investmentOverviewParagraphs[locale].map((paragraph, index) => <p key={paragraph} className={`investment-overview-paragraph${index === 0 ? ' investment-overview-lead' : ''}`}>{paragraph}</p>)}
          </div>
        </section> : <>
          <section className="investment-intro"><div><p className="investment-eyebrow">{section.eyebrow}</p><h3>{section.description}</h3></div><aside className="investment-takeaway"><span className="investment-eyebrow">{copy.central}</span><h3>{section.takeaway}</h3><p>{section.takeawayDetail}</p></aside></section>
          {activeTab === 'modules' ? <ModuleCatalogTable locale={locale} /> : activeTab === 'proforma' ? <ProformaPanel locale={locale} /> : <>
            {activeTab === 'market' && <section className="investment-market"><div className="investment-market-signals">{marketSignals.map(signal => <div key={signal.value}><p className="investment-market-value">{signal.value}</p><p>{signal.labels[locale]}</p></div>)}</div><div className="investment-source"><a href={marketSource.url} target="_blank" rel="noopener noreferrer">{copy.source}: {marketSource.titles[locale]} <ExternalLink size={14} /></a></div></section>}
            {activeTab === 'business' ? <CustomerJourney locale={locale} section={section} /> : <section className={`investment-items${activeTab === 'ai' ? ' investment-items--ai' : ''}`}><h3>{section.itemsTitle}</h3><div className="investment-card-grid">{section.items.map((entry, index) => <article className="investment-card" key={entry.title}><span className="investment-eyebrow">{String(index + 1).padStart(2, '0')}</span><h4>{entry.title}</h4><p>{entry.description}</p></article>)}</div></section>}
            {activeTab === 'partners' ? <PartnerCertificationPanel locale={locale} section={section} /> : <EvidenceList emphasis={activeTab === 'market'} roadmap={activeTab === 'ai'} title={section.evidenceTitle} items={section.evidence} />}
          </>}
          <div className={`investment-next${activeTab === 'market' ? ' investment-next--market' : ''}${activeTab === 'business' ? ' investment-next--business' : ''}`}><ArrowRight size={18} /><p><span>{activeTab === 'business' ? customerJourneyUi[locale].resultLabel : copy.next}</span>{section.next}</p></div>
        </>}
      </div>
      <footer className="investment-footer"><p>{footerMessage ?? copy.disclaimer}</p><p>Índice · 2026</p></footer>
    </main>
  </div>;
}
