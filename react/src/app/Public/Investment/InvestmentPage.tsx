import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bell, Bot, Building2, Check, ChevronDown, CircleDollarSign, CreditCard, Download, ExternalLink, GraduationCap, Globe, LayoutPanelTop, LogOut, Maximize2, Minimize2, MonitorSmartphone, Moon, Rocket, Search, Settings, ShieldCheck, Sparkles, Sun, User } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { IndiceWorkspaceNavigation } from '../../components/frontend-os/IndiceWorkspaceNavigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { getHeaderTranslations } from '../../components/header/translations';
import { commercialExperienceCopy, commercialPlanPrices, commercialPresentationContent, commercialPresentationTabs, commercialPricingUiCopy, resolveCommercialPresentationTab, type CommercialPresentationTab } from './commercialPresentationContent';
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

const formatMxn = (value: number, locale: InvestmentLocale, compact = false, decimals = 0) => new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: investmentProformaAssumptions.currency,
  currencyDisplay: 'narrowSymbol',
  notation: compact ? 'compact' : 'standard',
  minimumFractionDigits: compact ? 0 : decimals,
  maximumFractionDigits: compact ? 3 : decimals,
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

function CommercialNext({ children }: { children: string }) {
  return <div className="investment-commercial-next"><ArrowRight size={18} /><p>{children}</p></div>;
}

function CommercialTechnologyMap({ locale }: { locale: InvestmentLocale }) {
  const copy = commercialPresentationContent[locale];
  const experience = commercialExperienceCopy[locale];
  return <figure className="investment-technology-map">
    <figcaption>{experience.diagram}</figcaption>
    <div className="investment-technology-source"><LayoutPanelTop size={20} aria-hidden="true" /><span>ERP · Índice</span><ShieldCheck size={16} aria-hidden="true" /></div>
    <div className="investment-technology-connector" aria-hidden="true" />
    <div className="investment-technology-hub"><Bot size={32} aria-hidden="true" /><div><small>{copy.agents.coordinatorLabel}</small><strong>Lupita</strong></div></div>
    <div className="investment-technology-branches">{copy.agents.agents.map((agent, index) => {
      const Icon = [User, Building2, CircleDollarSign, LayoutPanelTop][index];
      return <div key={agent.title}><Icon size={18} aria-hidden="true" /><span>{agent.title}</span></div>;
    })}</div>
    <div className="investment-technology-decision"><User size={18} aria-hidden="true" /><span>{copy.agents.permissionTitle}</span></div>
  </figure>;
}

function CommercialOperationNetwork({ locale }: { locale: InvestmentLocale }) {
  const section = commercialPresentationContent[locale].operation;
  const experience = commercialExperienceCopy[locale];
  const nodeNames = ['kiosk', 'workspace', 'ai'];
  return <figure className="investment-operation-network">
    <figcaption><span>{section.lanesTitle}</span><small>{experience.preview}</small></figcaption>
    <div className="investment-operation-triangle">
      <svg className="investment-operation-connections" viewBox="0 0 1200 700" preserveAspectRatio="none" aria-hidden="true">
        <path className="investment-operation-glow" d="M600 100 190 510H1010Z" />
        <path className="investment-operation-line" d="M600 100 190 510H1010Z" />
        <path className="investment-operation-signal" d="M600 100 190 510H1010Z" />
      </svg>
      <div className="investment-operation-core"><img src="/images/presentation/indice-mark.svg" width="48" height="48" alt="" /><strong>Índice</strong><span>{section.foundationTitle}</span><ShieldCheck size={18} aria-hidden="true" /></div>
      {section.lanes.map((lane, index) => <article className={`investment-operation-node investment-operation-node--${nodeNames[index]}`} key={lane.title}>
        <header><span className="investment-operation-number">{String(index + 1).padStart(2, '0')}</span><div><small>{lane.label}</small><h4>{lane.title}</h4></div></header>
        {index === 2 ? <div className="investment-operation-brands">
          <div><span><img src="/images/presentation/chatgpt.png" width="48" height="48" alt="" /></span><strong>ChatGPT</strong></div>
          <div><span><img src="/images/presentation/claude.png" width="40" height="40" alt="" /></span><strong>Claude</strong></div>
        </div> : <div className={`investment-operation-preview investment-operation-preview--${nodeNames[index]}`}>
          <div className={index === 0 ? 'investment-operation-phone' : 'investment-operation-browser'}>
            {index === 1 && <div className="investment-operation-browser-bar" aria-hidden="true"><i /><i /><i /><span>Índice</span></div>}
            <img src={index === 0 ? '/images/presentation/kiosk-demo.png' : '/images/presentation/indice-workspace-demo.png'} alt={lane.title} width={index === 0 ? 983 : 1444} height={index === 0 ? 1600 : 1089} />
          </div>
        </div>}
        <div className="investment-operation-node-copy"><p>{lane.description}</p><ul>{lane.tools.map(tool => <li key={tool}>{tool}</li>)}</ul></div>
      </article>)}
    </div>
  </figure>;
}

