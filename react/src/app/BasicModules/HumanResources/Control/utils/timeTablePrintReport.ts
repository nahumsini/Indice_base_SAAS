import type { ControlTranslations } from '../translations';
import type { TimeTableEmployeeRow } from '../types/timeTableTypes';
import { escapePrintHtml, printHtmlDocument } from './timeTablePrint';
import {
  assignmentBusinessName,
  assignmentUnitName,
  formatAttendanceTime,
  formatWorkedDuration,
} from './timeTableUtils';

interface PrintDailyAttendanceReportParams {
  businessFilter: string;
  copy: ControlTranslations;
  dailyAttendanceMetrics: Array<{ label: string; value: number }>;
  dateLabel: string;
  locale: string;
  selectedBusinessLabel: string;
  selectedUnitLabel: string;
  sortedEmployeeRows: TimeTableEmployeeRow[];
  unitFilter: string;
}

export function printDailyAttendanceReport({
  businessFilter,
  copy,
  dailyAttendanceMetrics,
  dateLabel,
  locale,
  selectedBusinessLabel,
  selectedUnitLabel,
  sortedEmployeeRows,
  unitFilter,
}: PrintDailyAttendanceReportParams) {
  const title = copy.timeTable.printTitle(dateLabel);
  const scopeLabel = [
    copy.timeTable.unitScopeLabel(unitFilter ? selectedUnitLabel : copy.timeTable.allUnits),
    copy.timeTable.businessScopeLabel(businessFilter ? selectedBusinessLabel : copy.timeTable.allBusinesses),
  ].join(' | ');
  const metricsHtml = dailyAttendanceMetrics
    .map((metric) => `
      <div class="metric">
        <div class="metric-value">${metric.value}</div>
        <div class="metric-label">${escapePrintHtml(metric.label)}</div>
      </div>
    `)
    .join('');
  const rowsHtml = sortedEmployeeRows.length > 0
    ? sortedEmployeeRows.map((row) => `
      <tr>
        <td><strong>${escapePrintHtml(row.assignment.user_name)}</strong><br><span class="muted">${escapePrintHtml(row.assignment.user_code || `EMP-${row.assignment.user_company_id}`)}</span></td>
        <td>${escapePrintHtml(assignmentUnitName(row.assignment, copy))}</td>
        <td>${escapePrintHtml(assignmentBusinessName(row.assignment, copy))}</td>
        <td>${escapePrintHtml(row.assignment.first_location?.name ?? copy.timeTable.notAssigned)}</td>
        <td>${escapePrintHtml(row.assignment.last_location?.name ?? copy.timeTable.notAssigned)}</td>
        <td>${escapePrintHtml(formatAttendanceTime(row.assignment.first_check_in_at, locale))}</td>
        <td>${escapePrintHtml(formatAttendanceTime(row.assignment.last_check_out_at, locale))}</td>
        <td>${escapePrintHtml(formatWorkedDuration(row.assignment.first_check_in_at, row.assignment.last_check_out_at))}</td>
        <td>${escapePrintHtml(row.attendance)}</td>
      </tr>
    `).join('')
    : `<tr><td colspan="9" class="muted">${escapePrintHtml(copy.timeTable.printEmptyRows)}</td></tr>`;

  printHtmlDocument({
    lang: locale,
    title,
    bodyHtml: `
      <header class="document-header">
        <div class="document-topline">
          <div class="brand-lockup">
            <span class="indice-mark" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
            <div class="brand-text">
              <strong>INDICE</strong>
              <span>${escapePrintHtml(copy.labels.dailyAttendance)}</span>
            </div>
          </div>
          <p class="report-id">${escapePrintHtml(title)}</p>
        </div>
        <div class="title-block">
          <p class="kicker">${escapePrintHtml(copy.labels.timeTable)}</p>
          <h1>${escapePrintHtml(copy.timeTable.printReportTitle)}</h1>
        </div>
        <div class="meta-grid">
          <div>
            <span class="meta-label">${escapePrintHtml(copy.timeTable.printDateLabel)}</span>
            <strong class="meta-value">${escapePrintHtml(dateLabel)}</strong>
          </div>
          <div>
            <span class="meta-label">${escapePrintHtml(copy.labels.unit)} / ${escapePrintHtml(copy.labels.business)}</span>
            <strong class="meta-value">${escapePrintHtml(scopeLabel)}</strong>
          </div>
        </div>
      </header>
      <div class="metrics">${metricsHtml}</div>
      <table>
        <thead>
          <tr>
            <th>${escapePrintHtml(copy.timeTable.table.employee)}</th>
            <th>${escapePrintHtml(copy.timeTable.table.unit)}</th>
            <th>${escapePrintHtml(copy.timeTable.table.business)}</th>
            <th>${escapePrintHtml(copy.timeTable.table.checkInLocation)}</th>
            <th>${escapePrintHtml(copy.timeTable.table.checkOutLocation)}</th>
            <th>${escapePrintHtml(copy.labels.checkIn)}</th>
            <th>${escapePrintHtml(copy.labels.checkOut)}</th>
            <th>${escapePrintHtml(copy.timeTable.table.workedHours)}</th>
            <th>${escapePrintHtml(copy.timeTable.table.attendance)}</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <footer class="footer-note">
        <span>INDICE</span>
        <span>${escapePrintHtml(copy.timeTable.printReportTitle)}</span>
      </footer>
    `,
  });
}
