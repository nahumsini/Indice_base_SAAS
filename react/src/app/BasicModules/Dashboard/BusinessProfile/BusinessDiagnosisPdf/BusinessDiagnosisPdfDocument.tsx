import type { BusinessProfileSectionKey } from '../../../../api/HomePanel/BusinessProfile/businessProfile';
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
  companyName?: string | null;
};

const PILLAR_MODULES: Record<BusinessProfileSectionKey, string> = {
  people: 'Human Resources',
  processes: 'Processes and tasks',
  products: 'CRM / Point of Sale',
  finance: 'Expenses and KPIs',
};

const PILLAR_COLOR_CLASS: Record<BusinessProfileSectionKey, string> = {
  people: 'people',
  processes: 'processes',
  products: 'products',
  finance: 'finance',
};

const PILLAR_PRIORITY_ACTIONS: Record<BusinessProfileSectionKey, string[]> = {
  people: [
    'Clarify responsibilities, delegation rules, and weekly accountability.',
    'Reduce founder dependency with documented ownership and follow-up.',
  ],
  processes: [
    'Document the most repeated workflows and assign a clear owner to each flow.',
    'Track execution visibly so tasks stop depending on memory and manual chasing.',
  ],
  products: [
    'Sharpen the offer, pricing logic, and the way channel performance is reviewed.',
    'Give the team a clearer commercial story so sales and delivery stay aligned.',
  ],
  finance: [
    'Increase visibility on cash, margins, and recurring financial review routines.',
    'Move decisions from intuition toward structured numbers and forward-looking control.',
  ],
};

const formatReportDate = (value: Date) => new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(value);

