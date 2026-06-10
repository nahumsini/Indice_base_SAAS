import { useState } from 'react';
import { AlertTriangle, Archive, ChevronDown, ChevronUp, Flame, Package, TrendingUp } from 'lucide-react';

export type SmartAlertCategory = 'Control' | 'Risk' | 'Opportunity' | 'Action';

export interface SmartAlert {
  id: string;
  category: SmartAlertCategory;
  title: string;
  description: string;
  tone: 'critical' | 'warning' | 'success' | 'info' | 'hot';
  actionLabel?: string;
  onAction?: () => void;
}

const toneStyles = {
  critical: {
    shell: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
    icon: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    text: 'text-red-900 dark:text-red-100',
  },
  warning: {
    shell: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20',
    icon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    text: 'text-amber-900 dark:text-amber-100',
  },
  success: {
    shell: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20',
    icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    text: 'text-emerald-900 dark:text-emerald-100',
  },
  info: {
    shell: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
    icon: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    text: 'text-blue-900 dark:text-blue-100',
  },
  hot: {
    shell: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20',
    icon: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    text: 'text-orange-900 dark:text-orange-100',
  },
} as const;

const categoryStyles: Record<SmartAlertCategory, string> = {
  Control: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Risk: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  Opportunity: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Action: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

const categoryLabels: Record<SmartAlertCategory, string> = {
  Control: 'Control',
  Risk: 'Riesgo',
  Opportunity: 'Oportunidad',
  Action: 'Accion',
};

const toneIcons = {
  critical: AlertTriangle,
  warning: Package,
  success: TrendingUp,
  info: Archive,
  hot: Flame,
} as const;

export function SmartAlertsStrip({ alerts }: { alerts: SmartAlert[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <button
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-gray-900 dark:text-white">Alertas inteligentes</span>
            <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
              {alerts.length} señales activas para revisar
            </span>
          </span>
        </span>
        {isOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
      </button>

      {isOpen && (
        <div className="overflow-x-auto border-t border-gray-200 p-3 dark:border-gray-700">
          <div className="flex min-w-max gap-3">
            {alerts.map((alert) => {
              const styles = toneStyles[alert.tone];
              const Icon = toneIcons[alert.tone];

              return (
                <button
                  key={alert.id}
                  type="button"
                  onClick={alert.onAction}
                  className={`flex w-[300px] items-start gap-3 rounded-lg border px-4 py-3 text-left shadow-sm transition hover:shadow-md ${styles.shell}`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`mb-1 inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${categoryStyles[alert.category]}`}>
                      {categoryLabels[alert.category]}
                    </span>
                    <span className={`block truncate text-sm font-semibold ${styles.text}`}>{alert.title}</span>
                    <span className="mt-0.5 block text-xs text-gray-600 dark:text-gray-300">{alert.description}</span>
                    {alert.actionLabel && (
                      <span className="mt-2 inline-flex text-xs font-semibold text-gray-900 underline-offset-2 hover:underline dark:text-white">
                        {alert.actionLabel}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
