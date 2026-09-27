import type {
  PayrollLineItem,
  PayrollPreferences,
  PayrollRunDetailResponse,
  PayrollRunLine,
} from '../../../api/humanResources';
import type { CompanyPrintIdentity } from '../../shared/print/useCompanyPrintIdentity';
import type { PayrollTranslations } from './translations';
import {
  payrollLinePrintContract,
  payrollRunPrintContract,
  resolvePayrollPrintJurisdiction,
  type PayrollPrintJurisdictionContext,
} from './payrollPrintContract';

import '../../Dashboard/BusinessProfile/BusinessDiagnosisPdf/businessDiagnosisPdf.css';
import './payrollPdf.css';

export type PayrollRunPdfDocumentProps = {
  companyIdentity: CompanyPrintIdentity;
  copy: PayrollTranslations['pdf'];
  detail: PayrollRunDetailResponse;
  generatedAt: Date;
  groupingLabel: string;
  lineId?: number;
  locale: string;
  payPeriodLabel: string;
  preferences: PayrollPreferences;
  reportId: string;
  statusLabel: string;
  subtitle: string;
  title: string;
};

const RUN_PAGE_SIZE = 10;
const EXCEPTION_PAGE_SIZE = 16;
const LINE_FIRST_PAGE_ITEMS = 7;
const LINE_CONTINUATION_ITEMS = 18;

const formatCurrency = (value: number, locale: string, currency?: string | null) => new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: currency && /^[A-Z]{3}$/.test(currency) ? currency : 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value);

const formatNumber = (value: number, locale: string) => new Intl.NumberFormat(locale, {
  maximumFractionDigits: 2,
}).format(value);

const formatDate = (value: string, locale: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
};

