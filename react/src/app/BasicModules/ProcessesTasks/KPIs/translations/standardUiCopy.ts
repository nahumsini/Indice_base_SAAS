type StandardUiCopy = {
  title: string;
  subtitle: string;
  filterTitle: string;
  search: string;
  searchPlaceholder: string;
  results: (count: number) => string;
  clear: string;
  refresh: string;
  contextTitle: string;
  contextSubtitle: string;
  updated: string;
  selectedRange: string;
  selectedScope: string;
  cards: Record<string, { title: string; target: (summary: any) => string; description: string }>;
  compositionTitle: string;
  compositionSubtitle: string;
  unitsTitle: string;
  unitsSubtitle: string;
  productivity: string;
  timeliness: string;
  topsTitle: string;
  topsSubtitle: string;
  topCompliance: string;
  topOverdue: string;
  riskyProcesses: string;
  riskyProjects: string;
  noData: string;
  tasks: string;
  score: string;
};

const es: StandardUiCopy = {
  title: 'Indicadores de procesos y tareas', subtitle: 'Productividad, cumplimiento, riesgo y rendimiento operativo en una sola vista.',
  filterTitle: 'Filtros de indicadores', search: 'Buscar', searchPlaceholder: 'Tarea, folio, proceso, proyecto o responsable',
  results: (count) => `${count} tareas`, clear: 'Limpiar', refresh: 'Actualizar datos', contextTitle: 'Contexto de los datos',
  contextSubtitle: 'Todo el tablero responde al mismo alcance operativo.', updated: 'Actualizado', selectedRange: 'Periodo', selectedScope: 'Alcance',
  cards: {
    volume: { title: 'Tareas del periodo', target: (s) => `${s.openTasks} abiertas`, description: 'Volumen de trabajo visible dentro del alcance seleccionado.' },
    closed: { title: 'Tareas cerradas', target: (s) => `${s.completionRate}% de cumplimiento`, description: 'Tareas completadas o auditadas dentro del periodo.' },
    open: { title: 'Tareas abiertas', target: (s) => `${s.closedTasks} cerradas`, description: 'Carga pendiente, en curso, pausada o vencida que requiere seguimiento.' },
    overdue: { title: 'Tareas vencidas', target: (s) => `${s.overdue8PlusDays} con 8+ días`, description: 'Compromisos que superaron su fecha de entrega sin cierre oportuno.' },
    timeliness: { title: 'Puntualidad', target: (s) => `${s.overdueTasks} vencidas`, description: 'Disciplina de entrega contra la fecha de vencimiento.' },
    audit: { title: 'Cobertura de auditoría', target: (s) => `${s.pendingAuditTasks} por auditar`, description: 'Cierres revisados por la jefatura o auditor responsable.' },
    evidence: { title: 'Evidencia completa', target: (s) => `${s.evidenceTasks} con archivos`, description: 'Cobertura documental de las tareas incluidas en el alcance.' },
    productivity: { title: 'Salud operativa', target: () => 'Meta 85/100', description: '30% avance · 25% cierre · 20% puntualidad · 10% auditoría · 10% calidad · 5% evidencia.' },
  },
  compositionTitle: 'Composición de la agenda', compositionSubtitle: 'Distribución de tareas por estado dentro del alcance.',
  unitsTitle: 'Rendimiento por unidad', unitsSubtitle: 'Productividad y puntualidad con el mismo filtro global.', productivity: 'Productividad', timeliness: 'Puntualidad',
  topsTitle: 'Concentración y atención', topsSubtitle: 'Entidades que explican el rendimiento y el riesgo del periodo.',
  topCompliance: 'Mayor cumplimiento', topOverdue: 'Vencidas por responsable', riskyProcesses: 'Procesos que requieren atención', riskyProjects: 'Proyectos que requieren atención',
  noData: 'Sin datos en el alcance actual', tasks: 'tareas', score: 'puntos',
};

const en: StandardUiCopy = {
  ...es,
  title: 'Process and task indicators', subtitle: 'Productivity, compliance, risk, and operational performance in one view.',
  filterTitle: 'Indicator filters', search: 'Search', searchPlaceholder: 'Task, folio, process, project, or owner',
  results: (count) => `${count} tasks`, clear: 'Clear', refresh: 'Refresh data', contextTitle: 'Data context',
  contextSubtitle: 'The entire dashboard responds to the same operational scope.', updated: 'Updated', selectedRange: 'Period', selectedScope: 'Scope',
  cards: {
    volume: { title: 'Tasks in period', target: (s) => `${s.openTasks} open`, description: 'Visible workload inside the selected scope.' },
    closed: { title: 'Closed tasks', target: (s) => `${s.completionRate}% completion`, description: 'Tasks completed or audited in the period.' },
    open: { title: 'Open tasks', target: (s) => `${s.closedTasks} closed`, description: 'Pending, active, paused, or overdue workload requiring follow-up.' },
    overdue: { title: 'Overdue tasks', target: (s) => `${s.overdue8PlusDays} at 8+ days`, description: 'Commitments that exceeded their due date without timely closure.' },
    timeliness: { title: 'Timeliness', target: (s) => `${s.overdueTasks} overdue`, description: 'Delivery discipline against the due date.' },
    audit: { title: 'Audit coverage', target: (s) => `${s.pendingAuditTasks} pending audit`, description: 'Closures reviewed by a manager or responsible auditor.' },
    evidence: { title: 'Complete evidence', target: (s) => `${s.evidenceTasks} with files`, description: 'Document coverage for tasks included in the scope.' },
    productivity: { title: 'Operational health', target: () => 'Target 85/100', description: '30% progress · 25% closure · 20% timeliness · 10% audit · 10% quality · 5% evidence.' },
  },
  compositionTitle: 'Agenda composition', compositionSubtitle: 'Task distribution by status inside the scope.',
  unitsTitle: 'Performance by unit', unitsSubtitle: 'Productivity and timeliness under the same global filter.', productivity: 'Productivity', timeliness: 'Timeliness',
  topsTitle: 'Concentration and attention', topsSubtitle: 'Entities explaining performance and risk in the period.',
  topCompliance: 'Highest compliance', topOverdue: 'Overdue by owner', riskyProcesses: 'Processes requiring attention', riskyProjects: 'Projects requiring attention',
  noData: 'No data in the current scope', tasks: 'tasks', score: 'points',
};

const copies: Record<string, StandardUiCopy> = { es, en };

export function getProcessTaskStandardUiCopy(locale: string): StandardUiCopy {
  return copies[locale.split('-')[0]] ?? en;
}
