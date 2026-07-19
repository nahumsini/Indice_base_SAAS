import type {
  PayrollLineItem,
  PayrollPreferences,
  PayrollRunDetailResponse,
  PayrollRunLine,
} from '../../../api/humanResources';
import type { PayrollTranslations } from './translations';

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
  copy: PayrollTranslations['pdf'];
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

const buildExecutiveSummary = (
  detail: PayrollRunDetailResponse,
  locale: string,
  copy: PayrollTranslations['pdf'],
) => {
  const { run, lines } = detail;
  const period = `${formatDate(run.period_start_date, locale)} - ${formatDate(run.period_end_date, locale)}`;
  return copy.executiveSummaryText(period, lines.length, formatCurrency(run.net_amount, locale), run.status);
};

const buildPolicySummary = (preferences: PayrollPreferences, copy: PayrollTranslations['pdf']) => (
  copy.policySummary(
    preferences.grouping_mode.replace('_', ' '),
    preferences.default_daily_hours,
    preferences.pay_leave_days ? copy.leavePaid : copy.leaveUnpaid,
  )
);

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
  copy,
}: PayrollRunPdfDocumentProps) {
  const topLines = getTopLines(detail.lines);
  const totals = getTotals(detail);
  const averageNet = detail.run.users_count > 0 ? detail.run.net_amount / detail.run.users_count : 0;
  const averageGross = detail.run.users_count > 0 ? detail.run.gross_amount / detail.run.users_count : 0;
  const ledgerChunks = chunkArray(detail.lines, LEDGER_PAGE_SIZE);
  const statusTone = levelTone(statusLabel);
  const totalPages = 1 + ledgerChunks.length;
  const footerTimestamp = formatShortDateTime(generatedAt, locale);

  return (
    <div className="bdpdf-report-shell prpdf-report-shell">
      <section className="bdpdf-report-page prpdf-report-page">
        <div className="bdpdf-page-card">
          <div className="bdpdf-hero prpdf-hero">
            <div className="bdpdf-hero-topline">
              <div className="bdpdf-brand-badge">{copy.brandBadge}</div>
              <div className="bdpdf-report-id">{reportId}</div>
            </div>

            <h1 className="bdpdf-hero-title">{title}</h1>
            <p className="bdpdf-hero-subtitle">{subtitle}</p>

            <div className="bdpdf-hero-meta">
              <div className="bdpdf-meta-card">
                <p className="bdpdf-meta-label">{copy.runStatus}</p>
                <p className="bdpdf-meta-value">{statusLabel}</p>
              </div>
              <div className="bdpdf-meta-card">
                <p className="bdpdf-meta-label">{copy.grouping}</p>
                <p className="bdpdf-meta-value">{groupingLabel}</p>
              </div>
              <div className="bdpdf-meta-card">
                <p className="bdpdf-meta-label">{copy.generated}</p>
                  <p className="bdpdf-meta-value">{formatShortDateTime(generatedAt, locale)}</p>
              </div>
            </div>
          </div>

          <div className="bdpdf-page-content">
            <div className="bdpdf-section">
              <div className="bdpdf-section-heading">
                <h2 className="bdpdf-section-title">{copy.executiveSummary}</h2>
                <p className="bdpdf-section-caption">{copy.executiveSummaryCaption}</p>
              </div>

              <div className="bdpdf-summary-grid">
                <div className="bdpdf-summary-card">
                  <p className="bdpdf-lead">{buildExecutiveSummary(detail, locale, copy)}</p>
                </div>
                <div className="bdpdf-panel-card">
                  <p className="bdpdf-lead">{buildPolicySummary(preferences, copy)}</p>
                </div>
              </div>

              <div className="bdpdf-highlight-grid">
                <div className="bdpdf-highlight-card bdpdf-highlight-card--accent">
                  <p className="bdpdf-highlight-label">{copy.netPayroll}</p>
                  <p className="bdpdf-highlight-value">{formatCurrency(detail.run.net_amount, locale)}</p>
                  <p className="bdpdf-highlight-text">{copy.netPayrollHint}</p>
                </div>
                <div className="bdpdf-highlight-card">
                  <p className="bdpdf-highlight-label">{copy.grossPayroll}</p>
                  <p className="bdpdf-highlight-value">{formatCurrency(detail.run.gross_amount, locale)}</p>
                  <p className="bdpdf-highlight-text">{copy.grossPayrollHint}</p>
                </div>
                <div className="bdpdf-highlight-card">
                  <p className="bdpdf-highlight-label">{copy.employerCost}</p>
                  <p className="bdpdf-highlight-value">{formatCurrency(detail.run.employer_contributions_amount, locale)}</p>
                  <p className="bdpdf-highlight-text">{copy.employerCostHint}</p>
                </div>
                <div className="bdpdf-highlight-card">
                  <p className="bdpdf-highlight-label">{copy.averageNet}</p>
                  <p className="bdpdf-highlight-value">{formatCurrency(averageNet, locale)}</p>
                  <p className="bdpdf-highlight-text">{copy.averageNetHint(detail.run.users_count)}</p>
                </div>
              </div>
            </div>

            <div className="bdpdf-section">
              <div className="bdpdf-section-heading">
                <h2 className="bdpdf-section-title">{copy.runSignals}</h2>
                <p className="bdpdf-section-caption">{copy.runSignalsCaption}</p>
              </div>

              <div className="prpdf-signal-grid">
                <article className="prpdf-signal-card">
                  <div className="prpdf-signal-head">
                    <h3 className="prpdf-signal-title">{copy.workloadMix}</h3>
                    <span className={`bdpdf-score-chip ${statusTone}`}>{payPeriodLabel}</span>
                  </div>
                  <div className="prpdf-signal-kpis">
                    <div>
                      <p className="prpdf-signal-value">{formatWholeNumber(totals.regularHours, locale)}</p>
                      <p className="prpdf-signal-label">{copy.regularHours}</p>
                    </div>
                    <div>
                      <p className="prpdf-signal-value">{formatWholeNumber(totals.overtimeHours, locale)}</p>
                      <p className="prpdf-signal-label">{copy.overtimeHours}</p>
                    </div>
                  </div>
                </article>

                <article className="prpdf-signal-card">
                  <div className="prpdf-signal-head">
                    <h3 className="prpdf-signal-title">{copy.attendanceImpact}</h3>
                    <span className="bdpdf-score-chip level-3">{copy.attendance}</span>
                  </div>
                  <div className="prpdf-signal-kpis">
                    <div>
                      <p className="prpdf-signal-value">{formatWholeNumber(totals.leaveDays, locale)}</p>
                      <p className="prpdf-signal-label">{copy.leaveDays}</p>
                    </div>
                    <div>
                      <p className="prpdf-signal-value">{formatWholeNumber(totals.absenceDays, locale)}</p>
                      <p className="prpdf-signal-label">{copy.absenceDays}</p>
                    </div>
                    <div>
                      <p className="prpdf-signal-value">{formatWholeNumber(totals.lateCount, locale)}</p>
                      <p className="prpdf-signal-label">{copy.lateEvents}</p>
                    </div>
                  </div>
                </article>

                <article className="prpdf-signal-card">
                  <div className="prpdf-signal-head">
                    <h3 className="prpdf-signal-title">{copy.fiscalConfiguration}</h3>
                    <span className="bdpdf-score-chip level-4">{preferences.pay_leave_days ? copy.leavePaid : copy.leaveUnpaid}</span>
                  </div>
                  <ul className="bdpdf-info-list">
                    <li><span className="bdpdf-bullet">•</span> {copy.defaultDailyHours}: {formatWholeNumber(preferences.default_daily_hours, locale)}</li>
                    <li><span className="bdpdf-bullet">•</span> {copy.isrRate}: {formatRate(preferences.isr_rate)}</li>
                    <li><span className="bdpdf-bullet">•</span> {copy.employeeBurden}: {formatRate(preferences.imss_user_rate + preferences.infonavit_user_rate)}</li>
                    <li><span className="bdpdf-bullet">•</span> {copy.employerBurden}: {formatRate(preferences.imss_employer_rate + preferences.infonavit_employer_rate + preferences.sar_employer_rate)}</li>
                  </ul>
                </article>
              </div>
            </div>

            <div className="bdpdf-section">
              <div className="bdpdf-section-heading">
                <h2 className="bdpdf-section-title">{copy.topPayouts}</h2>
                <p className="bdpdf-section-caption">{copy.topPayoutsCaption}</p>
              </div>

              <div className="prpdf-employee-grid">
                {topLines.map((line) => (
                  <article className="prpdf-employee-card" key={line.id}>
                    <div className="prpdf-employee-head">
                      <div>
                        <h3 className="prpdf-employee-title">{line.user_name}</h3>
                        <p className="prpdf-employee-subtitle">
                          {[line.position_title, line.department, line.unit_name].filter(Boolean).join(' · ') || copy.activePayrollLine}
                        </p>
                      </div>
                      <div className="prpdf-employee-chip">{formatCurrency(line.net_amount, locale)}</div>
                    </div>

                    <div className="prpdf-employee-metrics">
                      <div>
                        <p className="prpdf-mini-label">{copy.gross}</p>
                        <p className="prpdf-mini-value">{formatCurrency(line.gross_amount, locale)}</p>
                      </div>
                      <div>
                        <p className="prpdf-mini-label">{copy.deductions}</p>
                        <p className="prpdf-mini-value">{formatCurrency(line.deductions_amount, locale)}</p>
                      </div>
                      <div>
                        <p className="prpdf-mini-label">{copy.employer}</p>
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
              <span>{copy.runPeriod}: {formatDate(detail.run.period_start_date, locale)} - {formatDate(detail.run.period_end_date, locale)}</span>
              <span>{copy.averageGross}: {formatCurrency(averageGross, locale)}</span>
            </div>
          </div>
          <footer className="prpdf-owned-footer">
            <span>Generated by Indice · {copy.printedOn} {footerTimestamp} · Confidential</span>
            <span>1 / {totalPages}</span>
          </footer>
        </div>
      </section>

      {ledgerChunks.map((chunk, chunkIndex) => (
        <section className="bdpdf-report-page prpdf-report-page" key={`ledger-${chunkIndex}`}>
          <div className="bdpdf-page-card">
            <div className="bdpdf-page-content">
              <div className="bdpdf-section">
                <div className="bdpdf-section-heading">
                  <h2 className="bdpdf-section-title">{copy.ledger}</h2>
                  <p className="bdpdf-section-caption">
                    {copy.page} {chunkIndex + 1} {copy.of} {ledgerChunks.length} · {copy.payrollPeriod} {formatDate(detail.run.period_start_date, locale)} - {formatDate(detail.run.period_end_date, locale)}
                  </p>
                </div>

                <article className="bdpdf-table-card">
                  <h3 className="bdpdf-table-title">{copy.lineBreakdown}</h3>
                  <table className="bdpdf-table prpdf-ledger-table">
                    <thead>
                      <tr>
                        <th>{copy.employee}</th>
                        <th>{copy.scope}</th>
                        <th>{copy.payable}</th>
                        <th>{copy.gross}</th>
                        <th>{copy.deductions}</th>
                        <th>{copy.employer}</th>
                        <th>{copy.net}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chunk.map((line) => (
                        <tr key={line.id}>
                          <td>
                            <div className="prpdf-cell-title">{line.user_name}</div>
                            <div className="prpdf-cell-subtitle">{line.position_title || copy.roleNotSet}</div>
                          </td>
                          <td>
                            <div className="prpdf-cell-title">{line.unit_name || line.business_name || copy.singlePayroll}</div>
                            <div className="prpdf-cell-subtitle">{line.department || copy.noDepartment}</div>
                          </td>
                          <td>
                            <div className="prpdf-cell-title">{formatWholeNumber(line.days_payable, locale)} {copy.days}</div>
                            <div className="prpdf-cell-subtitle">{formatWholeNumber(line.regular_hours, locale)} {copy.regularShort} · {formatWholeNumber(line.overtime_hours, locale)} {copy.overtimeShort}</div>
                          </td>
                          <td>{formatCurrency(line.gross_amount, locale)}</td>
                          <td>{formatCurrency(line.deductions_amount, locale)}</td>
                          <td>{formatCurrency(line.employer_contributions_amount, locale)}</td>
                          <td>
                            <div className="prpdf-cell-title">{formatCurrency(line.net_amount, locale)}</div>
                            <div className="prpdf-cell-subtitle">{line.include_in_fiscal ? copy.fiscalIncluded : copy.fiscalExcluded}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              </div>

              <div className="bdpdf-section">
                <div className="bdpdf-section-heading">
                  <h2 className="bdpdf-section-title">{copy.adjustmentsAndNotes}</h2>
                  <p className="bdpdf-section-caption">{copy.adjustmentsCaption}</p>
                </div>

                <div className="prpdf-adjustment-grid">
                  {chunk.map((line) => {
                    const manualAdjustments = getManualAdjustments(line);

                    return (
                      <article className="prpdf-adjustment-card" key={`adjustment-${line.id}`}>
                        <div className="prpdf-adjustment-head">
                          <h3 className="prpdf-adjustment-title">{line.user_name}</h3>
                          <span className={`bdpdf-score-chip ${manualAdjustments.length > 0 ? 'level-4' : 'level-2'}`}>
                            {manualAdjustments.length > 0 ? `${manualAdjustments.length} ${copy.manual}` : copy.noManualEdits}
                          </span>
                        </div>

                        {line.notes ? (
                          <p className="prpdf-adjustment-note">{line.notes}</p>
                        ) : (
                          <p className="prpdf-adjustment-note prpdf-adjustment-note--muted">{copy.noNote}</p>
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
                            <li><span className="bdpdf-bullet">•</span>{copy.noAdjustments}</li>
                            <li><span className="bdpdf-bullet">•</span>{copy.computedOnly}</li>
                          </ul>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="bdpdf-footer-note">
                <span>Run #{detail.run.id} · {groupingLabel}</span>
                <span>{copy.printedOn} {formatDateTime(generatedAt, locale)}</span>
              </div>
            </div>
            <footer className="prpdf-owned-footer">
              <span>Generated by Indice · {copy.printedOn} {footerTimestamp} · Confidential</span>
              <span>{chunkIndex + 2} / {totalPages}</span>
            </footer>
          </div>
        </section>
      ))}
    </div>
  );
}
