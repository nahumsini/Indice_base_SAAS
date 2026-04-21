import type { PersonalPerformanceSectionKey } from '../../../../api/HomePanel/PersonalPerformance/personalPerformance';
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
  userLabel?: string | null;
};

const SECTION_FOCUS: Record<PersonalPerformanceSectionKey, string> = {
  sleep_recovery: 'Sleep routine and recovery',
  nutrition_energy: 'Nutrition, hydration, and movement',
  stress_clarity: 'Overload reduction and clarity',
  balance_sustainability: 'Boundaries and sustainability',
};

const SECTION_COLOR_CLASS: Record<PersonalPerformanceSectionKey, string> = {
  sleep_recovery: 'people',
  nutrition_energy: 'finance',
  stress_clarity: 'products',
  balance_sustainability: 'processes',
};

const SECTION_PRIORITY_ACTIONS: Record<PersonalPerformanceSectionKey, string[]> = {
  sleep_recovery: [
    'Improve your shutdown routine and reduce late-night work.',
    'Protect recovery by planning lower intensity blocks after demanding days.',
  ],
  nutrition_energy: [
    'Stabilize meals and hydration to reduce energy volatility during work.',
    'Add short movement breaks to improve energy and execution consistency.',
  ],
  stress_clarity: [
    'Reduce overload by batching work and delegating recurring operational tasks.',
    'Create an end-of-day shutdown routine to stop carrying work mentally.',
  ],
  balance_sustainability: [
    'Create protected time blocks for personal life and real recovery.',
    'Reduce dependency on constant presence by building repeatable systems and ownership.',
  ],
};

const formatReportDate = (value: Date) => new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(value);

