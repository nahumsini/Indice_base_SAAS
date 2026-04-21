import type {
  PayrollLineItem,
  PayrollPreferences,
  PayrollRunDetailResponse,
  PayrollRunLine,
} from '../../../api/humanResources';

import '../../Dashboard/BusinessProfile/BusinessDiagnosisPdf/businessDiagnosisPdf.css';
import './payrollPdf.css';

export type PayrollRunPdfDocumentProps = {
  detail: PayrollRunDetailResponse;
  preferences: PayrollPreferences;
  title: string;
  subtitle: string;
  generatedAt: Date;
  reportId: string;
  locale: string;
  statusLabel: string;
  groupingLabel: string;
  payPeriodLabel: string;
};

const CURRENCY = 'USD';
const LEDGER_PAGE_SIZE = 12;

const formatCurrency = (value: number, locale: string) => new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value);

const formatWholeNumber = (value: number, locale: string) => new Intl.NumberFormat(locale, {
  maximumFractionDigits: 2,
}).format(value);

const formatDate = (value: string, locale: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
};

const formatDateTime = (value: Date, locale: string) => new Intl.DateTimeFormat(locale, {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}).format(value);

const formatShortDateTime = (value: Date, locale: string) => new Intl.DateTimeFormat(locale, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}).format(value);

const chunkArray = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const getManualAdjustments = (line: PayrollRunLine) => (
  line.items.filter((item) => item.source_type === 'manual')
);

const getPrimaryItems = (items: PayrollLineItem[]) => (
  [...items]
    .sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount))
    .slice(0, 4)
);

const buildExecutiveSummary = (detail: PayrollRunDetailResponse, locale: string) => {
  const { run, lines } = detail;
  const highestNetLine = [...lines].sort((left, right) => right.net_amount - left.net_amount)[0];
  const manualAdjustmentsCount = lines.reduce((total, line) => total + getManualAdjustments(line).length, 0);

  return `This payroll run covers ${lines.length} employee${lines.length === 1 ? '' : 's'} from ${formatDate(run.period_start_date, locale)} to ${formatDate(run.period_end_date, locale)}. `
    + `Net payroll closes at ${formatCurrency(run.net_amount, locale)} with ${formatCurrency(run.deductions_amount, locale)} in deductions and `
    + `${formatCurrency(run.employer_contributions_amount, locale)} in employer-side costs. `
    + `${highestNetLine ? `${highestNetLine.employee_name} has the largest net payout in this run. ` : ''}`
    + `${manualAdjustmentsCount > 0 ? `${manualAdjustmentsCount} manual adjustment${manualAdjustmentsCount === 1 ? '' : 's'} were applied across the ledger.` : 'No manual adjustments were applied in this run.'}`;
};

const buildPolicySummary = (preferences: PayrollPreferences) => {
  const leavePolicy = preferences.pay_leave_days ? 'Leave days are payable in this payroll configuration.' : 'Leave days are excluded from pay in this payroll configuration.';

  return `${leavePolicy} Default daily hours are set to ${preferences.default_daily_hours}, `
    + `and the default grouping mode is ${preferences.grouping_mode.replace('_', ' ')}.`;
};

const getTopLines = (lines: PayrollRunLine[]) => (
  [...lines]
    .sort((left, right) => right.net_amount - left.net_amount)
    .slice(0, 6)
);

const getTotals = (detail: PayrollRunDetailResponse) => {
  const totals = detail.lines.reduce((accumulator, line) => ({
    regularHours: accumulator.regularHours + line.regular_hours,
    overtimeHours: accumulator.overtimeHours + line.overtime_hours,
    leaveDays: accumulator.leaveDays + line.leave_days,
    absenceDays: accumulator.absenceDays + line.absence_days,
    lateCount: accumulator.lateCount + line.late_count,
  }), {
    regularHours: 0,
    overtimeHours: 0,
    leaveDays: 0,
    absenceDays: 0,
    lateCount: 0,
  });

  return totals;
};

const formatRate = (value: number) => `${(value * 100).toFixed(2)}%`;

const levelTone = (statusLabel: string) => {
  const normalized = statusLabel.toLowerCase();

  if (normalized.includes('paid') || normalized.includes('pagad')) {
    return 'level-5';
  }
  if (normalized.includes('approved') || normalized.includes('aprobad')) {
    return 'level-4';
  }
  if (normalized.includes('processed') || normalized.includes('procesad')) {
    return 'level-3';
  }
  if (normalized.includes('cancel')) {
    return 'level-1';
  }
  return 'level-2';
};

