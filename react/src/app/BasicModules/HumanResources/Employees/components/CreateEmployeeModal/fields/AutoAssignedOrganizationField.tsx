import { cn } from '../../../../../../components/ui/utils';
import { HelperText } from '../components/HelperText';
import { modalControlClassName, modalLabelClassName } from '../styles';

interface AutoAssignedOrganizationFieldProps {
  badge: string;
  displayValue: string;
  helperText: string;
  label: string;
  name: string;
  value: string;
}

export function AutoAssignedOrganizationField({
  badge,
  displayValue,
  helperText,
  label,
  name,
  value,
}: AutoAssignedOrganizationFieldProps) {
  return (
    <div>
      <label className={modalLabelClassName}>{label}</label>
      <input type="hidden" name={name} value={value} />
      <div
        className={cn(
          modalControlClassName,
          'flex h-auto min-h-11 items-center justify-between gap-3 bg-[#59C3A5]/5 text-left text-[#59C3A5] dark:bg-blue-400/10 dark:text-blue-100',
        )}
      >
        <span className="min-w-0">
          <span className="block truncate">{displayValue}</span>
          <span className="mt-0.5 block truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            {helperText}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-[#59C3A5]/10 px-2.5 py-1 text-[10px] font-bold uppercase text-[#59C3A5] ring-1 ring-[#59C3A5]/15 dark:bg-blue-400/15 dark:text-blue-200 dark:ring-blue-300/20">
          {badge}
        </span>
      </div>
      <HelperText>{helperText}</HelperText>
    </div>
  );
}
