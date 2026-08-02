import { Building2, Globe2, MapPin, Warehouse, type LucideIcon } from 'lucide-react';
import type { ControlTranslations } from '../../translations';

export type KioskType = 'business_unit' | 'contract_site' | 'head_office' | 'open_attendance';

export interface KioskTypeSelectorProps {
  copy: ControlTranslations;
  value: KioskType;
  allowedTypes?: readonly KioskType[];
  onChange: (value: KioskType) => void;
}

const kioskTypeIcons: Record<KioskType, LucideIcon> = {
  business_unit: Building2,
  contract_site: MapPin,
  head_office: Warehouse,
  open_attendance: Globe2,
};

export function KioskTypeSelector({ copy, value, allowedTypes, onChange }: KioskTypeSelectorProps) {
  const allowedTypeSet = allowedTypes ? new Set(allowedTypes) : null;
  const kioskTypeOptions = [
    {
      value: 'business_unit' as const,
      label: copy.kiosk.types.businessUnit.label,
      description: copy.kiosk.types.businessUnit.description,
      Icon: kioskTypeIcons.business_unit,
    },
    {
      value: 'contract_site' as const,
      label: copy.kiosk.types.contractSite.label,
      description: copy.kiosk.types.contractSite.description,
      Icon: kioskTypeIcons.contract_site,
    },
    {
      value: 'head_office' as const,
      label: copy.kiosk.types.headOffice.label,
      description: copy.kiosk.types.headOffice.description,
      Icon: kioskTypeIcons.head_office,
    },
    {
      value: 'open_attendance' as const,
      label: copy.kiosk.types.openAttendance.label,
      description: copy.kiosk.types.openAttendance.description,
      Icon: kioskTypeIcons.open_attendance,
    },
  ].filter((option) => !allowedTypeSet || allowedTypeSet.has(option.value));

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {kioskTypeOptions.map(({ value: optionValue, label, description, Icon }) => {
        const isSelected = value === optionValue;
        return (
          <label
            key={optionValue}
            className={`rounded-lg border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-[#59C3A5]/30 ${
              isSelected
                ? 'border-[#59C3A5] bg-[#59C3A5]/10 text-[#59C3A5] shadow-sm dark:border-[#8FE0CA] dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA]'
                : 'border-slate-200 bg-white text-slate-700 hover:border-[#59C3A5]/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-[#8FE0CA]/40'
            }`}
            aria-checked={isSelected}
          >
            <input
              type="radio"
              name="attendance-kiosk-type"
              value={optionValue}
              checked={isSelected}
              className="sr-only"
              onChange={() => onChange(optionValue)}
            />
            <span className="flex items-start justify-between gap-3 text-sm font-medium">
              <span className="flex min-w-0 items-center gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  isSelected
                    ? 'bg-[#59C3A5] text-slate-950 dark:bg-[#8FE0CA] dark:text-slate-950'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300'
                }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span>{label}</span>
              </span>
              <span
                className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  isSelected
                    ? 'border-[#59C3A5] bg-white dark:border-[#8FE0CA] dark:bg-slate-950'
                    : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950'
                }`}
                aria-hidden="true"
              >
                <span className={`h-2 w-2 rounded-full ${isSelected ? 'bg-[#59C3A5] dark:bg-[#8FE0CA]' : 'bg-transparent'}`} />
              </span>
            </span>
            <span className="mt-2 block text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</span>
          </label>
        );
      })}
    </div>
  );
}
