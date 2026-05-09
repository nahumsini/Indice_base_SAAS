interface ControlOperationBarProps {
  absencesCount: number;
  labels: {
    absence: string;
    late: string;
    noRecord: string;
    onTrack: string;
    other: string;
  };
  lateCount: number;
  noRecordCount: number;
  onTrackCount: number;
  otherCount: number;
}

const getSegmentWidth = (count: number, total: number) => {
  if (total <= 0 || count <= 0) {
    return '0%';
  }

  return `${(count / total) * 100}%`;
};

export function ControlOperationBar({
  absencesCount,
  labels,
  lateCount,
  noRecordCount,
  onTrackCount,
  otherCount,
}: ControlOperationBarProps) {
  const totalCount = onTrackCount + lateCount + noRecordCount + absencesCount + otherCount;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className="flex h-full">
          <div
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: getSegmentWidth(onTrackCount, totalCount) }}
          />
          <div
            className="bg-amber-500 transition-all duration-300"
            style={{ width: getSegmentWidth(lateCount, totalCount) }}
          />
          <div
            className="bg-blue-500 transition-all duration-300"
            style={{ width: getSegmentWidth(noRecordCount, totalCount) }}
          />
          <div
            className="bg-rose-500 transition-all duration-300"
            style={{ width: getSegmentWidth(absencesCount, totalCount) }}
          />
          <div
            className="bg-slate-300 transition-all duration-300 dark:bg-slate-500"
            style={{ width: getSegmentWidth(otherCount, totalCount) }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {labels.onTrack}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          {labels.late}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          {labels.noRecord}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          {labels.absence}
        </span>
        {otherCount > 0 ? (
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-500" />
            {labels.other}
          </span>
        ) : null}
      </div>
    </div>
  );
}