const getUserLabel = (userLabel?: string | null) => (
  userLabel && userLabel.trim().length > 0 ? userLabel.trim() : 'Current user'
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

const getExecutiveSummary = (report: PersonalPerformanceScoreReport) => {
  const sortedSections = sortSectionsByScore(report);
  const strongestSection = sortedSections[0];
  const weakestSection = sortedSections[sortedSections.length - 1];
  const levelName = report.overall.level.name;

  return `This person currently sits at ${levelName} with a Personal Performance Index of ${report.overall.averageScore}/100. `
    + `${strongestSection.title} is the strongest area today, while ${weakestSection.title} needs the earliest intervention. `
    + 'The next move is to reinforce routines that protect energy, clarity, and sustainability at work.';
};

const getOverallInterpretation = (report: PersonalPerformanceScoreReport) => {
  const score = report.overall.averageScore;

  if (score <= 40) {
    return 'Current habits are strongly hurting performance. Energy and clarity are likely inconsistent, and burnout risk is high unless routines change quickly.';
  }

  if (score <= 60) {
    return 'There are important weaknesses affecting consistency. The person can operate, but execution quality fluctuates and stress recovery is not reliable yet.';
  }

  if (score <= 75) {
    return 'The person is operating at an acceptable level, but improvement opportunities exist. Tightening a few routines can quickly improve clarity and consistency.';
  }

  if (score <= 90) {
    return 'Good habits are supporting work performance. The priority is maintaining stability while improving recovery and protecting focus under pressure.';
  }

  return 'Strong personal condition is supporting sustainable execution. The focus is keeping standards consistent while responsibilities grow.';
};

const getSectionInterpretation = (section: PerformanceSectionScore) => {
  if (section.averageScore <= 40) {
    return `${section.title} is in a critical state. This area is likely creating daily friction and reducing performance reliability.`;
  }

  if (section.averageScore <= 60) {
    return `${section.title} is unstable. Weak routines here may be harming consistency and decision quality.`;
  }

  if (section.averageScore <= 75) {
    return `${section.title} is functional, with clear improvement opportunities. Small routine upgrades can increase consistency.`;
  }

  if (section.averageScore <= 90) {
    return `${section.title} is healthy. Habits are supporting performance, but under pressure this area still needs protection.`;
  }

  return `${section.title} is high performance. The opportunity is sustaining this standard while responsibilities grow.`;
};

const getOpportunityNarrative = (section: PerformanceSectionScore) => {
  const lowestQuestion = getLowestQuestion(section);

  if (!lowestQuestion) {
    return 'This section still needs a completed answer set before a more precise opportunity statement can be generated.';
  }

  return `The most immediate opportunity is "${lowestQuestion.question}". The selected answer was "${lowestQuestion.selectedOptionLabel ?? 'Pending'}", which highlights the first routine to improve.`;
};

const getPrioritySections = (report: PersonalPerformanceScoreReport) => (
  [...report.sections]
    .sort((left, right) => left.averageScore - right.averageScore)
    .slice(0, 3)
);

const getActionPlan = (report: PersonalPerformanceScoreReport) => {
  const prioritySections = getPrioritySections(report);

  return {
    immediate: [
      `Review the three weakest areas: ${prioritySections.map((section) => section.title).join(', ')}.`,
      'Choose one routine upgrade per area and set a weekly check-in to track consistency.',
      'Save the assessment as a baseline and compare progress after the next cycle.',
    ],
    thirtyDays: prioritySections.flatMap((section) => SECTION_PRIORITY_ACTIONS[section.key].slice(0, 1)),
    sixtyDays: prioritySections.flatMap((section) => SECTION_PRIORITY_ACTIONS[section.key].slice(1, 2)),
  };
};

export function PersonalPerformancePdfDocument({
  report,
  title,
  subtitle,
  generatedAt,
  reportId,
  userLabel,
}: PersonalPerformancePdfDocumentProps) {
  const sortedSections = sortSectionsByScore(report);
  const strongestSection = sortedSections[0];
  const prioritySection = [...sortedSections].reverse()[0];
  const actionPlan = getActionPlan(report);

  return (
    <div className="bdpdf-report-shell">
      <section className="bdpdf-report-page">
        <div className="bdpdf-page-card">
          <div className="bdpdf-hero">
            <div className="bdpdf-hero-topline">
              <div className="bdpdf-brand-badge">Indice performance report</div>
              <div className="bdpdf-report-id">{reportId}</div>
            </div>

            <h1 className="bdpdf-hero-title">{title}</h1>
            <p className="bdpdf-hero-subtitle">{subtitle}</p>

            <div className="bdpdf-hero-meta">
              <div className="bdpdf-meta-card">
                <p className="bdpdf-meta-label">User</p>
                <p className="bdpdf-meta-value">{getUserLabel(userLabel)}</p>
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
                <p className="bdpdf-section-caption">A compact view of current performance and where to act first</p>
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
                  <p className="bdpdf-highlight-label">Personal Performance Index</p>
                  <p className="bdpdf-highlight-value">{report.overall.averageScore}</p>
                  <p className="bdpdf-highlight-text">out of 100</p>
                </div>
                <div className="bdpdf-highlight-card">
                  <p className="bdpdf-highlight-label">Performance level</p>
                  <p className="bdpdf-highlight-value">L{report.overall.level.level}</p>
                  <p className="bdpdf-highlight-text">{report.overall.level.name}</p>
                </div>
                <div className="bdpdf-highlight-card">
                  <p className="bdpdf-highlight-label">Strongest area</p>
                  <p className="bdpdf-highlight-value">{strongestSection.averageScore}</p>
                  <p className="bdpdf-highlight-text">{strongestSection.title}</p>
                </div>
                <div className="bdpdf-highlight-card">
                  <p className="bdpdf-highlight-label">Priority area</p>
                  <p className="bdpdf-highlight-value">{prioritySection.averageScore}</p>
                  <p className="bdpdf-highlight-text">{prioritySection.title}</p>
                </div>
              </div>
            </div>

            <div className="bdpdf-section">
              <div className="bdpdf-section-heading">
                <h2 className="bdpdf-section-title">Section overview</h2>
                <p className="bdpdf-section-caption">Score, level, completion, and next focus area</p>
              </div>

              <div className="bdpdf-pillars-grid">
                {report.sections.map((section) => (
                  <article className="bdpdf-pillar-card" key={section.key}>
                    <div className="bdpdf-pillar-header">
                      <div>
                        <h3 className="bdpdf-pillar-title">{section.title}</h3>
                        <p className="bdpdf-pillar-subtitle">{section.answeredCount}/{section.totalQuestions} answered</p>
                      </div>
                      <span className={`bdpdf-score-chip level-${section.level.level}`}>
                        {section.level.name}
                      </span>
                    </div>

                    <div className="bdpdf-pillar-score-row">
                      <p className="bdpdf-pillar-score">
                        {section.averageScore}
                        <span>/100</span>
                      </p>
                      <p className="bdpdf-section-caption">{SECTION_FOCUS[section.key]}</p>
                    </div>

                    <div className="bdpdf-progress-bar">
                      <div
                        className={`bdpdf-progress-value ${SECTION_COLOR_CLASS[section.key]}`}
                        style={{ width: `${section.averageScore}%` }}
                      />
                    </div>

                    <ul className="bdpdf-info-list">
                      <li>
                        <span className="bdpdf-bullet">•</span>
                        <span>{getSectionInterpretation(section)}</span>
                      </li>
                      <li>
                        <span className="bdpdf-bullet">•</span>
                        <span>{getOpportunityNarrative(section)}</span>
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
                <p className="bdpdf-section-caption">Where habits are strong and where to improve first</p>
              </div>

              <div className="bdpdf-analysis-grid">
                {report.sections.map((section) => (
                  <article className="bdpdf-analysis-card" key={section.key}>
                    <div className="bdpdf-analysis-card-head">
                      <h3 className="bdpdf-analysis-title">{section.title}</h3>
                      <span className={`bdpdf-score-chip level-${section.level.level}`}>
                        {section.averageScore}/100
                      </span>
                    </div>
                    <div className="bdpdf-analysis-card-body">
                      <p className="bdpdf-analysis-copy">{getSectionInterpretation(section)}</p>
                      <ul className="bdpdf-info-list">
                        <li>
                          <span className="bdpdf-bullet">•</span>
                          <span>{getOpportunityNarrative(section)}</span>
                        </li>
                      </ul>
                      <ul className="bdpdf-info-list">
                        {SECTION_PRIORITY_ACTIONS[section.key].map((actionItem) => (
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
                <p className="bdpdf-section-caption">Priority actions connected directly to sustainable execution</p>
              </div>

              <div className="bdpdf-recommendation-grid">
                {getPrioritySections(report).map((section, index) => (
                  <article className="bdpdf-recommendation-card" key={section.key}>
                    <div className="bdpdf-recommendation-rank">Priority {index + 1}</div>
                    <h3 className="bdpdf-recommendation-title">{section.title}</h3>
                    <p className="bdpdf-recommendation-body">{getOpportunityNarrative(section)}</p>
                    <p className="bdpdf-recommendation-module">
                      Suggested focus: <strong>{SECTION_FOCUS[section.key]}</strong>
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="bdpdf-section">
              <div className="bdpdf-section-heading">
                <h2 className="bdpdf-section-title">Action plan</h2>
                <p className="bdpdf-section-caption">A practical 60-day sequence to move from assessment into routines</p>
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
                    <li>This assessment provides a measurable baseline for future check-ins.</li>
                    <li>The biggest gains come from lifting the weakest areas without losing momentum in the strongest one.</li>
                    <li>Indice can support the routine changes when focus areas are translated into planning, delegation, and protected recovery.</li>
                  </ul>
                </article>
              </div>

              <div className="bdpdf-footer-note">
                <span>Indice · Personal performance report</span>
                <span>Generated automatically from Personal Performance answers</span>
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

              {report.sections.map((section) => (
                <article className="bdpdf-table-card bdpdf-section" key={section.key}>
                  <h3 className="bdpdf-table-title">{section.title}</h3>
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
                      {section.questions.map((question) => (
                        <tr key={`${section.key}-${question.index}`}>
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

