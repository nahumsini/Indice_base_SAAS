import type { ReactNode } from 'react';
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Skeleton } from '../../../../components/ui/skeleton';

export function KpiSkeleton({ view = 'overview' }: { view?: string }) {
  return (
    <div className="space-y-6" aria-busy="true">
      {view === 'overview' ? <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-lg" />
        ))}
      </div>
      </> : <Skeleton className="h-96 rounded-2xl" />}
    </div>
  );
}

export function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <label id={`${id}-label`} className="block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          aria-labelledby={`${id}-label`}
          className="h-11 w-full min-w-0 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none focus:border-[#F4C84A] focus:ring-[#F4C84A]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}
