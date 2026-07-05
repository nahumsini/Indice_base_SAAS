import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Moon,
  Search,
  Users,
  X,
} from "lucide-react";
import type {
  AttendanceControlAssignment,
  AttendanceRestPlanAssignment,
} from "../../../../api/humanResources";
import { Button } from "../../../../components/ui/button";
import type { AttendanceControlCopy } from "./ControlAttendanceWidgets";

type PlannedRestAssignments = Record<number, Set<string>>;

const toMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const monthDays = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDate = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const offset = firstDate.getDay();
  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
};

const monthLabel = (monthKey: string, locale: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
};

const dateLabel = (dateKey: string, locale: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(new Date(year, month - 1, day));
};

const employeeInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "HR";

const toPayload = (
  assignments: PlannedRestAssignments,
): AttendanceRestPlanAssignment[] =>
  Object.entries(assignments)
    .map(([userCompanyId, dates]) => ({
      user_company_id: Number(userCompanyId),
      dates: Array.from(dates).sort(),
    }))
    .filter((assignment) => assignment.dates.length > 0);

export function RestDayPlannerModal({
  copy,
  locale,
  isOpen,
  isSaving,
  assignments,
  calendarMonth,
  onClose,
  onSave,
}: {
  copy: AttendanceControlCopy;
  locale: string;
  isOpen: boolean;
  isSaving: boolean;
  assignments: AttendanceControlAssignment[];
  calendarMonth: string;
  onClose: () => void;
  onSave: (assignments: AttendanceRestPlanAssignment[]) => Promise<void> | void;
}) {
  const [plannerMonth, setPlannerMonth] = useState(
    calendarMonth || toMonthKey(new Date()),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(
    assignments[0]?.user_company_id ?? null,
  );
  const [draggedEmployeeId, setDraggedEmployeeId] = useState<number | null>(
    null,
  );
  const [plannedAssignments, setPlannedAssignments] =
    useState<PlannedRestAssignments>({});

  const visibleEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return assignments;
    }
    return assignments.filter((assignment) =>
      [
        assignment.user_name,
        assignment.position_title,
        assignment.unit_name,
        assignment.business_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [assignments, searchQuery]);

  const cells = useMemo(() => monthDays(plannerMonth), [plannerMonth]);
  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
          new Date(2026, 1, index + 1),
        ),
      ),
    [locale],
  );
  const payload = useMemo(
    () => toPayload(plannedAssignments),
    [plannedAssignments],
  );
  const operationCount = payload.reduce(
    (total, assignment) => total + assignment.dates.length,
    0,
  );
  const employeeCount = payload.length;

  if (!isOpen) {
    return null;
  }

  const shiftMonth = (direction: -1 | 1) => {
    const [year, month] = plannerMonth.split("-").map(Number);
    const next = new Date(year, month - 1 + direction, 1);
    setPlannerMonth(toMonthKey(next));
  };

  const toggleRestDay = (userCompanyId: number, dateKey: string) => {
    setPlannedAssignments((current) => {
      const next = { ...current };
      const dates = new Set(next[userCompanyId] ?? []);
      if (dates.has(dateKey)) {
        dates.delete(dateKey);
      } else {
        dates.add(dateKey);
      }
      if (dates.size === 0) {
        delete next[userCompanyId];
      } else {
        next[userCompanyId] = dates;
      }
      return next;
    });
  };

  const employeeFor = (userCompanyId: number) =>
    assignments.find(
      (assignment) => assignment.user_company_id === userCompanyId,
    );

  const savePlan = async () => {
    if (payload.length === 0 || isSaving) {
      return;
    }
    await onSave(payload);
    setPlannedAssignments({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/30 dark:bg-slate-950">
        <header className="bg-[#59C3A5] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/18">
                <Moon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/80">
                  {copy.labels.restPlannerEyebrow}
                </p>
                <h2 className="mt-1 text-2xl font-bold">
                  {copy.labels.restPlannerTitle}
                </h2>
                <p className="mt-1 text-sm font-medium text-white/85">
                  {copy.labels.restPlannerDescription}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white transition hover:bg-white/25"
              onClick={onClose}
              aria-label={copy.labels.close}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[1.6fr_0.9fr]">
          <section className="min-h-0 overflow-y-auto p-5">
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-[#59C3A5]/15 bg-[#F4FCF9] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-950 dark:text-white">
                  {copy.labels.restPlannerCalendarTitle}
                </p>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {copy.labels.restPlannerCalendarHint}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => shiftMonth(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[180px] text-center text-sm font-bold capitalize text-slate-950 dark:text-white">
                  {monthLabel(plannerMonth, locale)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => shiftMonth(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {weekdays.map((weekday) => (
                <div
                  key={weekday}
                  className="text-center text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500"
                >
                  {weekday}
                </div>
              ))}
              {cells.map((day, index) => {
                if (day === null) {
                  return (
                    <div key={`empty-${index}`} className="min-h-[108px]" />
                  );
                }
                const dateKey = `${plannerMonth}-${String(day).padStart(2, "0")}`;
                const assignedEmployeeIds = Object.entries(plannedAssignments)
                  .filter(([, dates]) => dates.has(dateKey))
                  .map(([userCompanyId]) => Number(userCompanyId));

                return (
                  <button
                    key={dateKey}
                    type="button"
                    className="min-h-[108px] rounded-xl border border-slate-200 bg-white p-2 text-left shadow-sm transition hover:border-[#59C3A5]/45 hover:bg-[#F4FCF9] dark:border-slate-800 dark:bg-slate-900"
                    onClick={() =>
                      selectedEmployeeId &&
                      toggleRestDay(selectedEmployeeId, dateKey)
                    }
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const rawEmployeeId =
                        event.dataTransfer.getData("text/plain") ||
                        String(draggedEmployeeId ?? "");
                      const employeeId = Number(rawEmployeeId);
                      if (employeeId > 0) {
                        toggleRestDay(employeeId, dateKey);
                      }
                    }}
                  >
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-900 dark:bg-slate-800 dark:text-white">
                      {day}
                    </span>
                    <div className="mt-2 space-y-1">
                      {assignedEmployeeIds.slice(0, 3).map((userCompanyId) => {
                        const employee = employeeFor(userCompanyId);
                        return (
                          <span
                            key={userCompanyId}
                            className="flex items-center justify-between gap-1 rounded-lg bg-[#59C3A5]/12 px-2 py-1 text-[11px] font-bold text-[#237c67]"
                          >
                            <span className="truncate">
                              {employee?.user_name ?? userCompanyId}
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              className="rounded-full p-0.5 hover:bg-white/70"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleRestDay(userCompanyId, dateKey);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </span>
                          </span>
                        );
                      })}
                      {assignedEmployeeIds.length > 3 ? (
                        <span className="block text-[11px] font-bold text-slate-500">
                          +{assignedEmployeeIds.length - 3}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="min-h-0 border-t border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/70 lg:border-l lg:border-t-0">
            <div className="flex h-full min-h-0 flex-col gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#59C3A5]" />
                  <div>
                    <p className="text-sm font-bold text-slate-950 dark:text-white">
                      {copy.labels.restPlannerEmployeesTitle}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      {copy.labels.restPlannerEmployeesHint}
                    </p>
                  </div>
                </div>
                <label className="mt-4 flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={copy.labels.restPlannerSearchPlaceholder}
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                  />
                </label>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {visibleEmployees.map((assignment) => (
                  <button
                    key={assignment.user_company_id}
                    type="button"
                    draggable
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left shadow-sm transition ${
                      selectedEmployeeId === assignment.user_company_id
                        ? "border-[#59C3A5] bg-[#F4FCF9]"
                        : "border-slate-200 bg-white hover:border-[#59C3A5]/40 dark:border-slate-800 dark:bg-slate-950"
                    }`}
                    onClick={() =>
                      setSelectedEmployeeId(assignment.user_company_id)
                    }
                    onDragStart={(event) => {
                      setDraggedEmployeeId(assignment.user_company_id);
                      event.dataTransfer.setData(
                        "text/plain",
                        String(assignment.user_company_id),
                      );
                    }}
                    onDragEnd={() => setDraggedEmployeeId(null)}
                  >
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F2C94C] text-sm font-black text-slate-950">
                      {employeeInitials(assignment.user_name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-950 dark:text-white">
                        {assignment.user_name}
                      </span>
                      <span className="block truncate text-xs font-medium text-slate-500">
                        {assignment.position_title ||
                          assignment.business_name ||
                          assignment.unit_name ||
                          copy.labels.none}
                      </span>
                    </span>
                    <GripVertical className="h-4 w-4 text-slate-300" />
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <footer className="flex flex-col gap-3 bg-[#59C3A5] px-6 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-bold">
            <CalendarDays className="mr-2 inline h-4 w-4" />
            {copy.labels.restPlannerSummary(employeeCount, operationCount)}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/15 hover:text-white"
              onClick={onClose}
            >
              {copy.labels.cancel}
            </Button>
            <Button
              type="button"
              className="bg-white font-bold text-[#237c67] hover:bg-white/90"
              disabled={isSaving || operationCount === 0}
              onClick={() => void savePlan()}
            >
              {isSaving ? copy.labels.saving : copy.labels.restPlannerSave}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
