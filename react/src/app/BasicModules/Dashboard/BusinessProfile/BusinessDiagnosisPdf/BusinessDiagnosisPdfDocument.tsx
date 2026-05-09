import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from 'recharts';

import type { BusinessProfileSectionKey } from '../../../../api/HomePanel/BusinessProfile/businessProfile';
import type { BusinessDiagnosisPdfCopy } from '../../../../context/LanguageContext';
import type {
  BusinessDiagnosisScoreReport,
  DiagnosisPillarScore,
  DiagnosisQuestionScore,
} from '../businessDiagnosisScoring';

import './businessDiagnosisPdf.css';

export type BusinessDiagnosisPdfDocumentProps = {
  report: BusinessDiagnosisScoreReport;
  title: string;
  subtitle: string;
  generatedAt: Date;
  reportId: string;
  copy: BusinessDiagnosisPdfCopy;
  fileName: string;
  locale: string;
  companyName?: string | null;
  logoUrl?: string | null;
};

const PILLAR_COLOR_CLASS: Record<BusinessProfileSectionKey, string> = {
  people: 'people',
  processes: 'processes',
  products: 'products',
  finance: 'finance',
};

const RADAR_COLORS: Record<BusinessProfileSectionKey, { stroke: string; fill: string }> = {
  people: { stroke: '#2563eb', fill: '#dbeafe' },
  processes: { stroke: '#d97706', fill: '#fef3c7' },
  products: { stroke: '#ea580c', fill: '#ffedd5' },
  finance: { stroke: '#059669', fill: '#dcfce7' },
};

const RADAR_KEYS: BusinessProfileSectionKey[] = ['people', 'processes', 'products', 'finance'];

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

