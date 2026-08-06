import { BadgeDollarSign, CheckCircle2, Clock3, Eye, FileCheck2, WalletCards, XCircle } from 'lucide-react';
import { OperationalKpiArea } from '../../../shared/operational';
import type { PermissionsTranslations } from '../translations';

interface PermissionKpiStripProps {
  approved: number;
  copy: PermissionsTranslations;
  paid: number;
  pending: number;
  rejected: number;
  total: number;
  unpaid: number;
  visible: number;
}

export function PermissionKpiStrip({ approved, copy, paid, pending, rejected, total, unpaid, visible }: PermissionKpiStripProps) {
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  return (
    <OperationalKpiArea
      metrics={[
        { id: 'total', icon: <FileCheck2 className="h-4 w-4" />, label: copy.kpis.total, value: total },
        { id: 'pending', icon: <Clock3 className="h-4 w-4" />, label: copy.kpis.pending, value: pending, valueClassName: 'text-amber-600' },
        { id: 'approved', icon: <CheckCircle2 className="h-4 w-4" />, label: copy.kpis.approved, value: approved, valueClassName: 'text-emerald-600' },
        { id: 'rejected', icon: <XCircle className="h-4 w-4" />, label: copy.kpis.rejected, value: rejected, valueClassName: 'text-rose-600' },
        { id: 'visible', icon: <Eye className="h-4 w-4" />, label: copy.kpis.visibleAfterFilters, value: visible },
      ]}
      alertChips={[
        { id: 'rate', label: copy.kpis.approvalRate(approvalRate), tone: 'info' },
        { id: 'paid', icon: <BadgeDollarSign className="h-4 w-4" />, label: `${paid} ${copy.kpis.paid}`, tone: 'success' },
        { id: 'unpaid', icon: <WalletCards className="h-4 w-4" />, label: `${unpaid} ${copy.kpis.unpaid}`, tone: 'warning' },
      ]}
      distributionSegments={[
        { id: 'approved', label: copy.kpis.approved, count: approved, className: 'bg-emerald-500' },
        { id: 'pending', label: copy.kpis.pending, count: pending, className: 'bg-amber-500' },
        { id: 'rejected', label: copy.kpis.rejected, count: rejected, className: 'bg-rose-500' },
      ]}
      insight={copy.kpis.summary(approved, pending, rejected, visible, total)}
      insightIcon={<FileCheck2 className="h-4 w-4" />}
    />
  );
}
