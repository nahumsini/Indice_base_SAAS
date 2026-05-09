import type { ReactNode } from 'react';
import { User } from 'lucide-react';
import { FieldGroup } from '../components/FieldGroup';
import { StepHeader } from '../components/StepHeader';

interface BasicInfoStepProps {
  title: string;
  description?: string;
  groups: {
    identity: string;
    account: string;
  };
  fields: {
    firstName: ReactNode;
    lastName: ReactNode;
    email: ReactNode;
  };
}

export function BasicInfoStep({ title, description, groups, fields }: BasicInfoStepProps) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <StepHeader icon={User} title={title} description={description} />
      <div className="space-y-4">
        <FieldGroup title={groups.identity}>
          {fields.firstName}
          {fields.lastName}
        </FieldGroup>
        <FieldGroup title={groups.account}>
          <div className="md:col-span-2">{fields.email}</div>
        </FieldGroup>
      </div>
    </div>
  );
}
