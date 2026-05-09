import type { ReactNode } from 'react';
import { Phone } from 'lucide-react';
import { FieldGroup } from '../components/FieldGroup';
import { StepHeader } from '../components/StepHeader';

interface ContactStepProps {
  title: string;
  description?: string;
  groups: {
    location: string;
    phones: string;
    identifiers: string;
  };
  fields: {
    location: ReactNode;
    address: ReactNode;
    dateOfBirth: ReactNode;
    mobilePhone: ReactNode;
    alternatePhone: ReactNode;
    emergencyContactName: ReactNode;
    emergencyContactRelationship: ReactNode;
    emergencyContactPhone: ReactNode;
    nationalId: ReactNode;
    taxId: ReactNode;
    socialSecurityNumber: ReactNode;
  };
}

export function ContactStep({ title, description, groups, fields }: ContactStepProps) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <StepHeader icon={Phone} title={title} description={description} />
      <div className="space-y-4">
        <FieldGroup title={groups.location}>
          <div className="md:col-span-2">{fields.location}</div>
          <div className="md:col-span-2">{fields.address}</div>
          {fields.dateOfBirth}
        </FieldGroup>
        <FieldGroup title={groups.phones}>
          {fields.mobilePhone}
          {fields.alternatePhone}
          {fields.emergencyContactName}
          {fields.emergencyContactRelationship}
          {fields.emergencyContactPhone}
        </FieldGroup>
        <FieldGroup title={groups.identifiers}>
          {fields.nationalId}
          {fields.taxId}
          {fields.socialSecurityNumber}
        </FieldGroup>
      </div>
    </div>
  );
}
