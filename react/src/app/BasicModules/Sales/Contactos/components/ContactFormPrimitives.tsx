import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../../components/ui/utils';

export function ContactFormField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</label>
      {children}
    </div>
  );
}

export function ContactFormSection({
  icon: Icon,
  title,
  description,
  tone = 'neutral',
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: 'neutral' | 'coral';
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-lg border bg-white p-5 shadow-sm',
        tone === 'coral' ? 'border-[#FF6B5E]/20 bg-[#FF6B5E]/[0.04]' : 'border-slate-200',
      )}
    >
      <div className="mb-5 flex items-start gap-3">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
            tone === 'coral'
              ? 'border-[#FF6B5E]/20 bg-white text-[#B63B32]'
              : 'border-[#FF6B5E]/20 bg-[#FF6B5E]/10 text-[#B63B32]',
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
