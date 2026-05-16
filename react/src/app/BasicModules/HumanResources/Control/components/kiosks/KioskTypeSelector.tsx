import { Building2, MapPin, Warehouse } from 'lucide-react';

export type KioskType = 'business_unit' | 'contract_site' | 'head_office';

export interface KioskTypeSelectorProps {
  value: KioskType;
  onChange: (value: KioskType) => void;
}

const kioskTypeOptions: Array<{
  value: KioskType;
  label: string;
  description: string;
  Icon: typeof Building2;
}> = [
  {
    value: 'business_unit',
    label: 'Business or unit',
    description: 'For fixed attendance at a store, branch, warehouse, restaurant, or operational unit.',
    Icon: Building2,
  },
  {
    value: 'contract_site',
    label: 'Temporary work site',
    description: 'For construction, events, external work, or short-term teams.',
    Icon: MapPin,
  },
  {
    value: 'head_office',
    label: 'Main office',
    description: 'For central office attendance registration.',
    Icon: Warehouse,
  },
];

export function KioskTypeSelector({ value, onChange }: KioskTypeSelectorProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {kioskTypeOptions.map(({ value: optionValue, label, description, Icon }) => {
        const isSelected = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            className={`rounded-lg border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#143675]/30 ${
              isSelected
                ? 'border-[#143675] bg-[#143675]/10 text-[#143675] shadow-sm dark:border-[#8bb3ff] dark:bg-[#8bb3ff]/10 dark:text-[#8bb3ff]'
                : 'border-slate-200 bg-white text-slate-700 hover:border-[#143675]/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-[#8bb3ff]/40'
            }`}
            aria-pressed={isSelected}
            onClick={() => onChange(optionValue)}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isSelected
                  ? 'bg-[#143675] text-white dark:bg-[#8bb3ff] dark:text-slate-950'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300'
              }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              {label}
            </span>
            <span className="mt-2 block text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</span>
          </button>
        );
      })}
    </div>
  );
}
