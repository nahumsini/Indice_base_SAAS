import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';
import { StepHeader } from '../components/StepHeader';

interface DocumentsStepProps {
  title: string;
  description?: string;
  documents: ReactNode;
}

export function DocumentsStep({ title, description, documents }: DocumentsStepProps) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <StepHeader icon={FileText} title={title} description={description} />
      <div className="space-y-4">{documents}</div>
    </div>
  );
}
