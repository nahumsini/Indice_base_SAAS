import {
  AlertTriangle,
  ClipboardCheck,
  DollarSign,
  Package,
  Receipt,
  RotateCcw,
  ShoppingCart,
  User,
} from 'lucide-react';

export type OperationalActivityType =
  | 'sale'
  | 'shift'
  | 'stock'
  | 'customer'
  | 'cash'
  | 'purchaseOrder'
  | 'return'
  | 'invoice';

export interface OperationalActivity {
  id: string;
  type: OperationalActivityType;
  title: string;
  description: string;
  timestamp: Date;
  actor: string;
  badge?: string;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

const activityIcons = {
  sale: ShoppingCart,
  shift: User,
  stock: Package,
  customer: User,
  cash: DollarSign,
  purchaseOrder: ClipboardCheck,
  return: RotateCcw,
  invoice: Receipt,
} as const;

const toneClasses = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
  danger: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
  info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  neutral: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
} as const;

function formatRelativeTime(date: Date) {
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));

  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.round(minutes / 60);
  return `${hours}h`;
}

function getInitials(actor: string) {
  return actor
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function OperationalActivityFeed({ activities }: { activities: OperationalActivity[] }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Bitacora operativa</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Eventos que explican la caja</p>
        </div>
        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          Controlada
        </span>
      </div>

      <div className="max-h-72 overflow-y-auto px-4 py-3">
        <div className="space-y-3">
          {activities.slice(0, 8).map((activity, index) => {
            const Icon = activityIcons[activity.type] ?? AlertTriangle;

            return (
              <div key={activity.id} className="relative flex gap-3">
                {index < activities.length - 1 && (
                  <div className="absolute left-4 top-9 h-[calc(100%-1rem)] w-px bg-gray-200 dark:bg-gray-700" />
                )}

                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 ring-4 ring-white dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-800">
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1 rounded-lg border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-700 dark:bg-gray-900/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{activity.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{activity.description}</p>
                    </div>

                    {activity.badge && (
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${toneClasses[activity.tone]}`}>
                        {activity.badge}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {getInitials(activity.actor)}
                    </span>
                    <span>{activity.actor}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(activity.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