function CommercialCapabilitiesMap({ locale }: { locale: InvestmentLocale }) {
  const section = commercialPresentationContent[locale].capabilities;
  return <figure className="investment-capability-map" aria-label={section.pillarsTitle}>
    <figcaption>{section.pillarsTitle}</figcaption>
    <div className="investment-capability-orbit">
      <svg viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="500" cy="260" rx="390" ry="190" /><path d="M500 60V460M105 260H895" /></svg>
      <div className="investment-capability-core"><img src="/images/presentation/indice-mark.svg" alt="" /><strong>Índice</strong><span>ERP</span></div>
      {section.pillars.map((pillar, index) => <article className={`investment-capability-node investment-capability-node--${index + 1}`} key={pillar.title}>
        <span aria-hidden="true">{pillar.emoji}</span><div><h4>{pillar.title}</h4><p>{pillar.description}</p><small>{pillar.tools.join(' · ')}</small></div>
      </article>)}
    </div>
    <ol className="investment-capability-growth">{section.packages.map((item, index) => <li key={item.title}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.title}</strong><p>{item.description}</p></div>{index < section.packages.length - 1 && <ArrowRight aria-hidden="true" />}</li>)}</ol>
    <p className="investment-capability-scope">{section.scopeNote}</p>
  </figure>;
}

function CommercialAgentsMap({ locale }: { locale: InvestmentLocale }) {
  const section = commercialPresentationContent[locale].agents;
  const icons = [User, Building2, CircleDollarSign, LayoutPanelTop];
  return <figure className="investment-agent-map" aria-label={section.title}>
    <div className="investment-agent-questions"><strong>{section.questionsTitle}</strong>{section.questions.map(question => <span key={question}>{question}</span>)}</div>
    <div className="investment-agent-flow-arrow" aria-hidden="true"><ArrowRight /></div>
    <section className="investment-agent-lupita"><span><Bot aria-hidden="true" /></span><small>{section.coordinatorLabel}</small><h3>Lupita</h3><p>{section.coordinatorTitle}</p></section>
    <div className="investment-agent-flow-arrow" aria-hidden="true"><ArrowRight /></div>
    <div className="investment-agent-specialists">{section.agents.map((agent, index) => {
      const Icon = icons[index];
      return <article key={agent.title}><Icon aria-hidden="true" /><div><strong>{agent.title}</strong><p>{agent.description}</p></div></article>;
    })}</div>
    <figcaption><ShieldCheck aria-hidden="true" /><div><strong>{section.permissionTitle}</strong><p>{section.permissionDescription}</p></div></figcaption>
  </figure>;
}

function CommercialImplementationMap({ locale }: { locale: InvestmentLocale }) {
  const section = commercialPresentationContent[locale].implementation;
  const icons = [Search, LayoutPanelTop, Settings, Rocket];
  return <figure className="investment-implementation-map" aria-label={section.stepsTitle}>
    <figcaption><span>{section.stepsTitle}</span><strong>{section.cta}</strong></figcaption>
    <ol>{section.steps.map((step, index) => {
      const Icon = icons[index];
      return <li key={step.label}><span className="investment-implementation-icon"><Icon aria-hidden="true" /></span><small>{step.label}</small><h4>{step.title}</h4><p>{step.description}</p></li>;
    })}</ol>
    <div className="investment-implementation-support"><article><span>15</span><div><strong>{section.trialLabel}</strong><p>{section.trialDescription}</p></div></article><article><User aria-hidden="true" /><div><strong>{section.supportTitle}</strong><p>{section.supportDescription}</p></div></article></div>
  </figure>;
}