const getCompanyLabel = (companyName?: string | null) => (
  companyName && companyName.trim().length > 0 ? companyName.trim() : 'Current business'
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

const getExecutiveSummary = (report: BusinessDiagnosisScoreReport) => {
  const sortedPillars = sortPillarsByScore(report);
  const strongestPillar = sortedPillars[0];
  const weakestPillar = sortedPillars[sortedPillars.length - 1];
  const maturityName = report.overall.maturity.name;

  return `This business currently sits at ${maturityName} with a Business Maturity Index of ${report.overall.averageScore}/100. `
    + `${strongestPillar.title} is the strongest pillar today, while ${weakestPillar.title} needs the earliest intervention. `
    + 'The next move is to turn current effort into repeatable routines, clearer ownership, and better decision visibility.';
};

const getOverallInterpretation = (report: BusinessDiagnosisScoreReport) => {
  const score = report.overall.averageScore;

  if (score <= 40) {
    return 'The operating model is still highly reactive. There is significant exposure to founder dependency, low process visibility, and weak decision discipline.';
  }

  if (score <= 60) {
    return 'The company has a working base, but still relies on manual follow-up and reactive control. Formal structure is present in parts, not across the whole business.';
  }

  if (score <= 75) {
    return 'The business is becoming organized and more predictable, but a few weak spots can still slow scale or reduce visibility if they are not tightened now.';
  }

  if (score <= 90) {
    return 'The business is operating with strong structure and is close to being fully scalable. The focus now is on consistency, monitoring, and leverage across teams.';
  }

  return 'The business shows a highly mature operating model with strong structure, visibility, and discipline. The priority is sustaining standards while scaling further.';
};

const getPillarInterpretation = (pillar: DiagnosisPillarScore) => {
  if (pillar.averageScore <= 40) {
    return `${pillar.title} is operating in a reactive mode. The section still depends too much on improvisation, which creates friction and weak repeatability.`;
  }

  if (pillar.averageScore <= 60) {
    return `${pillar.title} has basic structure in place, but it still leans on manual follow-up and inconsistent discipline. The operation works, but not smoothly enough yet.`;
  }

  if (pillar.averageScore <= 75) {
    return `${pillar.title} shows a healthy level of organization. The next step is to make that structure more consistent and measurable so it scales with less effort.`;
  }

  if (pillar.averageScore <= 90) {
    return `${pillar.title} is strong and close to scalable maturity. The focus should be on keeping visibility high and making execution more systematic.`;
  }

  return `${pillar.title} performs at a very mature level. The opportunity is no longer basic control, but sustaining excellence while the business grows.`;
};

const getOpportunityNarrative = (pillar: DiagnosisPillarScore) => {
  const lowestQuestion = getLowestQuestion(pillar);

  if (!lowestQuestion) {
    return 'This pillar still needs a completed answer set before a more precise opportunity statement can be generated.';
  }

  return `The most immediate opportunity is "${lowestQuestion.question}". The selected answer was "${lowestQuestion.selectedOptionLabel ?? 'Pending'}", which shows where operational discipline can improve first.`;
};

const getPriorityPillars = (report: BusinessDiagnosisScoreReport) => (
  [...report.pillars]
    .sort((left, right) => left.averageScore - right.averageScore)
    .slice(0, 3)
);

const getActionPlan = (report: BusinessDiagnosisScoreReport) => {
  const priorityPillars = getPriorityPillars(report);

  return {
    immediate: [
      `Review the three weakest pillars: ${priorityPillars.map((pillar) => pillar.title).join(', ')}.`,
      'Confirm owners for each improvement area and start a weekly execution review.',
      'Save the diagnosis as a baseline and compare progress after the next operating cycle.',
    ],
    thirtyDays: priorityPillars.flatMap((pillar) => PILLAR_PRIORITY_ACTIONS[pillar.key].slice(0, 1)),
    sixtyDays: priorityPillars.flatMap((pillar) => PILLAR_PRIORITY_ACTIONS[pillar.key].slice(1, 2)),
  };
};

export function BusinessDiagnosisPdfDocument({
  report,
  title,
  subtitle,
  generatedAt,
  reportId,
  companyName,
}: BusinessDiagnosisPdfDocumentProps) {
  const sortedPillars = sortPillarsByScore(report);
  const strongestPillar = sortedPillars[0];
  const priorityPillar = [...sortedPillars].reverse()[0];
  const actionPlan = getActionPlan(report);

  return (
    <div className="bdpdf-report-shell">
      <section className="bdpdf-report-page">
        <div className="bdpdf-page-card">
          <div className="bdpdf-hero">
            <div className="bdpdf-hero-topline">
              <div className="bdpdf-brand-badge">Indice diagnosis report</div>
              <div className="bdpdf-report-id">{reportId}</div>
            </div>

            <h1 className="bdpdf-hero-title">{title}</h1>
            <p className="bdpdf-hero-subtitle">{subtitle}</p>

            <div className="bdpdf-hero-meta">
              <div className="bdpdf-meta-card">
                <p className="bdpdf-meta-label">Company</p>
                <p className="bdpdf-meta-value">{getCompanyLabel(companyName)}</p>
              </div>
              <div className="bdpdf-meta-card">
                <p className="bdpdf-meta-label">Generated</p>
                <p className="bdpdf-meta-value">{formatReportDate(generatedAt)}</p>
              </div>
              <div className="bdpdf-meta-card">
                <p className="bdpdf-meta-label">Answered</p>
                <p className="bdpdf-meta-value">{report.overall.answeredCount}/{report.overall.totalQuestions} questions</p>
              </div>
            </div>
          </div>

          <div className="bdpdf-page-content">
            <div className="bdpdf-section">
              <div className="bdpdf-section-heading">
                <h2 className="bdpdf-section-title">Executive summary</h2>
                <p className="bdpdf-section-caption">A compact view of current maturity and where to act first</p>
              </div>

              <div className="bdpdf-summary-grid">
                <div className="bdpdf-summary-card">
                  <p className="bdpdf-lead">{getExecutiveSummary(report)}</p>
                </div>
                <div className="bdpdf-panel-card">
                  <p className="bdpdf-lead">{getOverallInterpretation(report)}</p>
                </div>
              </div>

              <div className="bdpdf-highlight-grid">
                <div className="bdpdf-highlight-card bdpdf-highlight-card--accent">
                  <p className="bdpdf-highlight-label">Business Maturity Index</p>
                  <p className="bdpdf-highlight-value">{report.overall.averageScore}</p>
                  <p className="bdpdf-highlight-text">out of 100</p>
                </div>
                <div className="bdpdf-highlight-card">
                  <p className="bdpdf-highlight-label">Maturity level</p>
                  <p className="bdpdf-highlight-value">L{report.overall.maturity.level}</p>
                  <p className="bdpdf-highlight-text">{report.overall.maturity.name}</p>
                </div>
                <div className="bdpdf-highlight-card">
                  <p className="bdpdf-highlight-label">Strongest pillar</p>
                  <p className="bdpdf-highlight-value">{strongestPillar.averageScore}</p>
                  <p className="bdpdf-highlight-text">{strongestPillar.title}</p>
                </div>
                <div className="bdpdf-highlight-card">
                  <p className="bdpdf-highlight-label">Priority pillar</p>
                  <p className="bdpdf-highlight-value">{priorityPillar.averageScore}</p>
                  <p className="bdpdf-highlight-text">{priorityPillar.title}</p>
                </div>
              </div>
            </div>

            <div className="bdpdf-section">
              <div className="bdpdf-section-heading">
                <h2 className="bdpdf-section-title">Pillar overview</h2>
                <p className="bdpdf-section-caption">Score, maturity, completion, and next module to activate</p>
              </div>

              <div className="bdpdf-pillars-grid">
                {report.pillars.map((pillar) => (
                  <article className="bdpdf-pillar-card" key={pillar.key}>
                    <div className="bdpdf-pillar-header">
                      <div>
                        <h3 className="bdpdf-pillar-title">{pillar.title}</h3>
                        <p className="bdpdf-pillar-subtitle">{pillar.answeredCount}/{pillar.totalQuestions} answered</p>
                      </div>
                      <span className={`bdpdf-score-chip level-${pillar.maturity.level}`}>
                        {pillar.maturity.name}
                      </span>
                    </div>

                    <div className="bdpdf-pillar-score-row">
                      <p className="bdpdf-pillar-score">
                        {pillar.averageScore}
                        <span>/100</span>
                      </p>
                      <p className="bdpdf-section-caption">{PILLAR_MODULES[pillar.key]}</p>
                    </div>

                    <div className="bdpdf-progress-bar">
                      <div
                        className={`bdpdf-progress-value ${PILLAR_COLOR_CLASS[pillar.key]}`}
                        style={{ width: `${pillar.averageScore}%` }}
                      />
                    </div>

                    <ul className="bdpdf-info-list">
                      <li>
                        <span className="bdpdf-bullet">•</span>
                        <span>{getPillarInterpretation(pillar)}</span>
                      </li>
                      <li>
                        <span className="bdpdf-bullet">•</span>
                        <span>{getOpportunityNarrative(pillar)}</span>
                      </li>
                    </ul>
                  </article>
                ))}
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
                <h2 className="bdpdf-section-title">Detailed analysis</h2>
                <p className="bdpdf-section-caption">Where the business is performing well and where it should improve first</p>
              </div>

              <div className="bdpdf-analysis-grid">
                {report.pillars.map((pillar) => (
                  <article className="bdpdf-analysis-card" key={pillar.key}>
                    <div className="bdpdf-analysis-card-head">
                      <h3 className="bdpdf-analysis-title">{pillar.title}</h3>
                      <span className={`bdpdf-score-chip level-${pillar.maturity.level}`}>
                        {pillar.averageScore}/100
                      </span>
                    </div>
                    <div className="bdpdf-analysis-card-body">
                      <p className="bdpdf-analysis-copy">{getPillarInterpretation(pillar)}</p>
                      <ul className="bdpdf-info-list">
                        {PILLAR_PRIORITY_ACTIONS[pillar.key].map((actionItem) => (
                          <li key={actionItem}>
                            <span className="bdpdf-bullet">•</span>
                            <span>{actionItem}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="bdpdf-section">
              <div className="bdpdf-section-heading">
                <h2 className="bdpdf-section-title">Strategic recommendations</h2>
                <p className="bdpdf-section-caption">Priority actions connected directly to the ERP modules that can help</p>
              </div>

              <div className="bdpdf-recommendation-grid">
                {getPriorityPillars(report).map((pillar, index) => (
                  <article className="bdpdf-recommendation-card" key={pillar.key}>
                    <div className="bdpdf-recommendation-rank">Priority {index + 1}</div>
                    <h3 className="bdpdf-recommendation-title">{pillar.title}</h3>
                    <p className="bdpdf-recommendation-body">{getOpportunityNarrative(pillar)}</p>
                    <p className="bdpdf-recommendation-module">
                      Suggested module: <strong>{PILLAR_MODULES[pillar.key]}</strong>
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="bdpdf-section">
              <div className="bdpdf-section-heading">
                <h2 className="bdpdf-section-title">Action plan</h2>
                <p className="bdpdf-section-caption">A practical 60-day sequence to move from diagnosis into execution</p>
              </div>

              <div className="bdpdf-plan-grid">
                <article className="bdpdf-plan-card">
                  <h4>Immediate next steps</h4>
                  <ul>
                    {actionPlan.immediate.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>

                <article className="bdpdf-plan-card">
                  <h4>Next 30 days</h4>
                  <ul>
                    {actionPlan.thirtyDays.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>

                <article className="bdpdf-plan-card">
                  <h4>Days 30 to 60</h4>
                  <ul>
                    {actionPlan.sixtyDays.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>

                <article className="bdpdf-plan-card">
                  <h4>Conclusion</h4>
                  <ul>
                    <li>The diagnosis already gives a measurable baseline for future operating reviews.</li>
                    <li>The biggest gains will come from lifting the weakest pillars without losing momentum in the strongest one.</li>
                    <li>Indice can turn this diagnosis into action when the recommended modules are activated with clear ownership.</li>
                  </ul>
                </article>
              </div>

              <div className="bdpdf-footer-note">
                <span>Indice · Business diagnosis report</span>
                <span>Generated automatically from Business Profile answers</span>
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
                <h2 className="bdpdf-section-title">Response appendix</h2>
                <p className="bdpdf-section-caption">Detailed answer list with the selected response and converted points</p>
              </div>

              {report.pillars.map((pillar) => (
                <article className="bdpdf-table-card bdpdf-section" key={pillar.key}>
                  <h3 className="bdpdf-table-title">{pillar.title}</h3>
                  <table className="bdpdf-table">
                    <thead>
                      <tr>
                        <th style={{ width: '7%' }}>#</th>
                        <th style={{ width: '43%' }}>Question</th>
                        <th style={{ width: '34%' }}>Selected answer</th>
                        <th style={{ width: '16%' }}>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pillar.questions.map((question) => (
                        <tr key={`${pillar.key}-${question.index}`}>
                          <td className="bdpdf-question-number">{question.index}</td>
                          <td>{question.question}</td>
                          <td>{question.selectedOptionLabel ?? <span className="bdpdf-muted">Pending</span>}</td>
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