export function PayrollRunPdfDocument({
  detail,
  preferences,
  title,
  subtitle,
  generatedAt,
  reportId,
  locale,
  statusLabel,
  groupingLabel,
  payPeriodLabel,
}: PayrollRunPdfDocumentProps) {
  const topLines = getTopLines(detail.lines);
  const totals = getTotals(detail);
  const averageNet = detail.run.employees_count > 0 ? detail.run.net_amount / detail.run.employees_count : 0;
  const averageGross = detail.run.employees_count > 0 ? detail.run.gross_amount / detail.run.employees_count : 0;
  const ledgerChunks = chunkArray(detail.lines, LEDGER_PAGE_SIZE);
  const statusTone = levelTone(statusLabel);

  return (
    <div className="bdpdf-report-shell prpdf-report-shell">
      <section className="bdpdf-report-page prpdf-report-page">
        <div className="bdpdf-page-card">
          <div className="bdpdf-hero prpdf-hero">
            <div className="bdpdf-hero-topline">
              <div className="bdpdf-brand-badge">Indice payroll report</div>
              <div className="bdpdf-report-id">{reportId}</div>
            </div>

            <h1 className="bdpdf-hero-title">{title}</h1>
            <p className="bdpdf-hero-subtitle">{subtitle}</p>

            <div className="bdpdf-hero-meta">
              <div className="bdpdf-meta-card">
                <p className="bdpdf-meta-label">Run status</p>
                <p className="bdpdf-meta-value">{statusLabel}</p>
              </div>
              <div className="bdpdf-meta-card">
                <p className="bdpdf-meta-label">Grouping</p>
                <p className="bdpdf-meta-value">{groupingLabel}</p>
              </div>
              <div className="bdpdf-meta-card">
                <p className="bdpdf-meta-label">Generated</p>
                  <p className="bdpdf-meta-value">{formatShortDateTime(generatedAt, locale)}</p>
              </div>
            </div>
          </div>

          <div className="bdpdf-page-content">
            <div className="bdpdf-section">
              <div className="bdpdf-section-heading">
                <h2 className="bdpdf-section-title">Executive summary</h2>
                <p className="bdpdf-section-caption">Current payroll posture and the most important signals in one page</p>
              </div>

              <div className="bdpdf-summary-grid">
                <div className="bdpdf-summary-card">
                  <p className="bdpdf-lead">{buildExecutiveSummary(detail, locale)}</p>
                </div>
                <div className="bdpdf-panel-card">
                  <p className="bdpdf-lead">{buildPolicySummary(preferences)}</p>
                </div>
              </div>

              <div className="bdpdf-highlight-grid">
                <div className="bdpdf-highlight-card bdpdf-highlight-card--accent">
                  <p className="bdpdf-highlight-label">Net payroll</p>
                  <p className="bdpdf-highlight-value">{formatCurrency(detail.run.net_amount, locale)}</p>
                  <p className="bdpdf-highlight-text">Employee take-home total for this run</p>
                </div>
                <div className="bdpdf-highlight-card">
                  <p className="bdpdf-highlight-label">Gross payroll</p>
                  <p className="bdpdf-highlight-value">{formatCurrency(detail.run.gross_amount, locale)}</p>
                  <p className="bdpdf-highlight-text">Before deductions and employer-side costs</p>
                </div>
                <div className="bdpdf-highlight-card">
                  <p className="bdpdf-highlight-label">Employer cost</p>
                  <p className="bdpdf-highlight-value">{formatCurrency(detail.run.employer_contributions_amount, locale)}</p>
                  <p className="bdpdf-highlight-text">Company-funded statutory contributions</p>
                </div>
                <div className="bdpdf-highlight-card">
                  <p className="bdpdf-highlight-label">Average net</p>
                  <p className="bdpdf-highlight-value">{formatCurrency(averageNet, locale)}</p>
                  <p className="bdpdf-highlight-text">Per employee across {detail.run.employees_count} payroll lines</p>
                </div>
              </div>
            </div>

            <div className="bdpdf-section">
              <div className="bdpdf-section-heading">
                <h2 className="bdpdf-section-title">Run signals</h2>
                <p className="bdpdf-section-caption">Hours, attendance drag, and fiscal settings driving this payroll</p>
              </div>

              <div className="prpdf-signal-grid">
                <article className="prpdf-signal-card">
                  <div className="prpdf-signal-head">
                    <h3 className="prpdf-signal-title">Workload mix</h3>
                    <span className={`bdpdf-score-chip ${statusTone}`}>{payPeriodLabel}</span>
                  </div>
                  <div className="prpdf-signal-kpis">
                    <div>
                      <p className="prpdf-signal-value">{formatWholeNumber(totals.regularHours, locale)}</p>
                      <p className="prpdf-signal-label">Regular hours</p>
                    </div>
                    <div>
                      <p className="prpdf-signal-value">{formatWholeNumber(totals.overtimeHours, locale)}</p>
                      <p className="prpdf-signal-label">Overtime hours</p>
                    </div>
                  </div>
                </article>

                <article className="prpdf-signal-card">
                  <div className="prpdf-signal-head">
                    <h3 className="prpdf-signal-title">Attendance impact</h3>
                    <span className="bdpdf-score-chip level-3">Attendance</span>
                  </div>
                  <div className="prpdf-signal-kpis">
                    <div>
                      <p className="prpdf-signal-value">{formatWholeNumber(totals.leaveDays, locale)}</p>
                      <p className="prpdf-signal-label">Leave days</p>
                    </div>
                    <div>
                      <p className="prpdf-signal-value">{formatWholeNumber(totals.absenceDays, locale)}</p>
                      <p className="prpdf-signal-label">Absence days</p>
                    </div>
                    <div>
                      <p className="prpdf-signal-value">{formatWholeNumber(totals.lateCount, locale)}</p>
                      <p className="prpdf-signal-label">Late events</p>
                    </div>
                  </div>
                </article>

                <article className="prpdf-signal-card">
                  <div className="prpdf-signal-head">
                    <h3 className="prpdf-signal-title">Fiscal configuration</h3>
                    <span className="bdpdf-score-chip level-4">{preferences.pay_leave_days ? 'Leave paid' : 'Leave unpaid'}</span>
                  </div>
                  <ul className="bdpdf-info-list">
                    <li><span className="bdpdf-bullet">•</span> Default daily hours: {formatWholeNumber(preferences.default_daily_hours, locale)}</li>
                    <li><span className="bdpdf-bullet">•</span> ISR rate: {formatRate(preferences.isr_rate)}</li>
                    <li><span className="bdpdf-bullet">•</span> Employee burden: {formatRate(preferences.imss_employee_rate + preferences.infonavit_employee_rate)}</li>
                    <li><span className="bdpdf-bullet">•</span> Employer burden: {formatRate(preferences.imss_employer_rate + preferences.infonavit_employer_rate + preferences.sar_employer_rate)}</li>
                  </ul>
                </article>
              </div>
            </div>

            <div className="bdpdf-section">
              <div className="bdpdf-section-heading">
                <h2 className="bdpdf-section-title">Top payouts</h2>
                <p className="bdpdf-section-caption">Highest net payouts in the current run with the strongest compensation signals</p>
              </div>

              <div className="prpdf-employee-grid">
                {topLines.map((line) => (
                  <article className="prpdf-employee-card" key={line.id}>
                    <div className="prpdf-employee-head">
                      <div>
                        <h3 className="prpdf-employee-title">{line.employee_name}</h3>
                        <p className="prpdf-employee-subtitle">
                          {[line.position_title, line.department, line.unit_name].filter(Boolean).join(' · ') || 'Active payroll line'}
                        </p>
                      </div>
                      <div className="prpdf-employee-chip">{formatCurrency(line.net_amount, locale)}</div>
                    </div>

                    <div className="prpdf-employee-metrics">
                      <div>
                        <p className="prpdf-mini-label">Gross</p>
                        <p className="prpdf-mini-value">{formatCurrency(line.gross_amount, locale)}</p>
                      </div>
                      <div>
                        <p className="prpdf-mini-label">Deductions</p>
                        <p className="prpdf-mini-value">{formatCurrency(line.deductions_amount, locale)}</p>
                      </div>
                      <div>
                        <p className="prpdf-mini-label">Employer</p>
                        <p className="prpdf-mini-value">{formatCurrency(line.employer_contributions_amount, locale)}</p>
                      </div>
                    </div>

                    <div className="prpdf-item-stack">
                      {getPrimaryItems(line.items).map((item) => (
                        <div className="prpdf-item-row" key={item.id}>
                          <span>{item.label}</span>
                          <strong>{formatCurrency(item.amount, locale)}</strong>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="bdpdf-footer-note">
              <span>Run period: {formatDate(detail.run.period_start_date, locale)} to {formatDate(detail.run.period_end_date, locale)}</span>
              <span>Average gross per employee: {formatCurrency(averageGross, locale)}</span>
            </div>
          </div>
        </div>
      </section>

      {ledgerChunks.map((chunk, chunkIndex) => (
        <section className="bdpdf-report-page prpdf-report-page" key={`ledger-${chunkIndex}`}>
          <div className="bdpdf-page-card">
            <div className="bdpdf-page-content">
              <div className="bdpdf-section">
                <div className="bdpdf-section-heading">
                  <h2 className="bdpdf-section-title">Employee ledger</h2>
                  <p className="bdpdf-section-caption">
                    Page {chunkIndex + 1} of {ledgerChunks.length} · Payroll period {formatDate(detail.run.period_start_date, locale)} to {formatDate(detail.run.period_end_date, locale)}
                  </p>
                </div>

                <article className="bdpdf-table-card">
                  <h3 className="bdpdf-table-title">Payroll line breakdown</h3>
                  <table className="bdpdf-table prpdf-ledger-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Scope</th>
                        <th>Payable</th>
                        <th>Gross</th>
                        <th>Deductions</th>
                        <th>Employer</th>
                        <th>Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chunk.map((line) => (
                        <tr key={line.id}>
                          <td>
                            <div className="prpdf-cell-title">{line.employee_name}</div>
                            <div className="prpdf-cell-subtitle">{line.position_title || 'Role not set'}</div>
                          </td>
                          <td>
                            <div className="prpdf-cell-title">{line.unit_name || line.business_name || 'Single payroll'}</div>
                            <div className="prpdf-cell-subtitle">{line.department || 'No department'}</div>
                          </td>
                          <td>
                            <div className="prpdf-cell-title">{formatWholeNumber(line.days_payable, locale)} days</div>
                            <div className="prpdf-cell-subtitle">{formatWholeNumber(line.regular_hours, locale)} regular · {formatWholeNumber(line.overtime_hours, locale)} OT</div>
                          </td>
                          <td>{formatCurrency(line.gross_amount, locale)}</td>
                          <td>{formatCurrency(line.deductions_amount, locale)}</td>
                          <td>{formatCurrency(line.employer_contributions_amount, locale)}</td>
                          <td>
                            <div className="prpdf-cell-title">{formatCurrency(line.net_amount, locale)}</div>
                            <div className="prpdf-cell-subtitle">{line.include_in_fiscal ? 'Fiscal included' : 'Fiscal excluded'}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              </div>

              <div className="bdpdf-section">
                <div className="bdpdf-section-heading">
                  <h2 className="bdpdf-section-title">Adjustments and notes</h2>
                  <p className="bdpdf-section-caption">Manual edits and narrative notes that changed the final payout</p>
                </div>

                <div className="prpdf-adjustment-grid">
                  {chunk.map((line) => {
                    const manualAdjustments = getManualAdjustments(line);

                    return (
                      <article className="prpdf-adjustment-card" key={`adjustment-${line.id}`}>
                        <div className="prpdf-adjustment-head">
                          <h3 className="prpdf-adjustment-title">{line.employee_name}</h3>
                          <span className={`bdpdf-score-chip ${manualAdjustments.length > 0 ? 'level-4' : 'level-2'}`}>
                            {manualAdjustments.length > 0 ? `${manualAdjustments.length} manual` : 'No manual edits'}
                          </span>
                        </div>

                        {line.notes ? (
                          <p className="prpdf-adjustment-note">{line.notes}</p>
                        ) : (
                          <p className="prpdf-adjustment-note prpdf-adjustment-note--muted">No payroll note was added for this employee.</p>
                        )}

                        {manualAdjustments.length > 0 ? (
                          <div className="prpdf-item-stack">
                            {manualAdjustments.map((item) => (
                              <div className="prpdf-item-row" key={item.id}>
                                <span>{item.label}</span>
                                <strong>{formatCurrency(item.amount, locale)}</strong>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <ul className="bdpdf-info-list">
                            <li><span className="bdpdf-bullet">•</span>No manual earnings or deductions were added.</li>
                            <li><span className="bdpdf-bullet">•</span>Final line amount is driven entirely by computed payroll logic.</li>
                          </ul>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="bdpdf-footer-note">
                <span>Run #{detail.run.id} · {groupingLabel}</span>
                <span>Printed on {formatDateTime(generatedAt, locale)}</span>
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
