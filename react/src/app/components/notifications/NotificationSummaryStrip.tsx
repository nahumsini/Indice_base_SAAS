import { AlertTriangle, Bell, CheckCircle2, CircleDot } from 'lucide-react';

interface NotificationSummaryStripProps {
  totalCount: number;
  unreadCount: number;
  urgentCount: number;
  actionableCount: number;
  copy: {
    total: string;
    unread: string;
    urgent: string;
    actionable: string;
    attentionInsight: string;
    calmInsight: string;
  };
}

export function NotificationSummaryStrip({
  totalCount,
  unreadCount,
  urgentCount,
  actionableCount,
  copy,
}: NotificationSummaryStripProps) {
  const metrics = [
    { label: copy.total, value: totalCount, icon: Bell, tone: 'border-[#59C3A5]/30 bg-[#E7F3F2] text-[#147514]' },
    { label: copy.unread, value: unreadCount, icon: CircleDot, tone: 'text-amber-700 bg-amber-50 border-amber-100' },
    { label: copy.urgent, value: urgentCount, icon: AlertTriangle, tone: 'text-red-700 bg-red-50 border-red-100' },
    { label: copy.actionable, value: actionableCount, icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className={`rounded-lg border px-4 py-3 ${metric.tone}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] opacity-75">{metric.label}</p>
                  <p className="mt-1 text-2xl font-bold leading-none">{metric.value}</p>
                </div>
                <div className="rounded-full bg-white/70 p-2 shadow-sm">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
        {urgentCount > 0 ? copy.attentionInsight : copy.calmInsight}
      </div>
    </div>
  );
}
