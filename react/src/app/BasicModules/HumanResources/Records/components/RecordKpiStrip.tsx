import { AlertTriangle, CheckCircle2, Clock3, Eye, FileText, SearchCheck } from 'lucide-react';
import { OperationalKpiArea } from '../../../shared/operational';
import type { RecordKpiCopy } from '../translations';

interface RecordKpiStripProps {
  copy: RecordKpiCopy;
  highSeverityCount: number;
  pendingCount: number;
  resolvedCount: number;
  reviewedCount: number;
  totalCount: number;
  visibleCount: number;
}

export function RecordKpiStrip(props: RecordKpiStripProps) {
  const { copy, highSeverityCount, pendingCount, resolvedCount, reviewedCount, totalCount, visibleCount } = props;

  return (
    <OperationalKpiArea
      metrics={[
        { id: 'total', icon: <FileText className="h-4 w-4" />, label: copy.total, value: totalCount },
        { id: 'pending', icon: <Clock3 className="h-4 w-4" />, label: copy.pending, value: pendingCount, valueClassName: 'text-amber-600' },
        { id: 'reviewed', icon: <SearchCheck className="h-4 w-4" />, label: copy.reviewed, value: reviewedCount, valueClassName: 'text-blue-600' },
        { id: 'resolved', icon: <CheckCircle2 className="h-4 w-4" />, label: copy.resolved, value: resolvedCount, valueClassName: 'text-emerald-600' },
        { id: 'severity', icon: <AlertTriangle className="h-4 w-4" />, label: copy.highSeverity, value: highSeverityCount, valueClassName: 'text-rose-600' },
        { id: 'visible', icon: <Eye className="h-4 w-4" />, label: copy.visibleAfterFilters, value: visibleCount },
      ]}
      distributionSegments={[
        { id: 'pending', label: copy.pending, count: pendingCount, className: 'bg-amber-500' },
        { id: 'reviewed', label: copy.reviewed, count: reviewedCount, className: 'bg-blue-500' },
        { id: 'resolved', label: copy.resolved, count: resolvedCount, className: 'bg-emerald-500' },
      ]}
      insight={copy.summary(pendingCount, reviewedCount, resolvedCount, highSeverityCount, visibleCount, totalCount)}
      insightIcon={<FileText className="h-4 w-4" />}
    />
  );
}
