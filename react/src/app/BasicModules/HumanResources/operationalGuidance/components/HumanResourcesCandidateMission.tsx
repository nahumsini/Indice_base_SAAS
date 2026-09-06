import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../components/ui/utils';
import {
  employeeLearningRequirementIds,
  isEmployeeLearningRequirementSatisfied,
  type EmployeeLearningExemptibleRequirementId,
  type EmployeeLearningRequirementId,
  type HumanResourcesLearningSignals,
} from '../humanResourcesLearningModel';
import type { HumanResourcesLearningProgress } from '../humanResourcesLearningProgress';

interface HumanResourcesCandidateMissionProps {
  onCreateEmployee?: () => void;
  onEditEmployee?: (employeeId: number) => void;
  onRemoveEmployeeException: (
    employeeId: number,
    requirementId: EmployeeLearningExemptibleRequirementId,
  ) => void;
  onSelectEmployee: (employeeId: number | null) => void;
  onSetEmployeeException: (
    employeeId: number,
    requirementId: EmployeeLearningExemptibleRequirementId,
    reason: string,
  ) => void;
  progress: HumanResourcesLearningProgress;
  signals: HumanResourcesLearningSignals;
}

const requirementLabels: Record<EmployeeLearningRequirementId, string> = {
  identity: 'Identidad',
  contact: 'Contacto',
  organization: 'Puesto, departamento, unidad y negocio',
  compensation: 'Compensación',
  contract: 'Contrato',
  schedule: 'Horario',
  location: 'Ubicación',
  documents: 'Documentos',
  access: 'Acceso o PIN',
};

const exemptibleRequirementIds = new Set<EmployeeLearningRequirementId>([
  'schedule',
  'location',
  'documents',
  'access',
]);

export function HumanResourcesCandidateMission({
  onCreateEmployee,
  onEditEmployee,
  onRemoveEmployeeException,
  onSelectEmployee,
  onSetEmployeeException,
  progress,
  signals,
}: HumanResourcesCandidateMissionProps) {
  const [exceptionTarget, setExceptionTarget] = useState<EmployeeLearningExemptibleRequirementId | null>(null);
  const [reason, setReason] = useState('');
  const selectedCandidate = signals.candidates.find(
    (candidate) => candidate.id === progress.selectedEmployeeId,
  ) ?? null;
  const selectedExceptions = selectedCandidate
    ? progress.employeeExceptions[String(selectedCandidate.id)]
    : undefined;
  const satisfiedCount = selectedCandidate
    ? employeeLearningRequirementIds.filter((requirementId) =>
      isEmployeeLearningRequirementSatisfied(selectedCandidate, requirementId, selectedExceptions),
    ).length
    : 0;

  return (
    <aside className="rounded-xl border border-emerald-200 bg-emerald-50/45 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
      <div className="grid gap-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
            <span aria-hidden="true" className="text-lg leading-none">🎯</span>
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-950 dark:text-white">Primera misión · Configura un colaborador</p>
            <p className="text-xs leading-4 text-slate-600 dark:text-slate-300">
              Elige a alguien real: Índice te mostrará qué está listo y qué falta.
            </p>
          </div>
        </div>

        <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="min-w-0 text-xs text-slate-600 dark:text-slate-300">
            <span className="sr-only">Colaborador para completar</span>
            <select
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              onChange={(event) => onSelectEmployee(event.target.value ? Number(event.target.value) : null)}
              value={selectedCandidate?.id ?? ''}
            >
              <option value="">Continuar un expediente existente</option>
              {signals.candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
              ))}
            </select>
          </label>
          <Button onClick={onCreateEmployee} size="sm" type="button">
            <span aria-hidden="true">➕</span>
            Crear uno nuevo
          </Button>
        </div>
      </div>

      {selectedCandidate ? (
        <details className="group mt-2 rounded-lg border border-emerald-200 bg-white/80 dark:border-emerald-900 dark:bg-slate-950/65">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none marker:content-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:text-slate-200 dark:ring-offset-slate-950">
            <span className="min-w-0 flex-1 truncate font-medium">{selectedCandidate.name}</span>
            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
              {satisfiedCount} de {employeeLearningRequirementIds.length} listos
            </span>
            <span className="hidden shrink-0 text-[11px] text-slate-500 sm:inline dark:text-slate-400"><span aria-hidden="true">🔎 </span>Revisar faltantes</span>
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          <div className="border-t border-emerald-100 p-3 dark:border-emerald-950">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {employeeLearningRequirementIds.map((requirementId) => {
              const exception = selectedExceptions?.[
                requirementId as EmployeeLearningExemptibleRequirementId
              ];
              const isComplete = selectedCandidate.completedRequirementIds.includes(requirementId);
              const isSatisfied = isEmployeeLearningRequirementSatisfied(
                selectedCandidate,
                requirementId,
                selectedExceptions,
              );
              const canMarkNotApplicable = exemptibleRequirementIds.has(requirementId) && !isComplete;

              return (
                <div
                  className={cn(
                    'rounded-lg border px-3 py-2',
                    isSatisfied
                      ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30'
                      : 'border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/25',
                  )}
                  key={requirementId}
                >
                  <div className="flex items-start gap-2">
                    <span aria-hidden="true" className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-[11px] leading-none">
                      {isSatisfied ? '✅' : '🟠'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-100">
                        <span className="sr-only">{isSatisfied ? 'Listo: ' : 'Pendiente: '}</span>
                        {requirementLabels[requirementId]}
                      </p>
                      {exception ? (
                        <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                          No aplica: {exception.reason}
                        </p>
                      ) : null}
                    </div>
                    {canMarkNotApplicable ? (
                      <button
                        className="shrink-0 text-[11px] font-medium text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100"
                        onClick={() => {
                          if (exception) {
                            onRemoveEmployeeException(selectedCandidate.id, requirementId as EmployeeLearningExemptibleRequirementId);
                            return;
                          }
                          setExceptionTarget(requirementId as EmployeeLearningExemptibleRequirementId);
                          setReason('');
                        }}
                        type="button"
                      >
                        {exception ? 'Quitar' : 'No aplica'}
                      </button>
                    ) : null}
                  </div>
                  {exceptionTarget === requirementId ? (
                    <div className="mt-2 space-y-2">
                      <label className="block text-[11px] text-slate-600 dark:text-slate-300">
                        Cuéntanos por qué no aplica
                        <textarea
                          className="mt-1 min-h-16 w-full resize-y rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                          onChange={(event) => setReason(event.target.value)}
                          placeholder="Ej. trabaja de forma remota y no registra asistencia"
                          value={reason}
                        />
                      </label>
                      <div className="flex justify-end gap-2">
                        <Button onClick={() => setExceptionTarget(null)} size="sm" type="button" variant="ghost">
                          Cancelar
                        </Button>
                        <Button
                          disabled={!reason.trim()}
                          onClick={() => {
                            onSetEmployeeException(
                              selectedCandidate.id,
                              requirementId as EmployeeLearningExemptibleRequirementId,
                              reason.trim(),
                            );
                            setExceptionTarget(null);
                            setReason('');
                          }}
                          size="sm"
                          type="button"
                        >
                          Guardar razón
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
            </div>
            <Button
              className="mt-3 w-full sm:w-auto"
              onClick={() => onEditEmployee?.(selectedCandidate.id)}
              size="sm"
              type="button"
              variant="outline"
            >
              <span aria-hidden="true">👉</span>Abrir expediente y completar
            </Button>
          </div>
        </details>
      ) : null}
    </aside>
  );
}
