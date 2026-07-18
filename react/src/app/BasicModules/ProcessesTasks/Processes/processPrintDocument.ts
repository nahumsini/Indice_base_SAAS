import type { ProcessesTranslations } from './translations';
import type { ProcessRecord } from './types';
import { printStandardDocumentPdf } from '../../shared/print/standardDocumentPdf';

const labelsFor = (locale: string) => {
  const language = locale.toLowerCase().split('-')[0];
  const labels = {
    en: { procedure: 'Operating procedure', objective: 'Purpose and scope', configuration: 'Execution configuration', performance: 'Current operational performance', tasks: 'Tasks', open: 'Open', completed: 'Completed', overdue: 'Overdue', audited: 'Audited', evidence: 'Evidence required', yes: 'Yes', no: 'No', notice: 'Controlled operational copy generated from the active process configuration. Confirm its status and version before execution.' },
    es: { procedure: 'Procedimiento operativo', objective: 'Objetivo y alcance', configuration: 'Configuración de ejecución', performance: 'Desempeño operativo actual', tasks: 'Tareas', open: 'Abiertas', completed: 'Completadas', overdue: 'Vencidas', audited: 'Auditadas', evidence: 'Evidencia requerida', yes: 'Sí', no: 'No', notice: 'Copia operativa controlada generada desde la configuración activa del proceso. Confirma su estado y versión antes de ejecutarlo.' },
    fr: { procedure: 'Procédure opérationnelle', objective: 'Objectif et portée', configuration: 'Configuration d’exécution', performance: 'Performance opérationnelle actuelle', tasks: 'Tâches', open: 'Ouvertes', completed: 'Terminées', overdue: 'En retard', audited: 'Auditées', evidence: 'Preuve requise', yes: 'Oui', no: 'Non', notice: 'Copie opérationnelle contrôlée. Confirmez son statut et sa version avant exécution.' },
    pt: { procedure: 'Procedimento operacional', objective: 'Objetivo e escopo', configuration: 'Configuração de execução', performance: 'Desempenho operacional atual', tasks: 'Tarefas', open: 'Abertas', completed: 'Concluídas', overdue: 'Vencidas', audited: 'Auditadas', evidence: 'Evidência obrigatória', yes: 'Sim', no: 'Não', notice: 'Cópia operacional controlada. Confirme o status e a versão antes da execução.' },
  };
  return labels[language as keyof typeof labels] ?? labels.en;
};

const date = (value: string | null | undefined, locale: string) => {
  if (!value) return '—';
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(parsed);
};

export function printProcessProcedure(record: ProcessRecord, copy: ProcessesTranslations, locale: string) {
  const labels = labelsFor(locale);
  return printStandardDocumentPdf({
    accentColor: [207, 161, 30],
    confidentiality: 'Internal',
    contract: {
      category: 'operational-report',
      modifiers: ['approval-required', 'internal'],
      orientation: 'portrait',
      pageSize: 'a4',
      version: '1.0',
    },
    fileName: { documentType: labels.procedure, identifier: record.folio },
    folio: record.folio,
    issuer: record.businessName || record.business || record.unitName || record.unit || 'Indice',
    locale,
    metadata: [
      { label: copy.form.labels.unit, value: record.unitName || record.unit },
      { label: copy.form.labels.business, value: record.businessName || record.business },
      { label: copy.form.labels.responsible, value: record.responsible || copy.common.unassigned },
      { label: copy.columns.creator.label, value: record.creator },
      { label: copy.form.labels.priority, value: copy.priorities[record.priority] },
      { label: copy.form.labels.frequency, value: `${copy.frequencies[record.frequency]} · ${copy.describeFrequency(record.frequency, record.recurrence)}` },
      { label: copy.form.labels.start, value: date(record.startDate, locale) },
      { label: copy.form.labels.end, value: date(record.endDate, locale) },
    ],
    metrics: [
      { label: labels.tasks, value: record.taskCount },
      { label: labels.completed, tone: 'positive', value: record.completedTaskCount },
      { label: labels.open, value: record.openTaskCount },
      { label: labels.overdue, tone: record.overdueTaskCount > 0 ? 'negative' : 'positive', value: record.overdueTaskCount },
      { label: copy.table.progress, value: `${record.completionPercent}%` },
    ],
    notice: labels.notice,
    sections: [
      { paragraphs: [record.description], title: labels.objective },
      {
        fields: [
          { label: copy.form.labels.taskTitle, value: record.taskTitleTemplate || record.title },
          { label: copy.form.labels.taskDescription, value: record.taskDescriptionTemplate || record.description },
          { label: copy.form.labels.taskNotes, value: record.taskNotesTemplate },
          { label: labels.evidence, value: record.evidenceRequired ? labels.yes : labels.no },
          { label: copy.form.labels.graceDays, value: record.graceDays ?? 0 },
          { label: copy.form.labels.window, value: record.generationWindowDays ?? 0 },
          { label: copy.columns.nextOccurrence.label, value: date(record.nextOccurrenceDate, locale) },
          { label: copy.table.until, value: date(record.generatedUntilDate, locale) },
        ],
        title: labels.configuration,
      },
      {
        fields: [
          { label: labels.tasks, value: record.taskCount },
          { label: labels.open, value: record.openTaskCount },
          { label: labels.completed, value: record.completedTaskCount },
          { label: labels.overdue, value: record.overdueTaskCount },
          { label: labels.audited, value: record.auditedTaskCount },
        ],
        title: labels.performance,
      },
    ],
    signatures: [
      { caption: record.creator, label: copy.columns.creator.label },
      { caption: record.responsible, label: copy.form.labels.responsible },
      { label: 'Aprobación del proceso' },
    ],
    status: record.isActive ? copy.statuses.active : copy.statuses.paused,
    subtitle: `${copy.frequencies[record.frequency]} · ${record.responsible || copy.common.unassigned}`,
    title: `${labels.procedure}: ${record.title}`,
  });
}