function CommercialPresentationPanel({ locale, tab }: { locale: InvestmentLocale; tab: CommercialPresentationTab }) {
  const commercial = commercialPresentationContent[locale];
  const experience = commercialExperienceCopy[locale];

  if (tab === 'proposal') {
    const section = commercial.proposal;
    return <section className="investment-commercial investment-commercial--proposal">
      <div className="investment-commercial-stage">
        <div className="investment-commercial-stage-copy"><p className="investment-eyebrow">{section.eyebrow}</p><h3>{section.statement}</h3><p>{section.lead}</p><a className="investment-commercial-explore" href="/presentation?tab=agents">{experience.explore}<ArrowRight size={18} aria-hidden="true" /></a><div className="investment-commercial-stage-channels">{commercial.operation.lanes.map(lane => <span key={lane.title}>{lane.title}</span>)}</div></div>
        <CommercialTechnologyMap locale={locale} />
      </div>
      <p className="investment-commercial-technology-note">{experience.scope}</p>
      <div className="investment-commercial-contrast">
        <section><h3>{section.frictionsTitle}</h3><div>{section.frictions.map((item, index) => <article key={item.title}><span>{String(index + 1).padStart(2, '0')}</span><h4>{item.title}</h4><p>{item.description}</p></article>)}</div></section>
        <section className="is-result"><h3>{section.resultsTitle}</h3><div>{section.results.map(item => <article key={item.title}><Check size={17} /><div><h4>{item.title}</h4><p>{item.description}</p></div></article>)}</div></section>
      </div>
      <CommercialNext>{section.next}</CommercialNext>
    </section>;
  }

  if (tab === 'operation') {
    const section = commercial.operation;
    return <section className="investment-commercial investment-commercial--operation">
      <header className="investment-commercial-heading"><p className="investment-eyebrow">{section.eyebrow}</p><h3>{section.lead}</h3></header>
      <CommercialOperationNetwork locale={locale} />
      <aside className="investment-commercial-foundation"><ShieldCheck size={22} /><div><h3>{section.foundationTitle}</h3><p>{section.foundationDescription}</p></div></aside>
      <CommercialNext>{section.next}</CommercialNext>
    </section>;
  }

  if (tab === 'capabilities') {
    const section = commercial.capabilities;
    return <section className="investment-commercial investment-commercial--capabilities">
      <header className="investment-commercial-heading"><p className="investment-eyebrow">{section.eyebrow}</p><h3>{section.lead}</h3></header>
      <CommercialCapabilitiesMap locale={locale} />
      <CommercialNext>{section.next}</CommercialNext>
    </section>;
  }

  if (tab === 'agents') {
    const section = commercial.agents;
    return <section className="investment-commercial investment-commercial--agents">
      <header className="investment-commercial-heading"><p className="investment-eyebrow">{section.eyebrow}</p><h3>{section.lead}</h3></header>
      <CommercialAgentsMap locale={locale} />
      <p className="investment-agent-connection-note"><Sparkles aria-hidden="true" />{section.coordinatorDescription}</p>
      <p className="investment-commercial-technology-note">{experience.scope}</p>
      <CommercialNext>{section.next}</CommercialNext>
    </section>;
  }

  if (tab === 'pricing') {
    const section = commercial.pricing;
    const pricingUi = commercialPricingUiCopy[locale];
    return <section className="investment-commercial investment-commercial--pricing">
      <header className="investment-commercial-heading"><p className="investment-eyebrow">{section.eyebrow}</p><h3>{section.lead}</h3></header>
      <section className="investment-commercial-section"><div className="investment-commercial-section-heading"><h3>{section.plansTitle}</h3><p>{section.beforeTaxLabel}</p></div><div className="investment-commercial-pricing-grid">{section.plans.map(plan => {
        const price = commercialPlanPrices[plan.id];
        return <article className={plan.id === 'escala' ? 'is-featured' : ''} key={plan.id}>
          {plan.id === 'escala' && <span className="investment-commercial-plan-ribbon">Popular</span>}
          <div className="investment-commercial-plan-heading"><span>{plan.title}</span>{plan.id === 'escala' && <Sparkles size={16} />}</div>
          <p>{plan.description}</p>
          <div className="investment-commercial-plan-price"><strong>{formatMxn(price.monthlyMxn, locale)}</strong><span>MXN {section.monthlyLabel}</span></div>
          <small>{section.annualLabel}: {formatMxn(price.annualMxn, locale, false, 2)} MXN · {pricingUi.annualSavings}</small>
          <ul>{plan.includes.map(item => <li key={item}><Check size={14} />{item}</li>)}</ul>
        </article>;
      })}</div></section>
      <aside className="investment-commercial-plan-common"><strong>{section.commonTitle}</strong><ul>{section.commonItems.map(item => <li key={item}><Check size={14} />{item}</li>)}<li><Check size={14} />{pricingUi.additionalBlock}: {formatMxn(commercialPlanPrices.additionalBlockMonthlyMxn, locale)} MXN {section.monthlyLabel}</li></ul></aside>
      <section className="investment-commercial-community-offer">
        <div className="investment-commercial-offer-visual" aria-hidden="true"><span><Rocket /></span><i /><i /><i /></div>
        <div className="investment-commercial-offer-copy"><span>{section.offerLabel}</span><h3>{section.offerTitle}</h3><p>{section.offerDescription}</p></div>
        <div className="investment-commercial-setup-prices" aria-label={section.offerPriceLabel}>{section.plans.map(plan => {
          const price = commercialPlanPrices[plan.id];
          const decimals = Number.isInteger(price.setupPromotionMxn) ? 0 : 2;
          return <article key={plan.id}><small>{plan.title}</small><strong>{formatMxn(price.setupPromotionMxn, locale, false, decimals)}</strong><span>MXN · {pricingUi.oneTime}</span><p>{pricingUi.regularSetup}: <s>{formatMxn(price.setupMxn, locale)}</s></p></article>;
        })}</div>
        <div className="investment-commercial-offer-includes"><strong>{section.offerIncludesTitle}</strong><ul>{section.offerIncludes.map(item => <li key={item}><Check size={14} />{item}</li>)}</ul></div>
        <p className="investment-commercial-offer-condition">{section.offerCondition}</p>
      </section>
      <CommercialNext>{section.next}</CommercialNext>
    </section>;
  }

  const section = commercial.implementation;
  return <section className="investment-commercial investment-commercial--implementation">
    <header className="investment-commercial-heading"><p className="investment-eyebrow">{section.eyebrow}</p><h3>{section.lead}</h3></header>
    <CommercialImplementationMap locale={locale} />
    <div className="investment-commercial-cta"><div><small>{section.cta}</small><strong>{section.next}</strong></div><ArrowRight size={24} /></div>
  </section>;
}

