import type {
  BusinessDiagnosisScoreReport,
  DiagnosisPillarScore,
} from '../businessDiagnosisScoring';
import { buildBusinessDiagnosisNarrative } from '../businessDiagnosisInterpretation';
import type { BusinessDiagnosisEngineReport, DiagnosisInsight, DiagnosisInsightType } from '../diagnosisEngine';
import {
  getBusinessDiagnosisPdfTranslations,
  type BusinessDiagnosisPdfTranslations,
} from './translations';

import './businessDiagnosisPdf.css';

export type BusinessDiagnosisPdfDocumentProps = {
  report: BusinessDiagnosisScoreReport;
  engineReport?: BusinessDiagnosisEngineReport;
  title: string;
  subtitle: string;
  generatedAt: Date;
  reportId: string;
  fileName: string;
  locale: string;
  companyName?: string | null;
  logoUrl?: string | null;
};

const formatReportDate = (value: Date, locale: string) => new Intl.DateTimeFormat(locale, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(value);

const getEntityLabel = (value: string | null | undefined, fallback: string) => (
  value && value.trim().length > 0 ? value.trim() : fallback
);

const sortPillarsByScore = (report: BusinessDiagnosisScoreReport) => (
  [...report.pillars].sort((left, right) => {
    if (left.averageScore === right.averageScore) {
      return left.title.localeCompare(right.title);
    }

    return right.averageScore - left.averageScore;
  })
);

const getScoreBand = (score: number) => {
  if (score <= 40) {
    return 'critical';
  }
  if (score <= 60) {
    return 'emerging';
  }
  if (score <= 75) {
    return 'organized';
  }
  if (score <= 90) {
    return 'scalable';
  }

  return 'optimized';
};

const getProgressStepIndex = (score: number) => {
  if (score <= 40) {
    return 0;
  }
  if (score <= 75) {
    return 1;
  }
  if (score <= 90) {
    return 2;
  }

  return 3;
};

const getLevelLabel = (level: number, copy: BusinessDiagnosisPdfTranslations) => {
  const levelKey = `level${Math.max(1, Math.min(5, level))}` as keyof BusinessDiagnosisPdfTranslations['levelNames'];
  return copy.levelNames[levelKey];
};

const applyTemplate = (template: string, values: Record<string, string | number>) => (
  Object.entries(values).reduce((nextTemplate, [key, value]) => (
    nextTemplate.split(`{${key}}`).join(String(value))
  ), template)
);

const getInsightToneClass = (type: DiagnosisInsightType) => {
  if (type === 'main_risk' || type === 'growth_risk') {
    return 'risk';
  }

  if (type === 'quick_win' || type === 'highest_roi_area') {
    return 'win';
  }

  return 'focus';
};

const shouldUseNativeEngineText = (locale: string) => locale.toLowerCase().startsWith('es');

const getKnownSuggestedModule = (
  suggestedModule: string | undefined,
  copy: BusinessDiagnosisPdfTranslations,
) => {
  const normalizedModule = suggestedModule?.toLowerCase() ?? '';

  if (!normalizedModule) {
    return undefined;
  }

  if (normalizedModule.includes('human') || normalizedModule.includes('recursos')) {
    return copy.moduleLabels.people;
  }

  if (normalizedModule.includes('process')) {
    return copy.moduleLabels.processes;
  }

  if (normalizedModule.includes('crm') || normalizedModule.includes('venta') || normalizedModule.includes('sale')) {
    return copy.moduleLabels.products;
  }

  if (normalizedModule.includes('gastos') || normalizedModule.includes('kpi') || normalizedModule.includes('expense')) {
    return copy.moduleLabels.finance;
  }

  return suggestedModule;
};

const getPrintableInsight = (
  insight: DiagnosisInsight | undefined,
  copy: BusinessDiagnosisPdfTranslations,
  locale: string,
): DiagnosisInsight | undefined => {
  if (!insight) {
    return undefined;
  }

  const suggestedModule = insight.pillar
    ? copy.moduleLabels[insight.pillar]
    : getKnownSuggestedModule(insight.suggestedModule, copy);

  if (shouldUseNativeEngineText(locale)) {
    return {
      ...insight,
      suggestedModule: suggestedModule ?? insight.suggestedModule,
    };
  }

  const fallback = copy.insightFallbacks[insight.type];

  return {
    ...insight,
    businessImpact: fallback.businessImpact,
    message: fallback.message,
    recommendedAction: fallback.recommendedAction,
    suggestedModule,
    title: fallback.title,
  };
};

const getCompletenessNote = (
  copy: BusinessDiagnosisPdfTranslations,
  answeredCount: number,
  totalQuestions: number,
  confidenceScore: number,
) => {
  if (answeredCount <= 0) {
    return copy.completenessNote.empty;
  }

  return applyTemplate(copy.completenessNote.template, {
    answered: answeredCount,
    confidence: confidenceScore,
    total: totalQuestions,
  });
};

const getExecutiveSummary = (
  report: BusinessDiagnosisScoreReport,
  strongestPillar: DiagnosisPillarScore,
  weakestPillar: DiagnosisPillarScore,
  copy: BusinessDiagnosisPdfTranslations,
) => applyTemplate(copy.summaryTemplate, {
  score: report.overall.averageScore,
  strongest: strongestPillar.title,
  weakest: weakestPillar.title,
});

const getPillarInterpretation = (pillar: DiagnosisPillarScore, copy: BusinessDiagnosisPdfTranslations) => (
  applyTemplate(copy.pillarInterpretations[getScoreBand(pillar.averageScore)], {
    section: pillar.title,
  })
);

export function BusinessDiagnosisPdfDocument({
  report,
  engineReport,
  subtitle,
  generatedAt,
  reportId,
  locale,
  companyName,
}: BusinessDiagnosisPdfDocumentProps) {
  const copy = getBusinessDiagnosisPdfTranslations(locale);
  const effectiveReport = engineReport?.scoreReport ?? report;
  const sortedPillars = sortPillarsByScore(effectiveReport);
  const strongestPillar = sortedPillars[0];
  const weakestPillar = sortedPillars[sortedPillars.length - 1];
  const currentProgressStep = getProgressStepIndex(effectiveReport.overall.averageScore);
  const maturityProgressPercent = copy.progressLevels.length > 1
    ? (currentProgressStep / (copy.progressLevels.length - 1)) * 100
    : 0;
  const overallLevel = getLevelLabel(effectiveReport.overall.maturity.level, copy);
  const reportCompanyName = getEntityLabel(companyName, copy.companyFallback);
  const overallInterpretation = copy.overallInterpretations[getScoreBand(effectiveReport.overall.averageScore)];
  const hasAnyAnswers = effectiveReport.overall.answeredCount > 0;
  const narrative = buildBusinessDiagnosisNarrative(effectiveReport, strongestPillar, weakestPillar, locale);
  const consultingLabels = copy.consulting;
  const editorialLabels = copy.editorial;
  const formattedDate = formatReportDate(generatedAt, locale);
  const confidenceValue = engineReport ? engineReport.confidenceScore : effectiveReport.overall.completionPercent;
  const localizedCompletenessNote = getCompletenessNote(
    copy,
    effectiveReport.overall.answeredCount,
    effectiveReport.overall.totalQuestions,
    confidenceValue,
  );
  const useNativeEngineText = shouldUseNativeEngineText(locale);
  const printableInsights = (engineReport?.insights ?? [])
    .map((insight) => getPrintableInsight(insight, copy, locale))
    .filter(Boolean) as DiagnosisInsight[];
  const getInsight = (type: DiagnosisInsightType) => printableInsights.find((insight) => insight.type === type);
  const mainRiskInsight = getInsight('main_risk');
  const bottleneckInsight = getInsight('operational_bottleneck');
  const priorityInsight = getInsight('single_priority');
  const quickWinInsight = getInsight('quick_win');
  const highestRoiInsight = getInsight('highest_roi_area');
  const growthRiskInsight = getInsight('growth_risk');
  const insightCards = engineReport ? [
    {
      label: copy.insightTypeLabels.main_risk,
      body: mainRiskInsight?.message ?? localizedCompletenessNote,
    },
    {
      label: copy.insightTypeLabels.operational_bottleneck,
      body: bottleneckInsight?.message ?? localizedCompletenessNote,
    },
    {
      label: copy.insightTypeLabels.single_priority,
      body: priorityInsight?.recommendedAction ?? localizedCompletenessNote,
    },
  ] : [
    {
      label: narrative.labels.crossReadTitle,
      body: localizedCompletenessNote,
    },
    {
      label: narrative.labels.priorityTitle,
      body: localizedCompletenessNote,
    },
    {
      label: narrative.labels.actionTitle,
      body: localizedCompletenessNote,
    },
  ];
  const recommendationInsights = printableInsights
    .filter((insight) => ['main_risk', 'operational_bottleneck', 'growth_risk'].includes(insight.type))
    .slice(0, 3) ?? [];
  const quickWinAction = quickWinInsight ?? highestRoiInsight ?? mainRiskInsight;
  const growthRiskAction = growthRiskInsight ?? priorityInsight ?? mainRiskInsight;
  const fallbackActionPlan = copy.roadmapSteps.map((step, index) => {
    const insight = [quickWinAction, priorityInsight ?? mainRiskInsight, growthRiskAction][index];

    return {
      body: insight?.recommendedAction ?? localizedCompletenessNote,
      label: step.label,
      suggestedModule: insight?.suggestedModule,
      title: step.title,
    };
  });
  const actionPlan = useNativeEngineText && engineReport ? engineReport.roadmap : fallbackActionPlan;
  const executiveStatement = engineReport
    && useNativeEngineText
    ? engineReport.executiveSummary
    : hasAnyAnswers
      ? getExecutiveSummary(effectiveReport, strongestPillar, weakestPillar, copy)
      : localizedCompletenessNote;
  const crossReadStatement = engineReport
    && useNativeEngineText
    ? engineReport.crossRead
    : hasAnyAnswers ? overallInterpretation : localizedCompletenessNote;
  const dominantInsight = crossReadStatement || executiveStatement;
  const supportingInsight = dominantInsight === executiveStatement ? crossReadStatement : executiveStatement;
  const primaryAction = priorityInsight ?? mainRiskInsight ?? quickWinInsight;
  const executiveInsightCards: Array<{
    action?: string;
    body: string;
    label: string;
    title: string;
    tone: string;
  }> = engineReport
    ? ([
        mainRiskInsight,
        bottleneckInsight,
        quickWinInsight ?? highestRoiInsight,
      ].filter(Boolean) as DiagnosisInsight[]).map((insight) => ({
        action: insight.recommendedAction,
        body: insight.message,
        label: copy.insightTypeLabels[insight.type],
        title: insight.title,
        tone: getInsightToneClass(insight.type),
      }))
    : insightCards.map((card) => ({
        body: card.body,
        label: card.label,
        title: card.label,
        tone: 'focus',
      }));
  const getPillarInsight = (pillarKey: DiagnosisPillarScore['key']) => (
    printableInsights.find((insight) => insight.pillar === pillarKey)
  );
  const priorityDecisionInsights = recommendationInsights.length > 0
    ? recommendationInsights
    : ([mainRiskInsight, bottleneckInsight, growthRiskInsight].filter(Boolean) as DiagnosisInsight[]);
  const priorityDecisionItems = priorityDecisionInsights.length > 0
    ? priorityDecisionInsights.map((insight) => ({
        decision: insight.recommendedAction,
        evidence: insight.evidence[0] ?? insight.businessImpact,
        key: insight.type,
        module: insight.suggestedModule,
        problem: insight.message,
        title: insight.title,
      }))
    : effectiveReport.pillars.slice(0, 3).map((pillar) => ({
        decision: copy.pillarFallbacks[pillar.key].action,
        evidence: copy.pillarFallbacks[pillar.key].risk,
        key: pillar.key,
        module: copy.moduleLabels[pillar.key],
        problem: getPillarInterpretation(pillar, copy),
        title: pillar.title,
      }));

  return (
    <div className="bdpdf-report-shell bdpdf-report-shell--executive bdpdf-report-shell--editorial">
      <section className="bdpdf-report-page bdpdf-report-page--cover-editorial">
        <div className="bdpdf-page-card bdpdf-page-card--cover">
          <div className="bdpdf-editorial-cover">
            <header className="bdpdf-cover-document-header">
              <div>
                <strong>{editorialLabels.brand}</strong>
                <span>{editorialLabels.businessDiagnosis}</span>
              </div>
              <p>{reportId}</p>
            </header>

            <div className="bdpdf-cover-title-block">
              <p className="bdpdf-editorial-kicker">{editorialLabels.reportTitle}</p>
              <h1>{editorialLabels.reportTitle}</h1>
              <span>{subtitle}</span>
            </div>

            <div className="bdpdf-cover-meta">
              <div>
                <span>{editorialLabels.preparedFor}</span>
                <strong>{reportCompanyName}</strong>
              </div>
              <div>
                <span>{editorialLabels.date}</span>
                <strong>{formattedDate}</strong>
              </div>
            </div>

            <section className="bdpdf-cover-insight">
              <p>{editorialLabels.insightLabel}</p>
              <h2>{dominantInsight}</h2>
              <span>{supportingInsight}</span>
            </section>

            <section className="bdpdf-cover-score-strip" aria-label={editorialLabels.scoreSummary}>
              <div>
                <span>{copy.scoreLabel}</span>
                <strong>{effectiveReport.overall.averageScore}/100</strong>
              </div>
              <div>
                <span>{editorialLabels.confidence}</span>
                <strong>{confidenceValue}%</strong>
              </div>
              <div>
                <span>{editorialLabels.maturity}</span>
                <strong>{overallLevel}</strong>
              </div>
            </section>

            <section className="bdpdf-cover-next-move">
              <p>{consultingLabels.nextMove}</p>
              <h2>{primaryAction?.title ?? narrative.labels.actionTitle}</h2>
              <span>{primaryAction?.recommendedAction ?? actionPlan[0]?.body ?? localizedCompletenessNote}</span>
            </section>

            <footer className="bdpdf-cover-footer">
              <span>{editorialLabels.generatedFrom}</span>
              <span>{effectiveReport.overall.answeredCount}/{effectiveReport.overall.totalQuestions} {editorialLabels.answered}</span>
            </footer>
          </div>
        </div>
      </section>

      <section className="bdpdf-report-page">
        <div className="bdpdf-page-card">
          <div className="bdpdf-editorial-page">
            <header className="bdpdf-editorial-page-header">
              <span>{editorialLabels.brand}</span>
              <span>{editorialLabels.businessDiagnosis}</span>
            </header>

            <div className="bdpdf-editorial-section-heading">
              <p>02</p>
              <div>
                <h2>{editorialLabels.executiveFindings}</h2>
                <span>{editorialLabels.executiveFindingsCaption}</span>
              </div>
            </div>

            <div className="bdpdf-finding-list">
              {executiveInsightCards.map((card, index) => (
                <article className="bdpdf-finding-row" key={`${card.label}-${card.title}`}>
                  <div className="bdpdf-finding-number">{`0${index + 1}`}</div>
                  <div className="bdpdf-finding-body">
                    <p>{card.label}</p>
                    <h3>{card.title}</h3>
                    <span>{card.body}</span>
                    {card.action ? (
                      <strong>{editorialLabels.action}: {card.action}</strong>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            <footer className="bdpdf-editorial-page-footer">
              <span>{reportCompanyName}</span>
              <span>{editorialLabels.footer}</span>
            </footer>
          </div>
        </div>
      </section>

      <section className="bdpdf-report-page">
        <div className="bdpdf-page-card">
          <div className="bdpdf-editorial-page">
            <header className="bdpdf-editorial-page-header">
              <span>{editorialLabels.brand}</span>
              <span>{formattedDate}</span>
            </header>

            <div className="bdpdf-editorial-section-heading">
              <p>03</p>
              <div>
                <h2>{editorialLabels.maturityView}</h2>
                <span>{editorialLabels.maturityViewCaption}</span>
              </div>
            </div>

            <div className="bdpdf-maturity-editorial-grid">
              <section className="bdpdf-capability-bars">
                {effectiveReport.pillars.map((pillar) => (
                  <div className="bdpdf-capability-row" key={pillar.key}>
                    <div className="bdpdf-capability-label">
                      <strong>{pillar.title}</strong>
                      <span>{getLevelLabel(pillar.maturity.level, copy)}</span>
                    </div>
                    <div className="bdpdf-capability-bar" aria-hidden="true">
                      <span style={{ width: `${pillar.averageScore}%` }} />
                    </div>
                    <p>{pillar.averageScore}/100</p>
                  </div>
                ))}
              </section>

              <aside className="bdpdf-maturity-summary">
                <p>{editorialLabels.scoreSummary}</p>
                <strong>{effectiveReport.overall.averageScore}/100</strong>
                <span>{overallLevel}</span>
                <small>{localizedCompletenessNote}</small>
              </aside>
            </div>

            <section className="bdpdf-editorial-progression">
              <div className="bdpdf-editorial-track">
                <span style={{ width: `${maturityProgressPercent}%` }} />
              </div>
              <div className="bdpdf-editorial-steps">
                {copy.progressLevels.map((level, index) => (
                  <div className={index <= currentProgressStep ? 'is-active' : ''} key={level}>
                    <span />
                    <p>{level}</p>
                  </div>
                ))}
              </div>
            </section>

            <footer className="bdpdf-editorial-page-footer">
              <span>{reportCompanyName}</span>
              <span>{editorialLabels.footer}</span>
            </footer>
          </div>
        </div>
      </section>

      <section className="bdpdf-report-page">
        <div className="bdpdf-page-card">
          <div className="bdpdf-editorial-page">
            <header className="bdpdf-editorial-page-header">
              <span>{editorialLabels.brand}</span>
              <span>{editorialLabels.businessDiagnosis}</span>
            </header>

            <div className="bdpdf-editorial-section-heading">
              <p>04</p>
              <div>
                <h2>{editorialLabels.pillarBreakdown}</h2>
                <span>{editorialLabels.pillarBreakdownCaption}</span>
              </div>
            </div>

            <div className="bdpdf-pillar-editorial-table">
              <div className="bdpdf-pillar-editorial-head">
                <span>{editorialLabels.pillar}</span>
                <span>{copy.scoreLabel}</span>
                <span>{editorialLabels.risk}</span>
                <span>{editorialLabels.action}</span>
              </div>
              {effectiveReport.pillars.map((pillar) => {
                const pillarInsight = getPillarInsight(pillar.key);
                const pillarFallback = copy.pillarFallbacks[pillar.key];

                return (
                  <article className="bdpdf-pillar-editorial-row" key={pillar.key}>
                    <div>
                      <h3>{pillar.title}</h3>
                      <p>{getPillarInterpretation(pillar, copy)}</p>
                      <small>{pillar.answeredCount}/{pillar.totalQuestions} {copy.questionsLabel}</small>
                    </div>
                    <div>
                      <strong>{pillar.averageScore}</strong>
                      <span>/100</span>
                    </div>
                    <p>{pillarInsight?.businessImpact ?? pillarFallback.risk}</p>
                    <div>
                      <p>{pillarInsight?.recommendedAction ?? pillarFallback.action}</p>
                      <small>{editorialLabels.module}: {pillarInsight?.suggestedModule ?? copy.moduleLabels[pillar.key]}</small>
                    </div>
                  </article>
                );
              })}
            </div>

            <footer className="bdpdf-editorial-page-footer">
              <span>{reportCompanyName}</span>
              <span>{editorialLabels.footer}</span>
            </footer>
          </div>
        </div>
      </section>

      <section className="bdpdf-report-page">
        <div className="bdpdf-page-card">
          <div className="bdpdf-editorial-page">
            <header className="bdpdf-editorial-page-header">
              <span>{editorialLabels.brand}</span>
              <span>{formattedDate}</span>
            </header>

            <div className="bdpdf-editorial-section-heading">
              <p>05</p>
              <div>
                <h2>{editorialLabels.priorityDecisions}</h2>
                <span>{editorialLabels.priorityDecisionsCaption}</span>
              </div>
            </div>

            <div className="bdpdf-decision-list">
              {priorityDecisionItems.map((item, index) => (
                <article className="bdpdf-decision-row" key={item.key}>
                  <div className="bdpdf-decision-index">{`0${index + 1}`}</div>
                  <div>
                    <h3>{item.title}</h3>
                    <dl>
                      <div>
                        <dt>{editorialLabels.problem}</dt>
                        <dd>{item.problem}</dd>
                      </div>
                      <div>
                        <dt>{editorialLabels.evidence}</dt>
                        <dd>{item.evidence}</dd>
                      </div>
                      <div>
                        <dt>{editorialLabels.decision}</dt>
                        <dd>{item.decision}</dd>
                      </div>
                    </dl>
                    {item.module ? (
                      <p className="bdpdf-secondary-module">{editorialLabels.module}: {item.module}</p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            <footer className="bdpdf-editorial-page-footer">
              <span>{reportCompanyName}</span>
              <span>{editorialLabels.footer}</span>
            </footer>
          </div>
        </div>
      </section>

      <section className="bdpdf-report-page">
        <div className="bdpdf-page-card">
          <div className="bdpdf-editorial-page">
            <header className="bdpdf-editorial-page-header">
              <span>{editorialLabels.brand}</span>
              <span>{reportId}</span>
            </header>

            <div className="bdpdf-editorial-section-heading">
              <p>06</p>
              <div>
                <h2>{editorialLabels.roadmap}</h2>
                <span>{editorialLabels.roadmapCaption}</span>
              </div>
            </div>

            <div className="bdpdf-roadmap-editorial">
              {actionPlan.map((item, index) => {
                const suggestedModule = 'suggestedModule' in item && typeof item.suggestedModule === 'string'
                  ? item.suggestedModule
                  : '';

                return (
                  <article className="bdpdf-roadmap-editorial-step" key={`${item.label}-${item.title}`}>
                    <div className="bdpdf-roadmap-editorial-time">{item.label}</div>
                    <div className="bdpdf-roadmap-editorial-body">
                      <div>
                        <span>{editorialLabels.focus}</span>
                        <h3>{item.title}</h3>
                      </div>
                      <div>
                        <span>{editorialLabels.action}</span>
                        <p>{item.body}</p>
                      </div>
                      <div>
                        <span>{editorialLabels.expectedResult}</span>
                        <p>{copy.roadmapOutcomes[Math.min(index, copy.roadmapOutcomes.length - 1)]}</p>
                      </div>
                      {suggestedModule ? (
                        <small>{editorialLabels.module}: {suggestedModule}</small>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>

            <footer className="bdpdf-editorial-page-footer">
              <span>{reportCompanyName}</span>
              <span>{editorialLabels.footer}</span>
            </footer>
          </div>
        </div>
      </section>
    </div>
  );
}
