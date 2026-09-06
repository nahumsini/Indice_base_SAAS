import type { LearningCharacterId } from '../../../learningMode/characters';
import type { HumanResourcesLearningSignals } from './humanResourcesLearningModel';
import type { HumanResourcesGuidanceTabId } from './types';

export const humanResourcesLearningAreaEmoji: Record<HumanResourcesGuidanceTabId, string> = {
  collaborators: '👥',
  control: '⏱️',
  attendance: '📅',
  permissions: '📝',
  payroll: '💰',
  announcements: '📣',
  assets: '🧰',
  records: '📋',
  incentives: '🎁',
  kpis: '📊',
};

export const humanResourcesLearningToolNames: Record<HumanResourcesGuidanceTabId, string> = {
  collaborators: 'Expedientes, filtros, documentos, horario y acceso',
  control: 'Horarios, ubicaciones, kioskos, PIN y métodos de acceso',
  attendance: 'Entradas, salidas, incidencias y evidencia de jornada',
  permissions: 'Solicitudes, cobertura, aprobación y seguimiento',
  payroll: 'Compensación, variables, deducciones y revisión de pago',
  announcements: 'Avisos segmentados, vigencia y audiencia',
  assets: 'Asignaciones, condición, responsables y devoluciones',
  records: 'Actas, acuerdos, incidentes y evidencia',
  incentives: 'Reglas, objetivos, resultados y reconocimientos',
  kpis: 'Indicadores, comparaciones y señales para decidir',
};

export const humanResourcesLearningCharacterLabels: Record<LearningCharacterId, string> = {
  emily: 'Emily · cafeterías',
  juanito: 'Juanito · supermercados',
  camila: 'Camila · negocio familiar',
};

export function getHumanResourcesLearningContextSignal(
  activeTabId: HumanResourcesGuidanceTabId,
  signals: HumanResourcesLearningSignals,
) {
  if (signals.totalEmployeeCount === 0) {
    return 'Tu ruta empieza con una persona real: crea su expediente y úsalo para aprender el flujo completo.';
  }

  if (activeTabId === 'collaborators') {
    const incompleteCoreCount = Math.max(
      signals.missingContactCount,
      signals.missingOrganizationCount,
      signals.missingContractCount,
    );
    return incompleteCoreCount > 0
      ? `${incompleteCoreCount} expedientes todavía tienen datos clave pendientes. Completar uno es un buen primer ejercicio.`
      : `Ya tienes ${signals.activeEmployeeCount} expedientes base listos. El siguiente paso es revisar horarios y accesos.`;
  }
  if (activeTabId === 'control') {
    if (signals.missingScheduleCount > 0 || signals.missingAccessCount > 0) {
      return `${signals.missingScheduleCount} personas no tienen horario y ${signals.missingAccessCount} no tienen acceso activo. Aquí puedes prepararlos.`;
    }
  }
  if (activeTabId === 'attendance' && signals.missingScheduleCount > 0) {
    return `${signals.missingScheduleCount} personas no tienen horario; su asistencia podría leerse fuera de contexto.`;
  }
  if (activeTabId === 'payroll' && signals.missingCompensationCount > 0) {
    return `${signals.missingCompensationCount} personas activas aún no tienen su compensación completa. Revísala antes de preparar pagos.`;
  }

  return `Tienes ${signals.activeEmployeeCount} personas activas. Explora este paso y úsalo cuando aparezca una situación real.`;
}