const getLowestQuestion = (pillar: DiagnosisPillarScore): DiagnosisQuestionScore | null => {
  const answeredQuestions = pillar.questions.filter((question) => question.selectedOptionValue !== null);
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

const getLevelLabel = (level: number, copy: BusinessDiagnosisPdfCopy) => {
  const levelKey = `level${Math.max(1, Math.min(5, level))}` as keyof BusinessDiagnosisPdfCopy['levelNames'];
  return copy.levelNames[levelKey];
};

const applyTemplate = (template: string, values: Record<string, string | number>) => (
  Object.entries(values).reduce((nextTemplate, [key, value]) => (
    nextTemplate.split(`{${key}}`).join(String(value))
  ), template)
);

const getExecutiveSummary = (
  report: BusinessDiagnosisScoreReport,
  strongestPillar: DiagnosisPillarScore,
  weakestPillar: DiagnosisPillarScore,
  copy: BusinessDiagnosisPdfCopy,
) => applyTemplate(copy.summaryTemplate, {
  score: report.overall.averageScore,
  strongest: strongestPillar.title,
  weakest: weakestPillar.title,
});

const getPillarInterpretation = (pillar: DiagnosisPillarScore, copy: BusinessDiagnosisPdfCopy) => (
  applyTemplate(copy.pillarInterpretations[getScoreBand(pillar.averageScore)], {
    section: pillar.title,
  })
);

const getOpportunityNarrative = (pillar: DiagnosisPillarScore, copy: BusinessDiagnosisPdfCopy) => {
  const lowestQuestion = getLowestQuestion(pillar);

  if (!lowestQuestion) {
    return copy.incompleteOpportunity;
  }

  return applyTemplate(copy.opportunityTemplate, {
    question: lowestQuestion.question,
    answer: lowestQuestion.selectedOptionLabel ?? copy.pending,
  });
};

export function BusinessDiagnosisPdfDocument({
  report,
  title,
  subtitle,
  generatedAt,
  reportId,
  copy,
  locale,
  companyName,
  logoUrl,
}: BusinessDiagnosisPdfDocumentProps) {
  const sortedPillars = sortPillarsByScore(report);
  const strongestPillar = sortedPillars[0];
  const weakestPillar = sortedPillars[sortedPillars.length - 1];
  const overallScoreTone = getScoreTone(report.overall.averageScore);
  const currentProgressStep = getProgressStepIndex(report.overall.averageScore);
  const maturityProgressPercent = copy.progressLevels.length > 1
    ? (currentProgressStep / (copy.progressLevels.length - 1)) * 100
    : 0;
  const radarData = report.pillars.map((pillar) => ({
    label: pillar.title,
    people: pillar.key === 'people' ? pillar.averageScore : 0,
    processes: pillar.key === 'processes' ? pillar.averageScore : 0,
    products: pillar.key === 'products' ? pillar.averageScore : 0,
    finance: pillar.key === 'finance' ? pillar.averageScore : 0,
  }));
  const overallLevel = getLevelLabel(report.overall.maturity.level, copy);
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
                <p className="bdpdf-meta-label">{copy.companyLabel}</p>
                <p className="bdpdf-meta-value">{getEntityLabel(companyName, copy.companyFallback)}</p>
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
                  <p className="bdpdf-lead">{getExecutiveSummary(report, strongestPillar, weakestPillar, copy)}</p>
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
                  <p className="bdpdf-highlight-label">{copy.maturityLevel}</p>
                  <p className="bdpdf-highlight-value">{overallLevel}</p>
                  <p className="bdpdf-highlight-text">{report.overall.maturity.level}/5</p>
                </div>
                <div className={`bdpdf-highlight-card color-${PILLAR_COLOR_CLASS[strongestPillar.key]}`}>
                  <p className="bdpdf-highlight-label">{copy.strongestPillar}</p>
                  <p className="bdpdf-highlight-value">{strongestPillar.averageScore}</p>
                  <p className="bdpdf-highlight-text">{strongestPillar.title}</p>
                </div>
                <div className={`bdpdf-highlight-card color-${PILLAR_COLOR_CLASS[weakestPillar.key]}`}>
                  <p className="bdpdf-highlight-label">{copy.weakestPillar}</p>
                  <p className="bdpdf-highlight-value">{weakestPillar.averageScore}</p>
                  <p className="bdpdf-highlight-text">{weakestPillar.title}</p>
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
                    {report.pillars.map((pillar) => (
                      <span className="bdpdf-radar-legend-item" key={pillar.key}>
                        <span className={`bdpdf-radar-dot ${PILLAR_COLOR_CLASS[pillar.key]}`} />
                        {pillar.title}
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
                  <h2 className="bdpdf-section-title">{copy.pillarBreakdownTitle}</h2>
                  <p className="bdpdf-section-caption">{copy.pillarBreakdownCaption}</p>
                </div>
              </div>

              <div className="bdpdf-pillars-grid">
                {report.pillars.map((pillar) => (
                  <article
                    className={`bdpdf-pillar-card bdpdf-pillar-card--executive color-${PILLAR_COLOR_CLASS[pillar.key]}`}
                    key={pillar.key}
                  >
                    <div className="bdpdf-pillar-header">
                      <div>
                        <h3 className="bdpdf-pillar-title">{pillar.title}</h3>
                        <p className="bdpdf-pillar-subtitle">
                          {pillar.answeredCount}/{pillar.totalQuestions} {copy.questionsLabel}
                        </p>
                      </div>
                      <span className={`bdpdf-score-chip level-${pillar.maturity.level}`}>
                        {getLevelLabel(pillar.maturity.level, copy)}
                      </span>
                    </div>

                    <div className="bdpdf-pillar-score-row">
                      <p className="bdpdf-pillar-score">
                        {pillar.averageScore}
                        <span>/100</span>
                      </p>
                      <p className="bdpdf-section-caption">{copy.moduleLabels[pillar.key]}</p>
                    </div>

                    <div className="bdpdf-progress-bar">
                      <div
                        className={`bdpdf-progress-value ${PILLAR_COLOR_CLASS[pillar.key]}`}
                        style={{ width: `${pillar.averageScore}%` }}
                      />
                    </div>

                    <div className="bdpdf-insight-box">
                      <p>{getPillarInterpretation(pillar, copy)}</p>
                      <p>{getOpportunityNarrative(pillar, copy)}</p>
                    </div>

                    <div className="bdpdf-recommendation-strip">
                      <p className="bdpdf-recommendation-rank">{copy.recommendationLabel}</p>
                      <p>{copy.priorityActions[pillar.key][0]}</p>
                      <p className="bdpdf-recommendation-module">
                        {copy.suggestedModuleLabel}: <strong>{copy.moduleLabels[pillar.key]}</strong>
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="bdpdf-section">
              <div className="bdpdf-section-heading">
                <div>
                  <h2 className="bdpdf-section-title">{copy.weakestPillar}</h2>
                  <p className="bdpdf-section-caption">{copy.dashboardCaption}</p>
                </div>
              </div>

              <div className="bdpdf-recommendation-grid">
                {sortedPillars.slice().reverse().slice(0, 3).map((pillar, index) => (
                  <article className={`bdpdf-recommendation-card color-${PILLAR_COLOR_CLASS[pillar.key]}`} key={pillar.key}>
                    <div className="bdpdf-recommendation-rank">{copy.priorityLabel} {index + 1}</div>
                    <h3 className="bdpdf-recommendation-title">{pillar.title}</h3>
                    <p className="bdpdf-recommendation-body">{copy.priorityActions[pillar.key][0]}</p>
                    <p className="bdpdf-recommendation-module">
                      {copy.suggestedModuleLabel}: <strong>{copy.moduleLabels[pillar.key]}</strong>
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

              {report.pillars.map((pillar) => (
                <article className={`bdpdf-table-card bdpdf-section color-${PILLAR_COLOR_CLASS[pillar.key]}`} key={pillar.key}>
                  <h3 className="bdpdf-table-title">{pillar.title}</h3>
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
                      {pillar.questions.map((question) => (
                        <tr key={`${pillar.key}-${question.index}`}>
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
