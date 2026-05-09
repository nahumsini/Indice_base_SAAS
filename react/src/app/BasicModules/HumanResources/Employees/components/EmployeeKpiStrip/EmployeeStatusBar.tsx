interface EmployeeStatusBarProps {
  activeCount: number;
  inactiveCount: number;
  terminatedCount: number;
  labels: {
    active: string;
    inactive: string;
    terminated: string;
  };
}

const getSegmentWidth = (count: number, total: number) => {
  if (total <= 0 || count <= 0) {
    return '0%';
  }

  return `${(count / total) * 100}%`;
};

export function EmployeeStatusBar({
  activeCount,
  inactiveCount,
  labels,
  terminatedCount,
}: EmployeeStatusBarProps) {
  const totalCount = activeCount + inactiveCount + terminatedCount;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className="flex h-full">
          <div
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: getSegmentWidth(activeCount, totalCount) }}
          />
          <div
            className="bg-amber-500 transition-all duration-300"
            style={{ width: getSegmentWidth(inactiveCount, totalCount) }}
          />
          <div
            className="bg-rose-500 transition-all duration-300"
            style={{ width: getSegmentWidth(terminatedCount, totalCount) }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {labels.active}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          {labels.inactive}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          {labels.terminated}
        </span>
      </div>
    </div>
  );
}

