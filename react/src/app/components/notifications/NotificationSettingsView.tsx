import { useMemo, useState } from 'react';
import { BellRing, Info, Settings2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import {
  notificationPreferenceGroups,
  type NotificationPreferenceItem,
  type NotificationPriority,
} from './notificationCatalog';
import type { NotificationCenterCopy } from './notificationCenterCopy';

interface NotificationSettingsViewProps {
  copy: NotificationCenterCopy;
}

const priorityTone: Record<NotificationPriority, string> = {
  high: 'border-red-200 bg-red-50 text-red-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export function NotificationSettingsView({ copy }: NotificationSettingsViewProps) {
  const defaultState = useMemo(() => {
    return Object.fromEntries(
      notificationPreferenceGroups.flatMap((group) => (
        group.items.map((item) => [preferenceKey(group.module.slug, item.eventType), item.defaultEnabled])
      )),
    );
  }, []);
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(defaultState);
  const [quietMode, setQuietMode] = useState(false);

  const enabledCount = Object.values(enabledMap).filter(Boolean).length;
  const totalCount = Object.keys(enabledMap).length;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{copy.settingsSummary}</p>
            <p className="mt-1 text-blue-700">{copy.settingsSummaryDescription} {copy.noPersistence}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-gray-900 p-2 text-white">
              <Settings2 className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-gray-950">{copy.quietMode}</p>
              <p className="text-sm text-gray-600">{copy.quietModeDescription}</p>
            </div>
          </div>
          <Switch checked={quietMode} onCheckedChange={setQuietMode} aria-label={copy.quietMode} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-950">{copy.preferencesTitle}</h3>
          <p className="text-sm text-gray-600">{copy.preferencesSubtitle}</p>
        </div>
        <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-700">
          {enabledCount}/{totalCount} {copy.enabled}
        </Badge>
      </div>

      <div className="grid gap-4">
        {notificationPreferenceGroups.map((group) => (
          <section key={group.module.slug} className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-950 text-white">
                  <BellRing className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-gray-950">{group.module.label}</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                    {group.module.shortLabel}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="border-gray-200">
                {group.items.filter((item) => enabledMap[preferenceKey(group.module.slug, item.eventType)]).length}
                /{group.items.length}
              </Badge>
            </div>
            <div className="divide-y divide-gray-100">
              {group.items.map((item) => (
                <PreferenceRow
                  key={item.eventType}
                  item={item}
                  checked={enabledMap[preferenceKey(group.module.slug, item.eventType)]}
                  copy={copy}
                  onCheckedChange={(checked) => {
                    setEnabledMap((current) => ({
                      ...current,
                      [preferenceKey(group.module.slug, item.eventType)]: checked,
                    }));
                  }}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function PreferenceRow({
  item,
  checked,
  copy,
  onCheckedChange,
}: {
  item: NotificationPreferenceItem;
  checked: boolean;
  copy: NotificationCenterCopy;
  onCheckedChange: (checked: boolean) => void;
}) {
  const priorityLabel = item.priority === 'high'
    ? copy.highPriority
    : item.priority === 'medium'
      ? copy.mediumPriority
      : copy.lowPriority;

  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-gray-900">{item.label}</p>
          <Badge variant="outline" className={priorityTone[item.priority]}>{priorityLabel}</Badge>
        </div>
        <p className="mt-1 text-sm text-gray-600">{item.description}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
          <span className="rounded-full bg-gray-100 px-2 py-1">{copy.channelSystem}</span>
          <span className="rounded-full bg-gray-100 px-2 py-1">{copy.frequencyImmediate}</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className={`text-sm font-semibold ${checked ? 'text-emerald-700' : 'text-gray-500'}`}>
          {checked ? copy.enabled : copy.disabled}
        </span>
        <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={item.label} />
      </div>
    </div>
  );
}

function preferenceKey(moduleSlug: string, eventType: string) {
  return `${moduleSlug}:${eventType}`;
}
