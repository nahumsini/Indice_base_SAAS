import { type Dispatch, type SetStateAction, useCallback, useMemo } from 'react';
import type { AttendanceControlAssignment } from '../../../../api/humanResources';
import { isScheduleAssignable } from '../utils/scheduleValidation';

interface UseScheduleEmployeeSelectionOptions {
  candidateAssignments: AttendanceControlAssignment[];
  paginatedAssignments: AttendanceControlAssignment[];
  selectedEmployeeAssignments: Record<number, AttendanceControlAssignment>;
  selectedEmployeeIds: number[];
  setSelectedEmployeeAssignments: Dispatch<SetStateAction<Record<number, AttendanceControlAssignment>>>;
  setSelectedEmployeeIds: Dispatch<SetStateAction<number[]>>;
}

export function useScheduleEmployeeSelection({
  candidateAssignments,
  paginatedAssignments,
  selectedEmployeeAssignments,
  selectedEmployeeIds,
  setSelectedEmployeeAssignments,
  setSelectedEmployeeIds,
}: UseScheduleEmployeeSelectionOptions) {
  const visibleAssignableEmployeeIds = useMemo(
    () => paginatedAssignments.map((assignment) => assignment.user_company_id),
    [paginatedAssignments],
  );
  const allVisibleSelected = visibleAssignableEmployeeIds.length > 0
    && visibleAssignableEmployeeIds.every((employeeId) => selectedEmployeeIds.includes(employeeId));
  const assignmentByEmployeeId = useMemo(
    () => new Map(candidateAssignments.map((assignment) => [assignment.user_company_id, assignment] as const)),
    [candidateAssignments],
  );
  const selectedAssignments = useMemo(
    () => selectedEmployeeIds
      .map((employeeId) => selectedEmployeeAssignments[employeeId] ?? assignmentByEmployeeId.get(employeeId))
      .filter((assignment): assignment is AttendanceControlAssignment => Boolean(assignment)),
    [assignmentByEmployeeId, selectedEmployeeAssignments, selectedEmployeeIds],
  );
  const selectedLockedAssignments = useMemo(
    () => selectedAssignments.filter((assignment) => !isScheduleAssignable(assignment)),
    [selectedAssignments],
  );

  const rememberSelectedAssignments = useCallback((assignments: AttendanceControlAssignment[]) => {
    if (assignments.length === 0) {
      return;
    }

    setSelectedEmployeeAssignments((current) => {
      const next = { ...current };
      assignments.forEach((assignment) => {
        next[assignment.user_company_id] = assignment;
      });
      return next;
    });
  }, [setSelectedEmployeeAssignments]);

  const forgetSelectedAssignments = useCallback((employeeIds: number[]) => {
    if (employeeIds.length === 0) {
      return;
    }

    setSelectedEmployeeAssignments((current) => {
      const next = { ...current };
      employeeIds.forEach((employeeId) => {
        delete next[employeeId];
      });
      return next;
    });
  }, [setSelectedEmployeeAssignments]);

  const toggleEmployee = useCallback((employeeId: number) => {
    const isSelected = selectedEmployeeIds.includes(employeeId);
    const assignment = assignmentByEmployeeId.get(employeeId);
    if (isSelected) {
      forgetSelectedAssignments([employeeId]);
    } else if (assignment) {
      rememberSelectedAssignments([assignment]);
    }

    setSelectedEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId],
    );
  }, [
    assignmentByEmployeeId,
    forgetSelectedAssignments,
    rememberSelectedAssignments,
    selectedEmployeeIds,
    setSelectedEmployeeIds,
  ]);

  const setEmployeeSelection = useCallback((employeeId: number, shouldSelect: boolean) => {
    if (shouldSelect) {
      const assignment = assignmentByEmployeeId.get(employeeId);
      if (assignment) {
        rememberSelectedAssignments([assignment]);
      }
    } else {
      forgetSelectedAssignments([employeeId]);
    }

    setSelectedEmployeeIds((current) => {
      const isSelected = current.includes(employeeId);
      if (shouldSelect && !isSelected) {
        return [...current, employeeId];
      }
      if (!shouldSelect && isSelected) {
        return current.filter((id) => id !== employeeId);
      }
      return current;
    });
  }, [
    assignmentByEmployeeId,
    forgetSelectedAssignments,
    rememberSelectedAssignments,
    setSelectedEmployeeIds,
  ]);

  const toggleAll = useCallback(() => {
    if (allVisibleSelected) {
      forgetSelectedAssignments(visibleAssignableEmployeeIds);
      setSelectedEmployeeIds((current) => current.filter((id) => !visibleAssignableEmployeeIds.includes(id)));
      return;
    }

    rememberSelectedAssignments(
      paginatedAssignments.filter((assignment) => visibleAssignableEmployeeIds.includes(assignment.user_company_id)),
    );
    setSelectedEmployeeIds((current) => Array.from(new Set([...current, ...visibleAssignableEmployeeIds])));
  }, [
    allVisibleSelected,
    forgetSelectedAssignments,
    paginatedAssignments,
    rememberSelectedAssignments,
    setSelectedEmployeeIds,
    visibleAssignableEmployeeIds,
  ]);

  return {
    allVisibleSelected,
    selectedAssignments,
    selectedLockedAssignments,
    setEmployeeSelection,
    toggleAll,
    toggleEmployee,
    visibleAssignableEmployeeIds,
  };
}
