import type { ReactNode } from 'react';
import { Briefcase } from 'lucide-react';
import { FieldGroup } from '../components/FieldGroup';
import { StepHeader } from '../components/StepHeader';

interface JobStepProps {
  title: string;
  description?: string;
  groups: {
    role: string;
    organization: string;
    schedule: string;
    compensation: string;
    contract: string;
  };
  fields: {
    department: ReactNode;
    position: ReactNode;
    businessUnit: ReactNode;
    business: ReactNode;
    hireDate: ReactNode;
    schedule?: ReactNode;
    salaryType: ReactNode;
    workdayHours: ReactNode;
    workdaysPerWeek: ReactNode;
    compensationAmount: ReactNode;
    payPeriod: ReactNode;
    contractType: ReactNode;
    contractDates?: ReactNode;
  };
}

export function JobStep({ title, description, groups, fields }: JobStepProps) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <StepHeader icon={Briefcase} title={title} description={description} />
      <div className="space-y-4">
        <FieldGroup title={groups.role}>
          {fields.department}
          {fields.position}
        </FieldGroup>
        <FieldGroup title={groups.organization}>
          {fields.businessUnit}
          {fields.business}
          {fields.hireDate}
        </FieldGroup>
        {fields.schedule ? (
          <FieldGroup title={groups.schedule}>
            <div className="md:col-span-2">{fields.schedule}</div>
          </FieldGroup>
        ) : null}
        <FieldGroup title={groups.compensation}>
          {fields.salaryType}
          {fields.workdayHours}
          {fields.workdaysPerWeek}
          {fields.compensationAmount}
          {fields.payPeriod}
        </FieldGroup>
        <FieldGroup title={groups.contract}>
          {fields.contractType}
          {fields.contractDates}
        </FieldGroup>
      </div>
    </div>
  );
}
