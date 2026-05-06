import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from 'recharts';

import type { PersonalPerformanceSectionKey } from '../../../../api/HomePanel/PersonalPerformance/personalPerformance';
import type { PersonalPerformancePdfCopy } from '../../../../context/LanguageContext';
import type {
  PerformanceQuestionScore,
  PerformanceSectionScore,
  PersonalPerformanceScoreReport,
} from '../personalPerformanceScoring';

import '../../BusinessProfile/BusinessDiagnosisPdf/businessDiagnosisPdf.css';

export type PersonalPerformancePdfDocumentProps = {
  report: PersonalPerformanceScoreReport;
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

const SECTION_COLOR_CLASS: Record<PersonalPerformanceSectionKey, string> = {
  sleep_recovery: 'people',
  nutrition_energy: 'finance',
  stress_clarity: 'products',
  balance_sustainability: 'processes',
};

const RADAR_COLORS = {
  people: { stroke: '#2563eb', fill: '#dbeafe' },
  processes: { stroke: '#d97706', fill: '#fef3c7' },
  products: { stroke: '#ea580c', fill: '#ffedd5' },
  finance: { stroke: '#059669', fill: '#dcfce7' },
};

const RADAR_KEYS = ['people', 'processes', 'products', 'finance'] as const;

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

const getLowestQuestion = (section: PerformanceSectionScore): PerformanceQuestionScore | null => {
  const answeredQuestions = section.questions.filter((question) => question.selectedOptionValue !== null);
  if (answeredQuestions.length === 0) {
    return null;
  }

  return answeredQuestions.reduce((lowestQuestion, question) => (
    question.points < lowestQuestion.points ? question : lowestQuestion
  ));
};

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

const getScoreTone = (score: number) => {
  if (score >= 76) {
    return 'high';
  }
  if (score >= 60) {
    return 'medium';
  }

  return 'low';
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

const getExecutiveSummary = (
  report: PersonalPerformanceScoreReport,
  strongestSection: PerformanceSectionScore,
  weakestSection: PerformanceSectionScore,
  copy: PersonalPerformancePdfCopy,
) => applyTemplate(copy.summaryTemplate, {
  score: report.overall.averageScore,
  strongest: strongestSection.title,
  weakest: weakestSection.title,
});

const getSectionInterpretation = (section: PerformanceSectionScore, copy: PersonalPerformancePdfCopy) => (
  applyTemplate(copy.sectionInterpretations[getScoreBand(section.averageScore)], {
    section: section.title,
  })
);

const getOpportunityNarrative = (section: PerformanceSectionScore, copy: PersonalPerformancePdfCopy) => {
  const lowestQuestion = getLowestQuestion(section);

  if (!lowestQuestion) {
    return copy.incompleteOpportunity;
  }

  return applyTemplate(copy.opportunityTemplate, {
    question: lowestQuestion.question,
    answer: lowestQuestion.selectedOptionLabel ?? copy.pending,
  });
};

const getPrioritySections = (report: PersonalPerformanceScoreReport) => (
  [...report.sections]
    .sort((left, right) => left.averageScore - right.averageScore)
    .slice(0, 3)
);

export function PersonalPerformancePdfDocument({
  report,
  title,
  subtitle,
  generatedAt,
  reportId,
  copy,
  locale,
  userLabel,
  logoUrl,
}: PersonalPerformancePdfDocumentProps) {
  const sortedSections = sortSectionsByScore(report);
  const strongestSection = sortedSections[0];
  const weakestSection = sortedSections[sortedSections.length - 1];
  const overallScoreTone = getScoreTone(report.overall.averageScore);
  const currentProgressStep = getProgressStepIndex(report.overall.averageScore);
  const maturityProgressPercent = copy.progressLevels.length > 1
    ? (currentProgressStep / (copy.progressLevels.length - 1)) * 100
    : 0;
  const radarData = report.sections.map((section) => ({
    label: section.title,
    people: SECTION_COLOR_CLASS[section.key] === 'people' ? section.averageScore : 0,
    processes: SECTION_COLOR_CLASS[section.key] === 'processes' ? section.averageScore : 0,
    products: SECTION_COLOR_CLASS[section.key] === 'products' ? section.averageScore : 0,
    finance: SECTION_COLOR_CLASS[section.key] === 'finance' ? section.averageScore : 0,
  }));
  const overallLevel = getLevelLabel(report.overall.level.level, copy);
  const overallInterpretation = copy.overallInterpretations[getScoreBand(report.overall.averageScore)];

  return (
    <div className="bdpdf-report-shell bdpdf-report-shell--executive">
      <section className="bdpdf-report-page">
        <div className="bdpdf-page-card bdpdf-page-card--cover">
          <div className="bdpdf-cover">
            <div className="bdpdf-cover-topline">
              <div className="bdpdf-brand-badge">{copy.brandBadge}</div>
              <div className="bdpdf-report-id">{reportId}</div>
            </div>

            <div className="bdpdf-cover-main">
              <div>
                <h1 className="bdpdf-cover-title">{title}</h1>
                <p className="bdpdf-cover-subtitle">{subtitle}</p>
              </div>
              {logoUrl ? (
                <img className="bdpdf-cover-logo" src={logoUrl} alt="" />
              ) : (
                <div className="bdpdf-cover-logo bdpdf-cover-logo--empty" aria-hidden="true" />
              )}
            </div>

            <div className="bdpdf-hero-meta">
              <div className="bdpdf-meta-card">
                <p className="bdpdf-meta-label">{copy.userLabel}</p>
                <p className="bdpdf-meta-value">{getEntityLabel(userLabel, copy.userFallback)}</p>
              </div>
              <div className="bdpdf-meta-card">
                <p className="bdpdf-meta-label">{copy.generatedLabel}</p>
                <p className="bdpdf-meta-value">{formatReportDate(generatedAt, locale)}</p>
              </div>
              <div className="bdpdf-meta-card">
                <p className="bdpdf-meta-label">{copy.answeredLabel}</p>
                <p className="bdpdf-meta-value">
                  {report.overall.answeredCount}/{report.overall.totalQuestions} {copy.questionsLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="bdpdf-page-content">
            <div className="bdpdf-section bdpdf-executive-summary">
              <div className="bdpdf-section-heading">
                <div>
                  <h2 className="bdpdf-section-title">{copy.executiveSummaryTitle}</h2>
                  <p className="bdpdf-section-caption">{copy.executiveSummaryCaption}</p>
                </div>
              </div>

              <div className="bdpdf-executive-grid">
                <div className={`bdpdf-score-hero-card score-${overallScoreTone}`}>
                  <p className="bdpdf-highlight-label">{copy.totalScore}</p>
                  <p className={`bdpdf-score-hero-value score-${overallScoreTone}`}>{report.overall.averageScore}</p>
                  <p className="bdpdf-highlight-text">{copy.outOf100}</p>
                </div>
                <div className="bdpdf-summary-card">
                  <p className="bdpdf-lead">{getExecutiveSummary(report, strongestSection, weakestSection, copy)}</p>
                  <p className="bdpdf-lead bdpdf-lead--secondary">{overallInterpretation}</p>
                </div>
              </div>

              <div className="bdpdf-highlight-grid">
                <div className={`bdpdf-highlight-card bdpdf-highlight-card--score score-${overallScoreTone}`}>
                  <p className="bdpdf-highlight-label">{copy.totalScore}</p>
                  <p className="bdpdf-highlight-value">{report.overall.averageScore}</p>
                  <p className="bdpdf-highlight-text">{copy.outOf100}</p>
                </div>
                <div className="bdpdf-highlight-card bdpdf-highlight-card--level">
                  <p className="bdpdf-highlight-label">{copy.performanceLevel}</p>
                  <p className="bdpdf-highlight-value">{overallLevel}</p>
                  <p className="bdpdf-highlight-text">{report.overall.level.level}/5</p>
                </div>
                <div className={`bdpdf-highlight-card color-${SECTION_COLOR_CLASS[strongestSection.key]}`}>
                  <p className="bdpdf-highlight-label">{copy.strongestArea}</p>
                  <p className="bdpdf-highlight-value">{strongestSection.averageScore}</p>
                  <p className="bdpdf-highlight-text">{strongestSection.title}</p>
                </div>
                <div className={`bdpdf-highlight-card color-${SECTION_COLOR_CLASS[weakestSection.key]}`}>
                  <p className="bdpdf-highlight-label">{copy.weakestArea}</p>
                  <p className="bdpdf-highlight-value">{weakestSection.averageScore}</p>
                  <p className="bdpdf-highlight-text">{weakestSection.title}</p>
                </div>
              </div>
            </div>

            <div className="bdpdf-section">
              <div className="bdpdf-section-heading">
                <div>
                  <h2 className="bdpdf-section-title">{copy.dashboardTitle}</h2>
                  <p className="bdpdf-section-caption">{copy.dashboardCaption}</p>
                </div>
              </div>

              <div className="bdpdf-dashboard-grid">
                <div className="bdpdf-chart-card">
                  <h3 className="bdpdf-chart-title">{copy.radarTitle}</h3>
                  <RadarChart width={310} height={245} data={radarData} outerRadius={86}>
                    <PolarGrid stroke="#d8e2f0" />
                    <PolarAngleAxis dataKey="label" tick={{ fill: '#475569', fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                    {RADAR_KEYS.map((key) => (
                      <Radar
                        key={key}
                        dataKey={key}
                        stroke={RADAR_COLORS[key].stroke}
                        fill={RADAR_COLORS[key].fill}
                        fillOpacity={0.7}
                        strokeWidth={2}
                        isAnimationActive={false}
                      />
                    ))}
                  </RadarChart>
                  <div className="bdpdf-radar-legend">
                    {report.sections.map((section) => (
                      <span className="bdpdf-radar-legend-item" key={section.key}>
                        <span className={`bdpdf-radar-dot ${SECTION_COLOR_CLASS[section.key]}`} />
                        {section.title}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bdpdf-progress-card">
                  <h3 className="bdpdf-chart-title">{copy.progressTitle}</h3>
                  <div className="bdpdf-maturity-track">
                    <div
                      className="bdpdf-maturity-fill"
                      style={{ width: `${maturityProgressPercent}%` }}
                    />
                  </div>
                  <div className="bdpdf-maturity-rail">
                    {copy.progressLevels.map((level, index) => (
                      <div
                        key={level}
                        className={`bdpdf-maturity-step ${index <= currentProgressStep ? 'is-active' : ''}`}
                      >
                        <span className="bdpdf-maturity-dot" />
                        <span className="bdpdf-maturity-label">{level}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bdpdf-report-page">
        <div className="bdpdf-page-card">
          <div className="bdpdf-page-content">
            <div className="bdpdf-section">
              <div className="bdpdf-section-heading">
                <div>
                  <h2 className="bdpdf-section-title">{copy.sectionBreakdownTitle}</h2>
                  <p className="bdpdf-section-caption">{copy.sectionBreakdownCaption}</p>
                </div>
              </div>

              <div className="bdpdf-pillars-grid">
                {report.sections.map((section) => (
                  <article
                    className={`bdpdf-pillar-card bdpdf-pillar-card--executive color-${SECTION_COLOR_CLASS[section.key]}`}
                    key={section.key}
                  >
                    <div className="bdpdf-pillar-header">
                      <div>
                        <h3 className="bdpdf-pillar-title">{section.title}</h3>
                        <p className="bdpdf-pillar-subtitle">
                          {section.answeredCount}/{section.totalQuestions} {copy.questionsLabel}
                        </p>
                      </div>
                      <span className={`bdpdf-score-chip level-${section.level.level}`}>
                        {getLevelLabel(section.level.level, copy)}
                      </span>
                    </div>

                    <div className="bdpdf-pillar-score-row">
                      <p className="bdpdf-pillar-score">
                        {section.averageScore}
                        <span>/100</span>
                      </p>
                      <p className="bdpdf-section-caption">{copy.focusLabels[section.key]}</p>
                    </div>

                    <div className="bdpdf-progress-bar">
                      <div
                        className={`bdpdf-progress-value ${SECTION_COLOR_CLASS[section.key]}`}
                        style={{ width: `${section.averageScore}%` }}
                      />
                    </div>

                    <div className="bdpdf-insight-box">
                      <p>{getSectionInterpretation(section, copy)}</p>
                      <p>{getOpportunityNarrative(section, copy)}</p>
                    </div>

                    <div className="bdpdf-recommendation-strip">
                      <p className="bdpdf-recommendation-rank">{copy.recommendationLabel}</p>
                      <p>{copy.priorityActions[section.key][0]}</p>
                      <p className="bdpdf-recommendation-module">
                        {copy.suggestedFocusLabel}: <strong>{copy.focusLabels[section.key]}</strong>
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="bdpdf-section">
              <div className="bdpdf-section-heading">
                <div>
                  <h2 className="bdpdf-section-title">{copy.weakestArea}</h2>
                  <p className="bdpdf-section-caption">{copy.dashboardCaption}</p>
                </div>
              </div>

              <div className="bdpdf-recommendation-grid">
                {getPrioritySections(report).map((section, index) => (
                  <article className={`bdpdf-recommendation-card color-${SECTION_COLOR_CLASS[section.key]}`} key={section.key}>
                    <div className="bdpdf-recommendation-rank">{copy.priorityLabel} {index + 1}</div>
                    <h3 className="bdpdf-recommendation-title">{section.title}</h3>
                    <p className="bdpdf-recommendation-body">{copy.priorityActions[section.key][0]}</p>
                    <p className="bdpdf-recommendation-module">
                      {copy.suggestedFocusLabel}: <strong>{copy.focusLabels[section.key]}</strong>
                    </p>
                  </article>
                ))}
              </div>

              <div className="bdpdf-footer-note">
                <span>{copy.footerLeft}</span>
                <span>{copy.footerRight}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bdpdf-report-page">
        <div className="bdpdf-page-card">
          <div className="bdpdf-page-content">
            <div className="bdpdf-section">
              <div className="bdpdf-section-heading">
                <div>
                  <h2 className="bdpdf-section-title">{copy.detailedAnswersTitle}</h2>
                  <p className="bdpdf-section-caption">{copy.detailedAnswersCaption}</p>
                </div>
              </div>

              {report.sections.map((section) => (
                <article className={`bdpdf-table-card bdpdf-section color-${SECTION_COLOR_CLASS[section.key]}`} key={section.key}>
                  <h3 className="bdpdf-table-title">{section.title}</h3>
                  <table className="bdpdf-table">
                    <thead>
                      <tr>
                        <th style={{ width: '7%' }}>#</th>
                        <th style={{ width: '43%' }}>{copy.questionColumn}</th>
                        <th style={{ width: '34%' }}>{copy.selectedAnswerColumn}</th>
                        <th style={{ width: '16%' }}>{copy.scoreColumn}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.questions.map((question) => (
                        <tr key={`${section.key}-${question.index}`}>
                          <td className="bdpdf-question-number">{question.index}</td>
                          <td>{question.question}</td>
                          <td>{question.selectedOptionLabel ?? <span className="bdpdf-muted">{copy.pending}</span>}</td>
                          <td>{question.points}/100</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