const formatDateTime = (value: Date | string, locale: string) => {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const chunkArray = <T,>(items: T[], size: number): T[][] => {
  if (items.length === 0) return [[]];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
};

const lineWarningCount = (line: PayrollRunLine) => (
  (line.attendance_warnings?.length ?? 0) + (line.calculation_warnings?.length ?? 0)
);

const getDocumentText = (locale: string) => {
  const language = locale.toLowerCase().split('-')[0];
  const english = {
    actionsAndAlerts: 'Adjustments, incentives, and warnings',
    adjustment: 'Manual adjustment',
    alerts: 'Warnings',
    amount: 'Amount',
    absences: 'Absences',
    attendance: 'Period attendance',
    base: 'Base',
    category: 'Category',
    calculation: 'Calculation',
    calculationCut: 'Calculation cut-off',
    code: 'Code',
    concept: 'Concept',
    confidential: 'Confidential',
    currency: 'Native currency',
    continuation: 'Continuation',
    deductions: 'Total deductions',
    description: 'Detail',
    detail: 'Employee payroll breakdown',
    earnings: 'Total earnings',
    employee: 'Employee',
    employeeCode: 'Employee code',
    employer: 'Employer obligations',
    empty: 'There are no records for this period.',
    generated: 'Updated',
    incentive: 'Approved incentive',
    itemSource: 'Source',
    jurisdiction: 'Jurisdiction',
    net: 'Net pay',
    note: 'Note',
    page: 'Page',
    payrollRun: 'Payroll run detail',
    period: 'Period',
    rate: 'Rate',
    reportSource: 'Source: Payroll records',
    documentVersion: 'Document version',
    fiscalNotice: 'Calculated from recorded data, configured rules, and available public references. This document supports — and does not replace — review by the accounting or tax professional responsible for the applicable jurisdiction.',
    regularHours: 'Regular hours',
    overtimeHours: 'Overtime hours',
    lateEvents: 'Late events',
    leaveDays: 'Leave days',
    daysPayable: 'Payable days',
    scope: 'Unit / business',
    status: 'Status',
    treatment: 'Treatment',
    type: 'Type',
    workSchedule: 'Work schedule',
    warning: 'Warning',
  };

  if (language === 'es') return {
    ...english,
    actionsAndAlerts: 'Ajustes, incentivos y alertas',
    adjustment: 'Ajuste manual',
    alerts: 'Alertas',
    amount: 'Monto',
    absences: 'Ausencias',
    attendance: 'Asistencia del periodo',
    category: 'Categoría',
    calculation: 'Cálculo',
    calculationCut: 'Corte de cálculo',
    code: 'Código',
    concept: 'Concepto',
    confidential: 'Confidencial',
    currency: 'Divisa nativa',
    continuation: 'Continuación',
    deductions: 'Total deducciones',
    description: 'Detalle',
    detail: 'Desglose personal de nómina',
    earnings: 'Total percepciones',
    employee: 'Colaborador',
    employeeCode: 'Código del colaborador',
    employer: 'Obligaciones patronales',
    empty: 'No existen registros para este periodo.',
    generated: 'Actualizado',
    incentive: 'Incentivo aprobado',
    itemSource: 'Origen',
    jurisdiction: 'Jurisdicción',
    net: 'Neto a pagar',
    note: 'Nota',
    page: 'Página',
    payrollRun: 'Detalle de corrida de nómina',
    period: 'Periodo',
    rate: 'Tasa',
    reportSource: 'Fuente: registros de nómina',
    documentVersion: 'Versión documental',
    fiscalNotice: 'Cálculos elaborados con los datos registrados, reglas configuradas y referencias públicas disponibles. Este documento facilita, pero no sustituye, la revisión del profesional contable o fiscal responsable en la jurisdicción aplicable.',
    regularHours: 'Horas regulares',
    overtimeHours: 'Horas extra',
    lateEvents: 'Retardos',
    leaveDays: 'Permisos',
    daysPayable: 'Días pagables',
    scope: 'Unidad / negocio',
    status: 'Estado',
    treatment: 'Tratamiento',
    type: 'Tipo',
    workSchedule: 'Jornada',
    warning: 'Alerta',
  };

  if (language === 'fr') return {
    ...english,
    actionsAndAlerts: 'Ajustements, primes et alertes',
    alerts: 'Alertes',
    amount: 'Montant',
    absences: 'Absences',
    attendance: 'Présence de la période',
    calculation: 'Calcul',
    calculationCut: 'Arrêté du calcul',
    code: 'Code',
    concept: 'Élément',
    confidential: 'Confidentiel',
    currency: 'Devise native',
    continuation: 'Suite',
    deductions: 'Total des retenues',
    detail: 'Détail individuel de paie',
    earnings: 'Total des gains',
    employee: 'Collaborateur',
    employeeCode: 'Code du collaborateur',
    employer: 'Obligations de l’employeur',
    empty: 'Aucun enregistrement pour cette période.',
    generated: 'Mis à jour',
    incentive: 'Prime approuvée',
    itemSource: 'Source',
    jurisdiction: 'Juridiction',
    net: 'Net à payer',
    page: 'Page',
    payrollRun: 'Détail du cycle de paie',
    period: 'Période',
    rate: 'Taux',
    reportSource: 'Source : registres de paie',
    documentVersion: 'Version du document',
    fiscalNotice: 'Calculé à partir des données enregistrées, des règles configurées et des références publiques disponibles. Ce document facilite, sans la remplacer, la révision du professionnel comptable ou fiscal responsable dans la juridiction applicable.',
    regularHours: 'Heures régulières',
    overtimeHours: 'Heures supplémentaires',
    lateEvents: 'Retards',
    leaveDays: 'Congés',
    daysPayable: 'Jours payables',
    scope: 'Unité / entreprise',
    status: 'État',
    treatment: 'Traitement',
    type: 'Type',
    workSchedule: 'Temps de travail',
    warning: 'Alerte',
  };

  if (language === 'pt') return {
    ...english,
    actionsAndAlerts: 'Ajustes, incentivos e alertas',
    adjustment: 'Ajuste manual',
    alerts: 'Alertas',
    amount: 'Valor',
    absences: 'Ausências',
    attendance: 'Frequência do período',
    base: 'Base',
    category: 'Categoria',
    calculation: 'Cálculo',
    calculationCut: 'Fechamento do cálculo',
    code: 'Código',
    concept: 'Rubrica',
    confidential: 'Confidencial',
    currency: 'Moeda nativa',
    continuation: 'Continuação',
    deductions: 'Total de descontos',
    description: 'Detalhe',
    detail: 'Demonstrativo individual da folha',
    earnings: 'Total de proventos',
    employee: 'Colaborador',
    employeeCode: 'Código do colaborador',
    employer: 'Encargos patronais',
    empty: 'Não há registros para este período.',
    generated: 'Atualizado',
    incentive: 'Incentivo aprovado',
    itemSource: 'Origem',
    jurisdiction: 'Jurisdição',
    net: 'Líquido a pagar',
    note: 'Observação',
    page: 'Página',
    payrollRun: 'Detalhe da folha de pagamento',
    period: 'Período',
    rate: 'Alíquota',
    reportSource: 'Fonte: registros da folha',
    documentVersion: 'Versão do documento',
    fiscalNotice: 'Calculado com os dados registrados, as regras configuradas e as referências públicas disponíveis. Este documento facilita, mas não substitui, a revisão do profissional contábil ou fiscal responsável na jurisdição aplicável.',
    regularHours: 'Horas regulares',
    overtimeHours: 'Horas extras',
    lateEvents: 'Atrasos',
    leaveDays: 'Licenças',
    daysPayable: 'Dias pagáveis',
    scope: 'Unidade / negócio',
    status: 'Status',
    treatment: 'Tratamento',
    type: 'Tipo',
    workSchedule: 'Jornada',
    warning: 'Alerta',
  };

  if (language === 'ko') return {
    ...english,
    actionsAndAlerts: '조정, 인센티브 및 알림', adjustment: '수동 조정', alerts: '알림', amount: '금액', absences: '결근',
    attendance: '기간 근태', base: '기준', category: '분류', calculation: '계산', calculationCut: '계산 마감', code: '코드', concept: '항목',
    confidential: '기밀', currency: '기준 통화', continuation: '계속', deductions: '총 공제', description: '상세', detail: '직원 급여 상세',
    earnings: '총 지급액', employee: '직원', employeeCode: '직원 코드', employer: '고용주 부담', empty: '이 기간에 기록이 없습니다.', generated: '업데이트',
    incentive: '승인된 인센티브', itemSource: '출처', jurisdiction: '관할', net: '실수령액', note: '메모', page: '페이지', payrollRun: '급여 실행 상세',
    period: '기간', rate: '비율', reportSource: '출처: 급여 기록', documentVersion: '문서 버전',
    fiscalNotice: '등록된 데이터, 설정된 규칙 및 사용 가능한 공개 기준을 바탕으로 계산되었습니다. 이 문서는 해당 관할의 회계 또는 세무 전문가 검토를 지원하지만 대체하지 않습니다.',
    regularHours: '정규 시간', overtimeHours: '초과 근무', lateEvents: '지각', leaveDays: '휴가 일수', daysPayable: '지급 일수', scope: '단위 / 사업',
    status: '상태', treatment: '처리', type: '유형', workSchedule: '근무 일정', warning: '알림',
  };

  if (language === 'zh') return {
    ...english,
    actionsAndAlerts: '调整、激励与提醒', adjustment: '手动调整', alerts: '提醒', amount: '金额', absences: '缺勤', attendance: '本期考勤', base: '基数',
    category: '类别', calculation: '计算', calculationCut: '计算截止', code: '代码', concept: '项目', confidential: '机密', currency: '本位币', continuation: '续页',
    deductions: '扣款总额', description: '明细', detail: '员工薪资明细', earnings: '收入总额', employee: '员工', employeeCode: '员工代码', employer: '雇主承担',
    empty: '本期没有记录。', generated: '更新时间', incentive: '已批准激励', itemSource: '来源', jurisdiction: '司法辖区', net: '实发工资', note: '备注',
    page: '页', payrollRun: '薪资批次明细', period: '期间', rate: '费率', reportSource: '来源：薪资记录', documentVersion: '文档版本',
    fiscalNotice: '根据已登记数据、已配置规则和可用公开参考进行计算。本文件用于支持适用司法辖区会计或税务专业人员的审核，但不能替代其专业审核。',
    regularHours: '正常工时', overtimeHours: '加班工时', lateEvents: '迟到', leaveDays: '请假天数', daysPayable: '应付天数', scope: '单元 / 业务',
    status: '状态', treatment: '处理方式', type: '类型', workSchedule: '工作安排', warning: '提醒',
  };

  return english;
};

const categoryLabel = (item: PayrollLineItem, locale: string) => {
  const language = locale.toLowerCase().split('-')[0];
  const labels = language === 'es'
    ? { earning: 'Percepción', deduction: 'Deducción', employer_contribution: 'Aportación patronal', provision: 'Provisión' }
    : language === 'fr'
      ? { earning: 'Gain', deduction: 'Retenue', employer_contribution: 'Contribution employeur', provision: 'Provision' }
      : language === 'pt'
        ? { earning: 'Provento', deduction: 'Desconto', employer_contribution: 'Encargo patronal', provision: 'Provisão' }
        : language === 'ko'
          ? { earning: '지급', deduction: '공제', employer_contribution: '고용주 부담', provision: '충당금' }
          : language === 'zh'
            ? { earning: '收入', deduction: '扣款', employer_contribution: '雇主缴费', provision: '计提' }
            : { earning: 'Earning', deduction: 'Deduction', employer_contribution: 'Employer contribution', provision: 'Provision' };
  return labels[item.category] ?? item.category;
};

const sourceLabel = (item: PayrollLineItem, locale: string) => {
  const language = locale.toLowerCase().split('-')[0];
  const labels = language === 'es'
    ? { computed: 'Calculado', manual: 'Manual', computed_tax: 'Fiscal', adjustment: 'Ajuste', incentive: 'Incentivo' }
    : language === 'fr'
      ? { computed: 'Calculé', manual: 'Manuel', computed_tax: 'Fiscal', adjustment: 'Ajustement', incentive: 'Prime' }
      : language === 'pt'
        ? { computed: 'Calculado', manual: 'Manual', computed_tax: 'Fiscal', adjustment: 'Ajuste', incentive: 'Incentivo' }
        : language === 'ko'
          ? { computed: '계산됨', manual: '수동', computed_tax: '세금', adjustment: '조정', incentive: '인센티브' }
          : language === 'zh'
            ? { computed: '已计算', manual: '手动', computed_tax: '税务', adjustment: '调整', incentive: '激励' }
            : { computed: 'Computed', manual: 'Manual', computed_tax: 'Tax', adjustment: 'Adjustment', incentive: 'Incentive' };
  return labels[item.source_type] ?? item.source_type;
};

type PrintHeaderProps = {
  companyIdentity: CompanyPrintIdentity;
  eyebrow: string;
  reportId: string;
  statusLabel: string;
  subtitle: string;
  title: string;
};

function PrintHeader({ companyIdentity, eyebrow, reportId, statusLabel, subtitle, title }: PrintHeaderProps) {
  return (
    <header className="prpdf-document-header">
      <div className="prpdf-company-identity">
        {companyIdentity.logoUrl ? <img src={companyIdentity.logoUrl} alt="" className="prpdf-company-logo" /> : null}
        <div>
          <p className="prpdf-company-name">{companyIdentity.name || title}</p>
          <p className="prpdf-eyebrow">{eyebrow}</p>
        </div>
      </div>
      <div className="prpdf-document-identity">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="prpdf-document-status">
        <span>{statusLabel}</span>
        <small>{reportId}</small>
      </div>
    </header>
  );
}

function PrintFooter({ generatedAt, locale, page, reportId, totalPages, version }: {
  generatedAt: Date;
  locale: string;
  page: number;
  reportId: string;
  totalPages: number;
  version: string;
}) {
  const text = getDocumentText(locale);
  return (
    <footer className="prpdf-document-footer">
      <span>{text.generated}: {formatDateTime(generatedAt, locale)}</span>
      <span>{text.confidential} · {reportId} · v{version}</span>
    </footer>
  );
}

type MetadataItem = {
  label: string;
  value: string;
};

function PrintMetadataStrip({ items }: { items: MetadataItem[] }) {
  return (
    <dl className="prpdf-metadata-strip">
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`}>
          <dt>{item.label}</dt>
          <dd>{item.value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function JurisdictionContextBlock({ context, notice }: {
  context: PayrollPrintJurisdictionContext;
  notice: string;
}) {
  return (
    <section className="prpdf-jurisdiction-context">
      <div>
        <span>{context.calculationFrameworkLabel}</span>
        <p>{context.label} · {context.framework}</p>
      </div>
      <div>
        <span>{context.evidenceLabel}</span>
        <p>{context.evidenceReferences.join(' · ')}</p>
      </div>
      <p className="prpdf-jurisdiction-notice">{notice}</p>
    </section>
  );
}

type ExceptionRow = {
  amount?: number;
  currency?: string | null;
  detail: string;
  employee: string;
  key: string;
  type: string;
};

const buildExceptionRows = (lines: PayrollRunLine[], locale: string): ExceptionRow[] => {
  const text = getDocumentText(locale);
  return lines.flatMap((line) => {
    const conceptRows = line.items
      .filter((item) => ['manual', 'adjustment', 'incentive'].includes(item.source_type))
      .map((item) => ({
        amount: item.amount,
        currency: item.currency_code || line.currency_code,
        detail: item.label || item.code,
        employee: line.user_name,
        key: `${line.id}-item-${item.id}`,
        type: item.source_type === 'incentive' ? text.incentive : text.adjustment,
      }));
    const warningRows = [...(line.attendance_warnings ?? []), ...(line.calculation_warnings ?? [])].map((warning, index) => ({
      detail: warning,
      employee: line.user_name,
      key: `${line.id}-warning-${index}`,
      type: text.warning,
    }));
    const noteRows = line.notes ? [{
      detail: line.notes,
      employee: line.user_name,
      key: `${line.id}-note`,
      type: text.note,
    }] : [];
    return [...conceptRows, ...warningRows, ...noteRows];
  });
};

function PayrollRunDocument(props: PayrollRunPdfDocumentProps) {
  const { companyIdentity, detail, generatedAt, groupingLabel, locale, payPeriodLabel, reportId, statusLabel } = props;
  const text = getDocumentText(locale);
  const currency = detail.run.currency_code || 'USD';
  const jurisdictionContexts = detail.lines.map((line) => resolvePayrollPrintJurisdiction(line, locale));
  const firstJurisdictionContext = jurisdictionContexts[0] ?? null;
  const runJurisdictionContext = firstJurisdictionContext ? {
    ...firstJurisdictionContext,
    evidenceReferences: Array.from(new Set(jurisdictionContexts.flatMap((context) => context.evidenceReferences))).slice(0, 10),
  } : null;
  const jurisdictionLabels = Array.from(new Set(jurisdictionContexts.map((context) => context.label)));
  const jurisdictionLabel = detail.run.jurisdiction_label?.trim()
    || jurisdictionLabels.join(' / ')
    || '—';
  const calculationModes = Array.from(new Set(jurisdictionContexts.map((context) => context.calculationModeLabel)));
  const calculationTimestamps = detail.lines
    .map((line) => line.calculation_timestamp)
    .filter((value): value is string => Boolean(value))
    .sort();
  const calculationCut = calculationTimestamps[calculationTimestamps.length - 1];
  const ledgerChunks = chunkArray(detail.lines, RUN_PAGE_SIZE);
  const exceptionRows = buildExceptionRows(detail.lines, locale);
  const exceptionChunks = exceptionRows.length > 0
    ? chunkArray(exceptionRows, EXCEPTION_PAGE_SIZE)
    : [];
  const totalPages = ledgerChunks.length + exceptionChunks.length;
  const period = `${formatDate(detail.run.period_start_date, locale)} – ${formatDate(detail.run.period_end_date, locale)}`;

  return (
    <div className="prpdf-report-shell" lang={locale}>
      {ledgerChunks.map((lines, pageIndex) => (
        <section className="bdpdf-report-page prpdf-landscape-page" key={`ledger-${pageIndex}`}>
          <div className="prpdf-page-card">
            <PrintHeader
              companyIdentity={companyIdentity}
              eyebrow={pageIndex === 0 ? text.payrollRun : `${text.payrollRun} · ${text.continuation}`}
              reportId={reportId}
              statusLabel={statusLabel}
              subtitle={`${text.period}: ${period} · ${groupingLabel} · ${payPeriodLabel} · ${jurisdictionLabel}`}
              title={text.payrollRun}
            />

            {pageIndex === 0 ? (
              <>
                <PrintMetadataStrip items={[
                  { label: text.jurisdiction, value: jurisdictionLabel },
                  { label: text.currency, value: currency },
                  { label: text.calculation, value: calculationModes.join(' / ') || '—' },
                  { label: text.calculationCut, value: calculationCut ? formatDateTime(calculationCut, locale) : '—' },
                ]} />
                <div className="prpdf-kpi-strip">
                  <div><span>{text.employee}</span><strong>{detail.run.users_count}</strong></div>
                  <div><span>{text.earnings}</span><strong>{formatCurrency(detail.run.gross_amount, locale, currency)}</strong></div>
                  <div><span>{text.deductions}</span><strong>{formatCurrency(detail.run.deductions_amount, locale, currency)}</strong></div>
                  <div><span>{text.employer}</span><strong>{formatCurrency(detail.run.employer_contributions_amount, locale, currency)}</strong></div>
                  <div className="prpdf-kpi-accent"><span>{text.net}</span><strong>{formatCurrency(detail.run.net_amount, locale, currency)}</strong></div>
                </div>
                {runJurisdictionContext ? <JurisdictionContextBlock context={runJurisdictionContext} notice={text.fiscalNotice} /> : null}
              </>
            ) : null}

            <main className="prpdf-document-body">
              <div className="prpdf-section-heading">
                <div>
                  <h2>{text.payrollRun}</h2>
                  <p>{text.reportSource} · {currency}</p>
                </div>
                <span>{lines.length} / {detail.lines.length}</span>
              </div>
              <div className="prpdf-table-frame">
                <table className="prpdf-financial-table">
                  <thead>
                    <tr>
                      <th>{text.employee}</th>
                      <th>{text.scope}</th>
                      <th>{text.workSchedule}</th>
                      <th className="prpdf-numeric">{text.earnings}</th>
                      <th className="prpdf-numeric">{text.deductions}</th>
                      <th className="prpdf-numeric">{text.employer}</th>
                      <th className="prpdf-numeric">{text.net}</th>
                      <th className="prpdf-center">{text.alerts}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.id}>
                        <td><span>{line.user_name}</span><small>{line.position_title || '—'} · {line.department || '—'}</small></td>
                        <td><span>{line.unit_name || '—'}</span><small>{line.business_name || '—'}</small></td>
                        <td><span>{formatNumber(line.days_payable, locale)} {text.daysPayable.toLocaleLowerCase()}</span><small>{formatNumber(line.regular_hours, locale)} h · {formatNumber(line.overtime_hours, locale)} h</small></td>
                        <td className="prpdf-numeric">{formatCurrency(line.gross_amount, locale, line.currency_code || currency)}</td>
                        <td className="prpdf-numeric">{formatCurrency(line.deductions_amount, locale, line.currency_code || currency)}</td>
                        <td className="prpdf-numeric">{formatCurrency(line.employer_contributions_amount, locale, line.currency_code || currency)}</td>
                        <td className="prpdf-numeric prpdf-net-cell">{formatCurrency(line.net_amount, locale, line.currency_code || currency)}</td>
                        <td className="prpdf-center">{lineWarningCount(line)}</td>
                      </tr>
                    ))}
                    {lines.length === 0 ? <tr><td colSpan={8} className="prpdf-empty-cell">{text.empty}</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </main>
            <PrintFooter generatedAt={generatedAt} locale={locale} page={pageIndex + 1} reportId={reportId} totalPages={totalPages} version={payrollRunPrintContract.version} />
          </div>
        </section>
      ))}

      {exceptionChunks.map((rows, exceptionIndex) => {
        const page = ledgerChunks.length + exceptionIndex + 1;
        return (
          <section className="bdpdf-report-page prpdf-landscape-page" key={`exceptions-${exceptionIndex}`}>
            <div className="prpdf-page-card">
              <PrintHeader
                companyIdentity={companyIdentity}
                eyebrow={`${text.actionsAndAlerts} · ${text.continuation}`}
                reportId={reportId}
                statusLabel={statusLabel}
                subtitle={`${text.period}: ${period} · ${groupingLabel}`}
                title={text.actionsAndAlerts}
              />
              <main className="prpdf-document-body">
                <div className="prpdf-table-frame">
                  <table className="prpdf-financial-table prpdf-exception-table">
                    <thead><tr><th>{text.employee}</th><th>{text.type}</th><th>{text.description}</th><th className="prpdf-numeric">{text.amount}</th></tr></thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.key}>
                          <td>{row.employee}</td>
                          <td>{row.type}</td>
                          <td>{row.detail}</td>
                          <td className="prpdf-numeric">{row.amount === undefined ? '—' : formatCurrency(row.amount, locale, row.currency || currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </main>
              <PrintFooter generatedAt={generatedAt} locale={locale} page={page} reportId={reportId} totalPages={totalPages} version={payrollRunPrintContract.version} />
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PayrollLineDocument(props: PayrollRunPdfDocumentProps & { line: PayrollRunLine }) {
  const { companyIdentity, detail, generatedAt, line, locale, reportId, statusLabel } = props;
  const text = getDocumentText(locale);
  const currency = line.currency_code || detail.run.currency_code || 'USD';
  const jurisdictionContext = resolvePayrollPrintJurisdiction(line, locale);
  const firstItems = line.items.slice(0, LINE_FIRST_PAGE_ITEMS);
  const remainingItems = line.items.slice(LINE_FIRST_PAGE_ITEMS);
  const itemChunks = [firstItems, ...chunkArray(remainingItems, LINE_CONTINUATION_ITEMS).filter((chunk) => chunk.length > 0)];
  const safeItemChunks = itemChunks.length > 0 ? itemChunks : [[]];
  const totalPages = safeItemChunks.length;
  const period = `${formatDate(detail.run.period_start_date, locale)} – ${formatDate(detail.run.period_end_date, locale)}`;
  const warnings = [...(line.attendance_warnings ?? []), ...(line.calculation_warnings ?? [])];

  return (
    <div className="prpdf-report-shell" lang={locale}>
      {safeItemChunks.map((items, pageIndex) => (
        <section className="bdpdf-report-page prpdf-landscape-page" key={`line-${pageIndex}`}>
          <div className="prpdf-page-card">
            <PrintHeader
              companyIdentity={companyIdentity}
              eyebrow={pageIndex === 0
                ? `${jurisdictionContext.label} · ${jurisdictionContext.calculationModeLabel}`
                : `${jurisdictionContext.label} · ${text.continuation}`}
              reportId={`${reportId}-L${line.id}`}
              statusLabel={statusLabel}
              subtitle={`${line.user_name} · ${text.period}: ${period}`}
              title={text.detail}
            />

            {pageIndex === 0 ? (
              <>
                <PrintMetadataStrip items={[
                  { label: text.employee, value: `${line.user_name} · ${text.employeeCode}: ${line.user_code || '—'}` },
                  { label: text.scope, value: `${line.unit_name || '—'} / ${line.business_name || '—'}` },
                  { label: text.jurisdiction, value: jurisdictionContext.label },
                  { label: text.calculation, value: `${jurisdictionContext.calculationModeLabel} · ${jurisdictionContext.complianceLabel}` },
                  { label: text.calculationCut, value: line.calculation_timestamp ? formatDateTime(line.calculation_timestamp, locale) : '—' },
                ]} />
                <div className="prpdf-kpi-strip prpdf-kpi-strip--four">
                  <div><span>{text.earnings}</span><strong>{formatCurrency(line.gross_amount, locale, currency)}</strong></div>
                  <div><span>{text.deductions}</span><strong>{formatCurrency(line.deductions_amount, locale, currency)}</strong></div>
                  <div><span>{text.employer}</span><strong>{formatCurrency(line.employer_contributions_amount, locale, currency)}</strong></div>
                  <div className="prpdf-kpi-accent"><span>{text.net}</span><strong>{formatCurrency(line.net_amount, locale, currency)}</strong></div>
                </div>
                <div className="prpdf-attendance-strip">
                  <span>{text.attendance}</span>
                  <dl>
                    <div><dt>{text.daysPayable}</dt><dd>{formatNumber(line.days_payable, locale)}</dd></div>
                    <div><dt>{text.regularHours}</dt><dd>{formatNumber(line.regular_hours, locale)}</dd></div>
                    <div><dt>{text.overtimeHours}</dt><dd>{formatNumber(line.overtime_hours, locale)}</dd></div>
                    <div><dt>{text.lateEvents}</dt><dd>{formatNumber(line.late_count, locale)}</dd></div>
                    <div><dt>{text.leaveDays}</dt><dd>{formatNumber(line.leave_days, locale)}</dd></div>
                    <div><dt>{text.absences}</dt><dd>{formatNumber(line.absence_days, locale)}</dd></div>
                  </dl>
                </div>
                <JurisdictionContextBlock context={jurisdictionContext} notice={text.fiscalNotice} />
              </>
            ) : null}

            <main className="prpdf-document-body">
              <div className="prpdf-section-heading">
                <div><h2>{text.concept}</h2><p>{text.reportSource} · {currency} · {line.payroll_treatment_label || line.payroll_treatment || '—'}</p></div>
                <span>{line.items.length} conceptos</span>
              </div>
              <div className="prpdf-table-frame">
                <table className="prpdf-financial-table prpdf-concept-table">
                  <thead><tr><th>{text.code}</th><th>{text.concept}</th><th>{text.category}</th><th>{text.itemSource}</th><th className="prpdf-numeric">{text.base}</th><th className="prpdf-numeric">{text.rate}</th><th className="prpdf-numeric">{text.amount}</th></tr></thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.code}</td>
                        <td><span>{item.label || item.code}</span><small>{item.rule_code || item.legal_classification || '—'}</small></td>
                        <td>{categoryLabel(item, locale)}</td>
                        <td><span>{sourceLabel(item, locale)}</span><small>{item.tax_treatment || item.legal_classification || '—'}</small></td>
                        <td className="prpdf-numeric">{item.calculation_base == null ? '—' : formatCurrency(item.calculation_base, locale, item.currency_code || currency)}</td>
                        <td className="prpdf-numeric">{item.rate_applied == null ? '—' : `${formatNumber(item.rate_applied * 100, locale)}%`}</td>
                        <td className="prpdf-numeric prpdf-net-cell">{formatCurrency(item.amount, locale, item.currency_code || currency)}</td>
                      </tr>
                    ))}
                    {items.length === 0 ? <tr><td colSpan={7} className="prpdf-empty-cell">{text.empty}</td></tr> : null}
                  </tbody>
                  {pageIndex === totalPages - 1 ? (
                    <tfoot><tr><td colSpan={5} /><td>{text.net}</td><td className="prpdf-numeric">{formatCurrency(line.net_amount, locale, currency)}</td></tr></tfoot>
                  ) : null}
                </table>
              </div>

              {pageIndex === 0 && (warnings.length > 0 || line.notes) ? (
                <div className="prpdf-notice-grid">
                  {warnings.length > 0 ? <div><span>{text.alerts}</span><p>{warnings.join(' · ')}</p></div> : null}
                  {line.notes ? <div><span>{text.note}</span><p>{line.notes}</p></div> : null}
                </div>
              ) : null}
            </main>
            <PrintFooter generatedAt={generatedAt} locale={locale} page={pageIndex + 1} reportId={`${reportId}-L${line.id}`} totalPages={totalPages} version={payrollLinePrintContract.version} />
          </div>
        </section>
      ))}
    </div>
  );
}

export function PayrollRunPdfDocument(props: PayrollRunPdfDocumentProps) {
  const selectedLine = props.lineId === undefined
    ? null
    : props.detail.lines.find((line) => line.id === props.lineId) ?? null;
  return selectedLine ? <PayrollLineDocument {...props} line={selectedLine} /> : <PayrollRunDocument {...props} />;
}
