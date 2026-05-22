import { Info } from 'lucide-react';

interface ControlInsightStripProps {
  message: string;
}

export function ControlInsightStrip({ message }: ControlInsightStripProps) {
  return (
    <div className="rounded-lg border border-[#59C3A5]/15 bg-[#59C3A5]/5 px-4 py-3 dark:border-blue-400/20 dark:bg-blue-400/10">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#59C3A5] dark:text-blue-300" />
        <p className="text-sm leading-relaxed text-[#59C3A5] dark:text-blue-200">
          {message}
        </p>
      </div>
    </div>
  );
}
