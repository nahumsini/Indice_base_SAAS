import type { PersonalPerformanceSectionKey } from '../../../../api/HomePanel/PersonalPerformance/personalPerformance';
import type {
  PerformanceSectionScore,
  PersonalPerformanceScoreReport,
} from '../personalPerformanceScoring';
import type {
  AggregatedHumanTag,
  HumanInsightType,
  HumanPerformanceInsight,
  PersonalPerformanceEngineReport,
} from '../personalPerformanceEngine';
import type { PersonalPerformancePdfCopy } from '../translations';

import '../../BusinessProfile/BusinessDiagnosisPdf/businessDiagnosisPdf.css';

export type PersonalPerformancePdfDocumentProps = {
  report: PersonalPerformanceScoreReport;
  engineReport?: PersonalPerformanceEngineReport;
  title: string;
  subtitle: string;
  generatedAt: Date;
  reportId: string;
  copy: PersonalPerformancePdfCopy;
  fileName: string;
  locale: string;
  userLabel?: string | null;
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

const sortSectionsByScore = (report: PersonalPerformanceScoreReport) => (
  [...report.sections].sort((left, right) => {
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

const getLevelLabel = (level: number, copy: PersonalPerformancePdfCopy) => {
  const levelKey = `level${Math.max(1, Math.min(5, level))}` as keyof PersonalPerformancePdfCopy['levelNames'];
  return copy.levelNames[levelKey];
};

const applyTemplate = (template: string, values: Record<string, string | number>) => (
  Object.entries(values).reduce((nextTemplate, [key, value]) => (
    nextTemplate.split(`{${key}}`).join(String(value))
  ), template)
);

const getSectionInterpretation = (section: PerformanceSectionScore, copy: PersonalPerformancePdfCopy) => (
  applyTemplate(copy.sectionInterpretations[getScoreBand(section.averageScore)], {
    section: copy.focusLabels[section.key] ?? section.title,
  })
);

const getDisplaySectionTitle = (
  section: PerformanceSectionScore,
  copy: PersonalPerformancePdfCopy,
) => copy.focusLabels[section.key] ?? section.title;

const getFallbackExecutiveSummary = (
  report: PersonalPerformanceScoreReport,
  strongestSection: PerformanceSectionScore,
  weakestSection: PerformanceSectionScore,
  copy: PersonalPerformancePdfCopy,
) => applyTemplate(copy.summaryTemplate, {
  score: report.overall.averageScore,
  strongest: getDisplaySectionTitle(strongestSection, copy),
  weakest: getDisplaySectionTitle(weakestSection, copy),
});

const getInsightLabel = (
  type: HumanInsightType,
  labels: PersonalPerformanceEngineReport['labels'] | undefined,
  editorial: PersonalPerformancePdfCopy['editorial'],
) => {
  if (!labels) {
    return editorial.insightLabel;
  }

  const labelMap: Record<HumanInsightType, string> = {
    main_personal_operational_risk: labels.mainRisk,
    dominant_pattern: labels.pattern,
    wear_source: labels.wearSource,
    detected_dependency: labels.dependency,
    sustainability_risk: labels.sustainability,
    burnout_risk: labels.burnoutRisk,
    highest_roi_habit: labels.habitRoi,
    first_boundary: labels.firstBoundary,
    immediate_action: labels.action,
  };

  return labelMap[type];
};

const getInsight = (
  engineReport: PersonalPerformanceEngineReport | undefined,
  type: HumanInsightType,
) => engineReport?.insights.find((insight) => insight.type === type);

const getTagForSection = (
  engineReport: PersonalPerformanceEngineReport | undefined,
  sectionKey: PersonalPerformanceSectionKey,
): AggregatedHumanTag | undefined => (
  engineReport?.tags.find((tag) => tag.sections.includes(sectionKey) && tag.category !== 'capacity')
  ?? engineReport?.tags.find((tag) => tag.sections.includes(sectionKey))
);

const getProfileFallback = (
  engineReport: PersonalPerformanceEngineReport | undefined,
  fallback: string,
) => engineReport?.profile.title ?? fallback;

export function PersonalPerformancePdfDocument({
  report,
  engineReport,
  subtitle,
  generatedAt,
  reportId,
  copy: sourceCopy,
  locale,
  userLabel,
}: PersonalPerformancePdfDocumentProps) {
  const copy = sourceCopy;
  const editorial = copy.editorial;
  const effectiveReport = engineReport?.scoreReport ?? report;
  const sortedSections = sortSectionsByScore(effectiveReport);
  const strongestSection = sortedSections[0];
  const weakestSection = sortedSections[sortedSections.length - 1];
  const hasAnyAnswers = effectiveReport.overall.answeredCount > 0;
  const formattedDate = formatReportDate(generatedAt, locale);
  const reportUserName = getEntityLabel(userLabel, copy.userFallback);
  const confidenceValue = engineReport?.confidenceScore ?? effectiveReport.overall.completionPercent;
  const overallLevel = getLevelLabel(effectiveReport.overall.level.level, copy);
  const currentProgressStep = getProgressStepIndex(effectiveReport.overall.averageScore);
  const maturityProgressPercent = copy.progressLevels.length > 1
    ? (currentProgressStep / (copy.progressLevels.length - 1)) * 100
    : 0;
  const fallbackSummary = hasAnyAnswers
    ? getFallbackExecutiveSummary(effectiveReport, strongestSection, weakestSection, copy)
    : copy.incompleteOpportunity;
  const executiveSummary = engineReport?.executiveSummary ?? fallbackSummary;
  const crossRead = engineReport?.crossRead ?? copy.overallInterpretations[getScoreBand(effectiveReport.overall.averageScore)];
  const completenessNote = engineReport?.completenessNote ?? fallbackSummary;
  const mainRisk = getInsight(engineReport, 'main_personal_operational_risk');
  const dominantPattern = getInsight(engineReport, 'dominant_pattern');
  const wearSource = getInsight(engineReport, 'wear_source');
  const dependency = getInsight(engineReport, 'detected_dependency');
  const sustainability = getInsight(engineReport, 'sustainability_risk');
  const burnout = getInsight(engineReport, 'burnout_risk');
  const highestRoiHabit = getInsight(engineReport, 'highest_roi_habit');
  const firstBoundary = getInsight(engineReport, 'first_boundary');
  const immediateAction = getInsight(engineReport, 'immediate_action') ?? highestRoiHabit ?? firstBoundary ?? mainRisk;
  const executiveFindings = ([
    mainRisk,
    dominantPattern,
    immediateAction,
  ].filter(Boolean) as HumanPerformanceInsight[]).slice(0, 3);
  const decisionItems = ([
    dependency,
    sustainability,
    burnout,
    firstBoundary,
  ].filter((insight) => (
    insight
    && (
      insight.evidence.length > 0
      || engineReport?.patterns.some((pattern) => pattern.type === insight.type)
    )
  )) as HumanPerformanceInsight[]).slice(0, 3);
  const effectiveDecisionItems = decisionItems.length > 0
    ? decisionItems
    : ([mainRisk, immediateAction, sustainability].filter(Boolean) as HumanPerformanceInsight[]).slice(0, 3);
  const fallbackRoadmapCopy = copy.fallbackRoadmap;
  const roadmap = engineReport?.roadmap ?? [
    {
      label: fallbackRoadmapCopy[0].label,
      title: immediateAction?.title ?? copy.recommendationLabel,
      body: immediateAction?.recommendedAction ?? fallbackSummary,
      expectedResult: fallbackRoadmapCopy[0].expectedResult,
    },
    {
      label: fallbackRoadmapCopy[1].label,
      title: firstBoundary?.title ?? copy.weakestArea,
      body: firstBoundary?.recommendedAction ?? fallbackSummary,
      expectedResult: fallbackRoadmapCopy[1].expectedResult,
    },
    {
      label: fallbackRoadmapCopy[2].label,
      title: sustainability?.title ?? copy.performanceLevel,
      body: sustainability?.recommendedAction ?? fallbackSummary,
      expectedResult: fallbackRoadmapCopy[2].expectedResult,
    },
  ];

  return (
    <div className="bdpdf-report-shell bdpdf-report-shell--executive bdpdf-report-shell--editorial">
      <section className="bdpdf-report-page bdpdf-report-page--cover-editorial">
        <div className="bdpdf-page-card bdpdf-page-card--cover">
          <div className="bdpdf-editorial-cover">
            <header className="bdpdf-cover-document-header">
              <div>
                <strong>{editorial.indice}</strong>
                <span>{editorial.humanCapacity}</span>
              </div>
              <p>{reportId}</p>
            </header>

            <div className="bdpdf-cover-title-block">
              <p className="bdpdf-editorial-kicker">{editorial.profile}</p>
              <h1>{editorial.reportTitle}</h1>
              <span>{subtitle}</span>
            </div>

            <div className="bdpdf-cover-meta">
              <div>
                <span>{editorial.preparedFor}</span>
                <strong>{reportUserName}</strong>
              </div>
              <div>
                <span>{editorial.date}</span>
                <strong>{formattedDate}</strong>
              </div>
            </div>

            <section className="bdpdf-cover-insight">
              <p>{editorial.insightLabel}</p>
              <h2>{executiveSummary}</h2>
              <span>{crossRead}</span>
            </section>

            <section className="bdpdf-cover-score-strip" aria-label={editorial.scoreSummary}>
              <div>
                <span>IRP / PPI</span>
                <strong>{effectiveReport.overall.averageScore}/100</strong>
              </div>
              <div>
                <span>{engineReport?.labels.confidence ?? copy.progressTitle}</span>
                <strong>{confidenceValue}%</strong>
              </div>
              <div>
                <span>{editorial.profile}</span>
                <strong>{getProfileFallback(engineReport, overallLevel)}</strong>
              </div>
            </section>

            <section className="bdpdf-cover-next-move">
              <p>{editorial.nextMove}</p>
              <h2>{immediateAction?.title ?? copy.recommendationLabel}</h2>
              <span>{immediateAction?.recommendedAction ?? completenessNote}</span>
            </section>

            <footer className="bdpdf-cover-footer">
              <span>{editorial.generatedFrom}</span>
              <span>{effectiveReport.overall.answeredCount}/{effectiveReport.overall.totalQuestions} {editorial.answered}</span>
            </footer>
          </div>
        </div>
      </section>

      <section className="bdpdf-report-page">
        <div className="bdpdf-page-card">
          <div className="bdpdf-editorial-page">
            <header className="bdpdf-editorial-page-header">
              <span>{editorial.indice}</span>
              <span>{editorial.humanCapacity}</span>
            </header>

            <div className="bdpdf-editorial-section-heading">
              <p>02</p>
              <div>
                <h2>{editorial.executiveFindings}</h2>
                <span>{editorial.executiveFindingsCaption}</span>
              </div>
            </div>

            <div className="bdpdf-finding-list">
              {executiveFindings.map((insight, index) => (
                <article className="bdpdf-finding-row" key={`${insight.type}-${insight.title}`}>
                  <div className="bdpdf-finding-number">{`0${index + 1}`}</div>
                  <div className="bdpdf-finding-body">
                    <p>{getInsightLabel(insight.type, engineReport?.labels, editorial)}</p>
                    <h3>{insight.title}</h3>
                    <span>{insight.message}</span>
                    <strong>{editorial.action}: {insight.recommendedAction}</strong>
                  </div>
                </article>
              ))}
            </div>

            <footer className="bdpdf-editorial-page-footer">
              <span>{reportUserName}</span>
              <span>{editorial.footer}</span>
            </footer>
          </div>
        </div>
      </section>

      <section className="bdpdf-report-page">
        <div className="bdpdf-page-card">
          <div className="bdpdf-editorial-page">
            <header className="bdpdf-editorial-page-header">
              <span>{editorial.indice}</span>
              <span>{formattedDate}</span>
            </header>

            <div className="bdpdf-editorial-section-heading">
              <p>03</p>
              <div>
                <h2>{editorial.capacityView}</h2>
                <span>{editorial.capacityViewCaption}</span>
              </div>
            </div>

            <div className="bdpdf-maturity-editorial-grid">
              <section className="bdpdf-capability-bars">
                {effectiveReport.sections.map((section) => (
                  <div className="bdpdf-capability-row" key={section.key}>
                    <div className="bdpdf-capability-label">
                      <strong>{getDisplaySectionTitle(section, copy)}</strong>
                      <span>{getLevelLabel(section.level.level, copy)}</span>
                    </div>
                    <div className="bdpdf-capability-bar" aria-hidden="true">
                      <span style={{ width: `${section.averageScore}%` }} />
                    </div>
                    <p>{section.averageScore}/100</p>
                  </div>
                ))}
              </section>

              <aside className="bdpdf-maturity-summary">
                <p>{editorial.scoreSummary}</p>
                <strong>{effectiveReport.overall.averageScore}/100</strong>
                <span>{overallLevel}</span>
                <small>{completenessNote}</small>
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
              <span>{reportUserName}</span>
              <span>{editorial.footer}</span>
            </footer>
          </div>
        </div>
      </section>

      <section className="bdpdf-report-page">
        <div className="bdpdf-page-card">
          <div className="bdpdf-editorial-page">
            <header className="bdpdf-editorial-page-header">
              <span>{editorial.indice}</span>
              <span>{editorial.humanCapacity}</span>
            </header>

            <div className="bdpdf-editorial-section-heading">
              <p>04</p>
              <div>
                <h2>{editorial.operatingBreakdown}</h2>
                <span>{editorial.operatingBreakdownCaption}</span>
              </div>
            </div>

            <div className="bdpdf-pillar-editorial-table">
              <div className="bdpdf-pillar-editorial-head">
                <span>{editorial.section}</span>
                <span>IRP</span>
                <span>{editorial.risk}</span>
                <span>{editorial.action}</span>
              </div>
              {effectiveReport.sections.map((section) => {
                const sectionTag = getTagForSection(engineReport, section.key);

                return (
                  <article className="bdpdf-pillar-editorial-row" key={section.key}>
                    <div>
                      <h3>{getDisplaySectionTitle(section, copy)}</h3>
                      <p>{getSectionInterpretation(section, copy)}</p>
                      <small>{section.answeredCount}/{section.totalQuestions} {copy.questionsLabel}</small>
                    </div>
                    <div>
                      <strong>{section.averageScore}</strong>
                      <span>/100</span>
                    </div>
                    <p>{sectionTag?.operationalRisk ?? copy.overallInterpretations[getScoreBand(section.averageScore)]}</p>
                    <div>
                      <p>{sectionTag?.recommendedAction ?? copy.priorityActions[section.key][0]}</p>
                      <small>{sectionTag?.label ?? copy.focusLabels[section.key]}</small>
                    </div>
                  </article>
                );
              })}
            </div>

            <footer className="bdpdf-editorial-page-footer">
              <span>{reportUserName}</span>
              <span>{editorial.footer}</span>
            </footer>
          </div>
        </div>
      </section>

      <section className="bdpdf-report-page">
        <div className="bdpdf-page-card">
          <div className="bdpdf-editorial-page">
            <header className="bdpdf-editorial-page-header">
              <span>{editorial.indice}</span>
              <span>{formattedDate}</span>
            </header>

            <div className="bdpdf-editorial-section-heading">
              <p>05</p>
              <div>
                <h2>{editorial.decisions}</h2>
                <span>{editorial.decisionsCaption}</span>
              </div>
            </div>

            <div className="bdpdf-decision-list">
              {effectiveDecisionItems.map((insight, index) => (
                <article className="bdpdf-decision-row" key={`${insight.type}-${insight.title}`}>
                  <div className="bdpdf-decision-index">{`0${index + 1}`}</div>
                  <div>
                    <h3>{insight.title}</h3>
                    <dl>
                      <div>
                        <dt>{editorial.impact}</dt>
                        <dd>{insight.operationalImpact}</dd>
                      </div>
                      <div>
                        <dt>{editorial.evidence}</dt>
                        <dd>{insight.evidence[0] ?? insight.message}</dd>
                      </div>
                      <div>
                        <dt>{editorial.decision}</dt>
                        <dd>{insight.recommendedAction}</dd>
                      </div>
                    </dl>
                  </div>
                </article>
              ))}
            </div>

            <footer className="bdpdf-editorial-page-footer">
              <span>{reportUserName}</span>
              <span>{editorial.footer}</span>
            </footer>
          </div>
        </div>
      </section>

      <section className="bdpdf-report-page">
        <div className="bdpdf-page-card">
          <div className="bdpdf-editorial-page">
            <header className="bdpdf-editorial-page-header">
              <span>{editorial.indice}</span>
              <span>{reportId}</span>
            </header>

            <div className="bdpdf-editorial-section-heading">
              <p>06</p>
              <div>
                <h2>{editorial.roadmap}</h2>
                <span>{editorial.roadmapCaption}</span>
              </div>
            </div>

            <div className="bdpdf-roadmap-editorial">
              {roadmap.map((item) => (
                <article className="bdpdf-roadmap-editorial-step" key={`${item.label}-${item.title}`}>
                  <div className="bdpdf-roadmap-editorial-time">{item.label}</div>
                  <div className="bdpdf-roadmap-editorial-body">
                    <div>
                      <span>{editorial.focus}</span>
                      <h3>{item.title}</h3>
                    </div>
                    <div>
                      <span>{editorial.action}</span>
                      <p>{item.body}</p>
                    </div>
                    <div>
                      <span>{editorial.expectedResult}</span>
                      <p>{item.expectedResult}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <footer className="bdpdf-editorial-page-footer">
              <span>{reportUserName}</span>
              <span>{editorial.footer}</span>
            </footer>
          </div>
        </div>
      </section>
    </div>
  );
}