type InvestmentPageProps = {
  welcomeName?: string;
  welcomeMessage?: string;
  showAcknowledgement?: boolean;
  footerMessage?: string;
  hiddenTabs?: readonly InvestmentTab[];
  presentationName?: string;
  commercialPresentation?: boolean;
};

type StandardPresentationTab = InvestmentTab | 'acknowledgement';
type PresentationTab = StandardPresentationTab | CommercialPresentationTab;

const personalizedWelcome = (locale: InvestmentLocale, name: string) => {
  if (locale.startsWith('es')) return `Bienvenido, ${name}`;
  if (locale.startsWith('en')) return `Welcome, ${name}`;
  if (locale === 'fr-CA') return `Bienvenue, ${name}`;
  if (locale === 'pt-BR') return `Bem-vindo, ${name}`;
  if (locale === 'ko-CA') return `${name}님, 환영합니다`;
  return `${name}，欢迎您`;
};

export default function InvestmentPage({ welcomeName, welcomeMessage, showAcknowledgement = false, footerMessage, hiddenTabs = [], presentationName, commercialPresentation = false }: InvestmentPageProps = {}) {
  const pageRef = useRef<HTMLDivElement>(null);
  const [params, setParams] = useSearchParams();
  const [locale, setLocale] = useState<InvestmentLocale>('es-MX');
  const [currency, setCurrency] = useState(commercialPresentation ? 'MXN' : 'USD');
  const [darkMode, setDarkMode] = useState(() => typeof document !== 'undefined' && (document.documentElement.classList.contains('dark') || document.body.classList.contains('dark')));
  const [learningMode, setLearningMode] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const requestedTab = params.get('tab');
  const resolvedTab = resolveInvestmentTab(requestedTab);
  const standardActiveTab: StandardPresentationTab = showAcknowledgement && requestedTab === 'acknowledgement'
    ? 'acknowledgement'
    : hiddenTabs.includes(resolvedTab) ? 'overview' : resolvedTab;
  const commercialActiveTab = resolveCommercialPresentationTab(requestedTab);
  const activeTab: PresentationTab = commercialPresentation ? commercialActiveTab : standardActiveTab;
  const section = investmentSections[locale][standardActiveTab === 'acknowledgement' ? 'overview' : standardActiveTab];
  const commercialCopy = commercialPresentationContent[locale];
  const commercialUi = commercialExperienceCopy[locale];
  const commercialSection = commercialCopy[commercialActiveTab];
  const headerCopy = getHeaderTranslations(locale);
  const currentLanguage = investmentLanguages.find(language => language.code === locale) ?? investmentLanguages[0];
  const copy = getInvestmentUiCopy(locale);
  const welcome = welcomeMessage ?? (welcomeName ? personalizedWelcome(locale, welcomeName) : copy.welcome);
  const notificationLanguage = locale.startsWith('es') ? 'es' : locale.startsWith('en') ? 'en' : locale.slice(0, 2) as 'fr' | 'pt' | 'ko' | 'zh';
  const moduleLabels = notificationModuleLabels[notificationLanguage];
  useInvestmentMetadata(`Índice | ${presentationName ?? copy.document}`);
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
  useEffect(() => {
    const syncFullscreen = () => setFullscreenActive(document.fullscreenElement === pageRef.current);
    document.addEventListener?.('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener?.('fullscreenchange', syncFullscreen);
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await pageRef.current?.requestFullscreen();
  };

  const navigationItems = commercialPresentation ? commercialPresentationTabs.map(tab => ({
    id: tab[0] as PresentationTab,
    label: tab[1][locale],
    icon: <span className="investment-tab-emoji">{tab[2]}</span>,
  })) : [
    ...investmentTabs.filter(tab => !hiddenTabs.includes(tab[0])).map(tab => ({
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
    tab === (commercialPresentation ? 'proposal' : 'overview') ? next.delete('tab') : next.set('tab', tab);
    return next;
  }, { preventScrollReset: true });

  return <div ref={pageRef} className={`investment-page${darkMode ? ' investment-dark' : ''}${fullscreenActive ? ' investment-page--fullscreen' : ''}`} lang={locale}>
    <a className="investment-skip" href="#investment-content">{copy.skip}</a>
    <header className="investment-header"><div className="investment-shell-container investment-header-inner">
      <div className="investment-greeting"><h1><span aria-hidden="true">👋</span> {welcome}</h1></div>
      <div className="investment-tools" role="group" aria-label={copy.toolsLabel}>
        {commercialPresentation ? <button type="button" className="investment-fullscreen-button" onClick={() => void toggleFullscreen()} aria-label={fullscreenActive ? commercialUi.exitFullscreen : commercialUi.fullscreen} title={fullscreenActive ? commercialUi.exitFullscreen : commercialUi.fullscreen} aria-pressed={fullscreenActive}>{fullscreenActive ? <Minimize2 size={17} /> : <Maximize2 size={17} />}<span>{fullscreenActive ? commercialUi.exitFullscreen : commercialUi.fullscreen}</span></button> : <span className="investment-demo-badge"><MonitorSmartphone size={16} /> {copy.demo}</span>}
        <span className="investment-company-pill"><Building2 size={16} /><span>{presentationName ?? copy.document}</span></span>
        <label className="investment-select-control" title={copy.currency}><CircleDollarSign size={18} /><select value={currency} onChange={event => setCurrency(event.target.value)} aria-label={copy.currency}>{commercialPresentation ? <option>MXN</option> : <><option>USD</option><option>MXN</option><option>CAD</option><option>COP</option></>}</select><ChevronDown size={14} /></label>
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
      <div className="investment-module-identity"><span className="investment-module-icon">📣</span><div><div><strong>{presentationName ?? copy.module}</strong><span>/</span><em>{navigationItems.find(tab => tab.id === activeTab)?.label}</em></div><p>{commercialPresentation ? commercialCopy.subtitle : copy.subtitle}</p></div></div>
      <IndiceWorkspaceNavigation ariaLabel={copy.sections} items={navigationItems} value={activeTab} onValueChange={selectTab} tone="blue" variant="sections" className="investment-navigation" />
    </div></section>
    <main className="investment-shell-container investment-main">
      {learningMode && <aside className="investment-learning-banner"><GraduationCap size={20} /><div><strong>{copy.learningOn}</strong><p>{copy.learningHint}</p></div><Check size={18} /></aside>}
      <section className="investment-module-titlebar"><div><span className="investment-module-title-icon">{navigationItems.find(tab => tab.id === activeTab)?.icon}</span><div><p>{commercialPresentation ? commercialCopy.sectionSummary : copy.overview}</p><h2>{commercialPresentation ? commercialSection.title : standardActiveTab === 'acknowledgement' ? 'Gracias por inspirar esta causa.' : section.title}</h2></div></div><span className="investment-module-state"><Check size={14} /> {copy.demo}</span></section>
      <div id="investment-content" role="tabpanel" tabIndex={0} className="investment-panel">
        {commercialPresentation ? <CommercialPresentationPanel locale={locale} tab={commercialActiveTab} /> : standardActiveTab === 'acknowledgement' ? <CarlosAcknowledgement /> : standardActiveTab === 'overview' ? <section className="investment-overview-copy">
          <span className="investment-eyebrow">{section.eyebrow}</span>
          <div className="investment-overview-paragraphs">
            {investmentOverviewParagraphs[locale].map((paragraph, index) => <p key={paragraph} className={`investment-overview-paragraph${index === 0 ? ' investment-overview-lead' : ''}`}>{paragraph}</p>)}
          </div>
        </section> : <>
          <section className="investment-intro"><div><p className="investment-eyebrow">{section.eyebrow}</p><h3>{section.description}</h3></div><aside className="investment-takeaway"><span className="investment-eyebrow">{copy.central}</span><h3>{section.takeaway}</h3><p>{section.takeawayDetail}</p></aside></section>
          {standardActiveTab === 'modules' ? <ModuleCatalogTable locale={locale} /> : standardActiveTab === 'proforma' ? <ProformaPanel locale={locale} /> : <>
            {standardActiveTab === 'market' && <section className="investment-market"><div className="investment-market-signals">{marketSignals.map(signal => <div key={signal.value}><p className="investment-market-value">{signal.value}</p><p>{signal.labels[locale]}</p></div>)}</div><div className="investment-source"><a href={marketSource.url} target="_blank" rel="noopener noreferrer">{copy.source}: {marketSource.titles[locale]} <ExternalLink size={14} /></a></div></section>}
            {standardActiveTab === 'business' ? <CustomerJourney locale={locale} section={section} /> : <section className={`investment-items${standardActiveTab === 'ai' ? ' investment-items--ai' : ''}`}><h3>{section.itemsTitle}</h3><div className="investment-card-grid">{section.items.map((entry, index) => <article className="investment-card" key={entry.title}><span className="investment-eyebrow">{String(index + 1).padStart(2, '0')}</span><h4>{entry.title}</h4><p>{entry.description}</p></article>)}</div></section>}
            {standardActiveTab === 'partners' ? <PartnerCertificationPanel locale={locale} section={section} /> : <EvidenceList emphasis={standardActiveTab === 'market'} roadmap={standardActiveTab === 'ai'} title={section.evidenceTitle} items={section.evidence} />}
          </>}
          <div className={`investment-next${standardActiveTab === 'market' ? ' investment-next--market' : ''}${standardActiveTab === 'business' ? ' investment-next--business' : ''}`}><ArrowRight size={18} /><p><span>{standardActiveTab === 'business' ? customerJourneyUi[locale].resultLabel : copy.next}</span>{section.next}</p></div>
        </>}
      </div>
      <footer className="investment-footer"><p>{footerMessage ?? (commercialPresentation ? commercialCopy.footer : copy.disclaimer)}</p><p>Índice · 2026</p></footer>
    </main>
  </div>;
}
