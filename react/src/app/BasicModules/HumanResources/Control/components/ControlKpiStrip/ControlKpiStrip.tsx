import { Activity, AlertTriangle, Clock3, Gauge, LogIn, LogOut, UserX } from 'lucide-react';
import { Skeleton } from '../../../../../components/ui/skeleton';
import { OperationalKpiArea } from '../../../../shared/operational';

interface ControlKpiStripLabels {
  absences: string;
  activeShifts: string;
  checkIns: string;
  checkOuts: string;
  late: string;
  noRecords: string;
  operationRate: string;
  reviewBadge: (count: number) => string;
  statusLabels: { absence: string; late: string; noRecord: string; onTrack: string; other: string };
  summaryInsight: (params: { activeShiftCount: number; checkInsCount: number; operationRate: string; reviewCount: number; totalCount: number }) => string;
}

interface ControlKpiStripProps {
  absencesCount: number; activeShiftCount: number; checkInsCount: number; checkOutsCount: number;
  isLoading: boolean; labels: ControlKpiStripLabels; lateCount: number; noRecordCount: number;
  onTrackCount: number; otherStatusCount: number; totalCount: number;
}

export function ControlKpiStrip(props: ControlKpiStripProps) {
  const { absencesCount, activeShiftCount, checkInsCount, checkOutsCount, isLoading, labels, lateCount, noRecordCount, onTrackCount, otherStatusCount, totalCount } = props;
  const reviewCount = lateCount + noRecordCount + absencesCount;
  const operationRate = totalCount > 0 ? `${Math.round((checkInsCount / totalCount) * 100)}%` : '0%';

  if (isLoading) return <div className="mb-6 space-y-4"><Skeleton className="h-16 w-full rounded-lg" /><Skeleton className="h-2 w-full rounded-full" /><Skeleton className="h-12 w-full rounded-lg" /></div>;

  return (
    <OperationalKpiArea
      className="mb-6"
      metrics={[
        { id: 'in', icon: <LogIn className="h-4 w-4" />, label: labels.checkIns, value: checkInsCount, valueClassName: 'text-emerald-600' },
        { id: 'out', icon: <LogOut className="h-4 w-4" />, label: labels.checkOuts, value: checkOutsCount, valueClassName: 'text-sky-600' },
        { id: 'active', icon: <Activity className="h-4 w-4" />, label: labels.activeShifts, value: activeShiftCount },
        { id: 'missing', icon: <Clock3 className="h-4 w-4" />, label: labels.noRecords, value: noRecordCount, valueClassName: 'text-blue-600' },
        { id: 'late', icon: <AlertTriangle className="h-4 w-4" />, label: labels.late, value: lateCount, valueClassName: 'text-amber-600' },
        { id: 'absence', icon: <UserX className="h-4 w-4" />, label: labels.absences, value: absencesCount, valueClassName: 'text-rose-600' },
      ]}
      alertChips={[
        ...(reviewCount > 0 ? [{ id: 'review', label: labels.reviewBadge(reviewCount), tone: 'warning' as const }] : []),
        { id: 'rate', label: `${operationRate} ${labels.operationRate}`, tone: 'success' },
      ]}
      distributionSegments={[
        { id: 'track', label: labels.statusLabels.onTrack, count: onTrackCount, className: 'bg-emerald-500' },
        { id: 'late', label: labels.statusLabels.late, count: lateCount, className: 'bg-amber-500' },
        { id: 'missing', label: labels.statusLabels.noRecord, count: noRecordCount, className: 'bg-blue-500' },
        { id: 'absence', label: labels.statusLabels.absence, count: absencesCount, className: 'bg-rose-500' },
        { id: 'other', label: labels.statusLabels.other, count: otherStatusCount, className: 'bg-slate-400' },
      ]}
      insight={labels.summaryInsight({ activeShiftCount, checkInsCount, operationRate, reviewCount, totalCount })}
      insightIcon={<Gauge className="h-4 w-4" />}
    />
  );
}

export type { ControlKpiStripLabels };
