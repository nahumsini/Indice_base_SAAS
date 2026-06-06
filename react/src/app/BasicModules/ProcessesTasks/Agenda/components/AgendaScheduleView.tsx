import { type DragEvent as ReactDragEvent } from 'react';
import { Badge } from '../../../../components/ui/badge';
import { cn } from '../../../../components/ui/utils';
import type { AgendaTaskItem } from '../agendaApi';
import type {
  AgendaSchedulePlacement,
  AgendaSchedulePlacements,
  AgendaScheduleViewMode,
  DisplayTaskStatus,
} from '../types';
import type { AgendaTranslations } from '../translations';
import type { TaskPayload } from '../../Tasks/tasksApi';
import { AgendaScheduleTaskCard, type AgendaScheduleTaskCardOptions } from './AgendaScheduleTaskCard';
import { AgendaScheduleToolbar } from './AgendaScheduleToolbar';
import {
  addDays,
  dateInputValueToDate,
  formatScheduleDayLabel,
  formatScheduleWeekRange,
  getWeekDateKeys,
  toDateInputValue,
} from '../utils/agendaDateUtils';
import {
  agendaScheduleHours,
  getTaskScheduleDateKey,
  getTaskScheduleHour,
  normalizeAgendaScheduleHour,
  scheduleCellKey,
} from '../utils/agendaScheduleUtils';
import { compareAgendaText } from '../utils/agendaSorting';

type AgendaScheduleViewProps = {
  agendaSchedulePlacements: AgendaSchedulePlacements;
  copy: AgendaTranslations;
  displayStatusClasses: Record<DisplayTaskStatus, string>;
  isLoading: boolean;
  isTaskPending: (taskId: number) => boolean;
  onCloseTask: (task: AgendaTaskItem) => void;
  onDeleteTask: (task: AgendaTaskItem) => void;
  onEditTask: (task: AgendaTaskItem) => void;
  onOpenAttachments: (task: AgendaTaskItem) => void;
  onPersistTaskChange: (task: AgendaTaskItem, patch: Partial<TaskPayload>) => void | Promise<void>;
  onScheduleDateDrop: (event: ReactDragEvent<HTMLElement>, dateKey: string) => void;
  onScheduleDragEnd: () => void;
  onScheduleDragOver: (event: ReactDragEvent<HTMLElement>) => void;
  onScheduleDrop: (event: ReactDragEvent<HTMLElement>, dateKey: string, hour: string | null) => void;
  onScheduleTaskDragStart: (event: ReactDragEvent<HTMLElement>, taskId: number) => void;
  onScheduleViewModeChange: (mode: AgendaScheduleViewMode) => void;
  onSelectedScheduleDateChange: (dateKey: string) => void;
  onUpdateTaskSchedulePlacement: (taskId: number, dateKey: string, hour: string | null) => void;
  scheduleDraggingTaskId: number | null;
  scheduleViewMode: AgendaScheduleViewMode;
  selectedScheduleDate: string;
  sortedTasks: AgendaTaskItem[];
  todayAgendaValue: string;
};

