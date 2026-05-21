import { Building2, Globe2, MapPin, Warehouse, type LucideIcon } from 'lucide-react';
import type { ControlTranslations } from '../../translations';

export type KioskType = 'business_unit' | 'contract_site' | 'head_office' | 'open_attendance';

export interface KioskTypeSelectorProps {
  copy: ControlTranslations;
  value: KioskType;
  onChange: (value: KioskType) => void;
}

const kioskTypeIcons: Record<KioskType, LucideIcon> = {
  business_unit: Building2,
  contract_site: MapPin,
  head_office: Warehouse,
  open_attendance: Globe2,
};

export function KioskTypeSelector({ copy, value, onChange }: KioskTypeSelectorProps) {
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
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {kioskTypeOptions.map(({ value: optionValue, label, description, Icon }) => {
        const isSelected = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            className={`rounded-lg border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#59C3A5]/30 ${
              isSelected
                ? 'border-[#59C3A5] bg-[#59C3A5]/10 text-[#59C3A5] shadow-sm dark:border-[#8FE0CA] dark:bg-[#8FE0CA]/10 dark:text-[#8FE0CA]'
                : 'border-slate-200 bg-white text-slate-700 hover:border-[#59C3A5]/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-[#8FE0CA]/40'
            }`}
            aria-pressed={isSelected}
            onClick={() => onChange(optionValue)}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                isSelected
                  ? 'bg-[#59C3A5] text-white dark:bg-[#8FE0CA] dark:text-slate-950'
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