export function AgendaScheduleView({
  agendaSchedulePlacements,
  copy,
  displayStatusClasses,
  isLoading,
  isTaskPending,
  onCloseTask,
  onDeleteTask,
  onEditTask,
  onOpenAttachments,
  onPersistTaskChange,
  onScheduleDateDrop,
  onScheduleDragEnd,
  onScheduleDragOver,
  onScheduleDrop,
  onScheduleTaskDragStart,
  onScheduleViewModeChange,
  onSelectedScheduleDateChange,
  onUpdateTaskSchedulePlacement,
  scheduleDraggingTaskId,
  scheduleViewMode,
  selectedScheduleDate,
  sortedTasks,
  todayAgendaValue,
}: AgendaScheduleViewProps) {
  const scheduleCopy = copy.schedule;
  const weekDateKeys = getWeekDateKeys(selectedScheduleDate);
  const scheduleDateKeys = scheduleViewMode === 'day' ? [selectedScheduleDate] : weekDateKeys;
  const scheduleDayKeySet = new Set(scheduleDateKeys);
  const todayDateKey = todayAgendaValue;
  const weekRangeLabel = formatScheduleWeekRange(weekDateKeys);
  const taskScheduleMap = new Map<number, AgendaSchedulePlacement>();
  const scheduledTasksByCell = new Map<string, AgendaTaskItem[]>();
  const visibleScheduleTasks: AgendaTaskItem[] = [];

  sortedTasks.forEach((task) => {
    const storedPlacement = agendaSchedulePlacements[String(task.taskId)];
    const backendDate = getTaskScheduleDateKey(task, todayAgendaValue);
    const backendHour = getTaskScheduleHour(task, todayAgendaValue);
    const dateKey = backendDate ?? storedPlacement?.date ?? selectedScheduleDate;
    const hour = backendHour ?? normalizeAgendaScheduleHour(storedPlacement?.hour);

    taskScheduleMap.set(task.taskId, { date: dateKey, hour });

    if (!scheduleDayKeySet.has(dateKey)) {
      return;
    }

    visibleScheduleTasks.push(task);

    if (hour) {
      const cellKey = scheduleCellKey(dateKey, hour);
      const cellTasks = scheduledTasksByCell.get(cellKey) ?? [];
      cellTasks.push(task);
      scheduledTasksByCell.set(cellKey, cellTasks);
    }
  });

  const dayTasks = visibleScheduleTasks.filter(
    (task) => taskScheduleMap.get(task.taskId)?.date === selectedScheduleDate,
  );
  const dayUnscheduledTasks = dayTasks.filter((task) => !taskScheduleMap.get(task.taskId)?.hour);
  const visibleScheduledCount = visibleScheduleTasks.filter((task) =>
    Boolean(taskScheduleMap.get(task.taskId)?.hour),
  ).length;
  const visibleCount = scheduleViewMode === 'day' ? dayTasks.length : visibleScheduleTasks.length;

  const moveScheduleWindow = (direction: -1 | 1) => {
    const offset = scheduleViewMode === 'day' ? direction : direction * 7;
    onSelectedScheduleDateChange(toDateInputValue(addDays(dateInputValueToDate(selectedScheduleDate), offset)));
  };

  const tasksForDate = (dateKey: string) =>
    visibleScheduleTasks
      .filter((task) => taskScheduleMap.get(task.taskId)?.date === dateKey)
      .sort((left, right) =>
        compareAgendaText(
          taskScheduleMap.get(left.taskId)?.hour ?? '99:99',
          taskScheduleMap.get(right.taskId)?.hour ?? '99:99',
        ),
      );

  const tasksForDateAndHour = (dateKey: string, hour: string) =>
    scheduledTasksByCell.get(scheduleCellKey(dateKey, hour)) ?? [];

  const renderScheduleTaskCard = (
    task: AgendaTaskItem,
    options: AgendaScheduleTaskCardOptions = {},
  ) => {
    const schedule = taskScheduleMap.get(task.taskId) ?? {
      date: options.dateKey ?? selectedScheduleDate,
      hour: null,
    };

    return (
      <AgendaScheduleTaskCard
        key={task.taskId}
        copy={copy}
        displayStatusClasses={displayStatusClasses}
        isPending={isTaskPending(task.taskId)}
        onCloseTask={onCloseTask}
        onDeleteTask={onDeleteTask}
        onEditTask={onEditTask}
        onOpenAttachments={onOpenAttachments}
        onPersistTaskChange={onPersistTaskChange}
        onScheduleDragEnd={onScheduleDragEnd}
        onScheduleTaskDragStart={onScheduleTaskDragStart}
        onUpdateTaskSchedulePlacement={onUpdateTaskSchedulePlacement}
        options={options}
        schedule={schedule}
        scheduleDraggingTaskId={scheduleDraggingTaskId}
        selectedScheduleDate={selectedScheduleDate}
        task={task}
      />
    );
  };

  const renderDayView = () => (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div
          className="grid border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400"
          style={{ gridTemplateColumns: '120px minmax(0, 1fr)' }}
        >
          <div className="px-4 py-3">{scheduleCopy.hourColumn}</div>
          <div className="px-4 py-3">{scheduleCopy.planColumn}</div>
        </div>

        {agendaScheduleHours.map((hour) => {
          const hourTasks = tasksForDateAndHour(selectedScheduleDate, hour);

          return (
            <div
              key={hour}
              onDragOver={onScheduleDragOver}
              onDrop={(event) => onScheduleDrop(event, selectedScheduleDate, hour)}
              className="grid min-h-[104px] border-b border-slate-100 transition-colors last:border-b-0 hover:bg-[#F4C84A]/5 dark:border-slate-700 dark:hover:bg-[#F4C84A]/10"
              style={{ gridTemplateColumns: '120px minmax(0, 1fr)' }}
            >
              <div className="border-r border-slate-100 bg-slate-50/60 px-4 py-4 text-sm font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                {hour}
              </div>
              <div className="space-y-3 px-4 py-4">
                {hourTasks.length > 0 ? (
                  hourTasks.map((task) => renderScheduleTaskCard(task, { dateKey: selectedScheduleDate }))
                ) : (
                  <div className="flex h-full min-h-[72px] items-center rounded-lg border border-dashed border-slate-200 px-4 text-sm font-medium text-slate-400 dark:border-slate-700 dark:text-slate-500">
                    {scheduleCopy.dayDropPlaceholder}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <aside
        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        onDragOver={onScheduleDragOver}
        onDrop={(event) => onScheduleDrop(event, selectedScheduleDate, null)}
      >
        <div className="mb-4">
          <h4 className="text-base font-bold text-slate-950 dark:text-white">{scheduleCopy.unscheduledTitle}</h4>
          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">
            {scheduleCopy.unscheduledDescription}
          </p>
        </div>

        <div className="space-y-3">
          {dayUnscheduledTasks.length > 0 ? (
            dayUnscheduledTasks.map((task) => renderScheduleTaskCard(task, { dateKey: selectedScheduleDate, sidebar: true }))
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center text-sm font-medium text-slate-400 dark:border-slate-700 dark:text-slate-500">
              {scheduleCopy.emptyUnscheduled}
            </div>
          )}
        </div>
      </aside>
    </div>
  );

  const renderWeekView = () => (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div
        className="grid min-w-[1120px] border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400"
        style={{ gridTemplateColumns: '84px repeat(7, minmax(148px, 1fr))' }}
      >
        <div className="border-r border-slate-200 px-3 py-3 dark:border-slate-700">{scheduleCopy.hourColumn}</div>
        {weekDateKeys.map((dateKey) => {
          const dateTasks = tasksForDate(dateKey);
          const isToday = dateKey === todayDateKey;

          return (
            <div
              key={dateKey}
              onDragOver={onScheduleDragOver}
              onDrop={(event) => onScheduleDateDrop(event, dateKey)}
              className={cn(
                'border-r border-slate-200 px-3 py-3 last:border-r-0 dark:border-slate-700',
                isToday && 'bg-[#2563EB]/[0.06]',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold capitalize tracking-normal text-slate-950 dark:text-white">
                    {formatScheduleDayLabel(dateKey)}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold normal-case tracking-normal text-slate-500 dark:text-slate-400">
                    {scheduleCopy.tasksCount(dateTasks.length)}
                  </p>
                </div>
                {isToday ? (
                  <span className="shrink-0 rounded-full bg-[#2563EB]/10 px-2 py-0.5 text-[11px] font-bold normal-case tracking-normal text-[#2563EB]">
                    {scheduleCopy.today}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="max-h-[68vh] min-w-[1120px] overflow-auto">
        {agendaScheduleHours.map((hour) => (
          <div
            key={hour}
            className="grid min-h-[118px] border-b border-slate-100 last:border-b-0 dark:border-slate-700"
            style={{ gridTemplateColumns: '84px repeat(7, minmax(148px, 1fr))' }}
          >
            <div className="border-r border-slate-100 bg-slate-50/70 px-3 py-4 text-sm font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
              {hour}
            </div>
            {weekDateKeys.map((dateKey) => {
              const cellTasks = tasksForDateAndHour(dateKey, hour);

              return (
                <div
                  key={`${dateKey}-${hour}`}
                  onDragOver={onScheduleDragOver}
                  onDrop={(event) => onScheduleDrop(event, dateKey, hour)}
                  className="min-h-[118px] space-y-2 border-r border-slate-100 bg-white p-2 transition-colors last:border-r-0 hover:bg-[#F4C84A]/5 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-[#F4C84A]/10"
                >
                  {cellTasks.length > 0 ? (
                    cellTasks.map((task) => renderScheduleTaskCard(task, { compact: true, dateKey }))
                  ) : (
                    <div className="flex h-full min-h-[82px] items-center justify-center rounded-lg border border-dashed border-slate-200 px-2 text-center text-[11px] font-semibold text-slate-300 dark:border-slate-700 dark:text-slate-600">
                      {scheduleCopy.emptySlot}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {visibleScheduleTasks.some((task) => !taskScheduleMap.get(task.taskId)?.hour) ? (
          <div className="grid min-h-[118px]" style={{ gridTemplateColumns: '84px repeat(7, minmax(148px, 1fr))' }}>
            <div className="border-r border-slate-100 bg-slate-50/70 px-3 py-4 text-sm font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
              {scheduleCopy.noHourLabel}
            </div>
            {weekDateKeys.map((dateKey) => {
              const dateTasksWithoutTime = tasksForDate(dateKey).filter(
                (task) => !taskScheduleMap.get(task.taskId)?.hour,
              );

              return (
                <div
                  key={`${dateKey}-unscheduled-time`}
                  onDragOver={onScheduleDragOver}
                  onDrop={(event) => onScheduleDrop(event, dateKey, null)}
                  className="min-h-[118px] space-y-2 border-r border-slate-100 bg-white p-2 transition-colors last:border-r-0 hover:bg-[#F4C84A]/5 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-[#F4C84A]/10"
                >
                  {dateTasksWithoutTime.length > 0 ? (
                    dateTasksWithoutTime.map((task) => renderScheduleTaskCard(task, { compact: true, dateKey }))
                  ) : (
                    <div className="flex h-full min-h-[82px] items-center justify-center rounded-lg border border-dashed border-slate-200 px-2 text-center text-[11px] font-semibold text-slate-300 dark:border-slate-700 dark:text-slate-600">
                      {scheduleCopy.noHourLabel}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );

  const renderListView = () => (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {weekDateKeys.map((dateKey) => {
        const dateTasks = tasksForDate(dateKey);

        return (
          <div
            key={dateKey}
            onDragOver={onScheduleDragOver}
            onDrop={(event) => onScheduleDateDrop(event, dateKey)}
            className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/45"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold capitalize text-slate-950 dark:text-white">
                {formatScheduleDayLabel(dateKey, 'long')}
              </p>
              <Badge
                variant="outline"
                className="rounded-full border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {scheduleCopy.tasksCount(dateTasks.length)}
              </Badge>
            </div>
            <div className="space-y-2">
              {dateTasks.length > 0 ? (
                dateTasks.map((task) => renderScheduleTaskCard(task, { dateKey }))
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
                  {scheduleCopy.emptyListDay}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );

  return (
    <section className="space-y-5">
      <AgendaScheduleToolbar
        onMoveWindow={moveScheduleWindow}
        onScheduleViewModeChange={onScheduleViewModeChange}
        onSelectedScheduleDateChange={onSelectedScheduleDateChange}
        scheduleCopy={scheduleCopy}
        scheduleViewMode={scheduleViewMode}
        selectedScheduleDate={selectedScheduleDate}
        todayAgendaValue={todayAgendaValue}
        visibleCount={visibleCount}
        visibleScheduledCount={visibleScheduledCount}
        weekRangeLabel={weekRangeLabel}
      />

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-16 text-center text-base text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          {copy.kanban.loading}
        </div>
      ) : sortedTasks.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-16 text-center text-base text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          {copy.table.empty}
        </div>
      ) : scheduleViewMode === 'day' ? (
        renderDayView()
      ) : scheduleViewMode === 'week' ? (
        renderWeekView()
      ) : (
        renderListView()
      )}
    </section>
  );
}
