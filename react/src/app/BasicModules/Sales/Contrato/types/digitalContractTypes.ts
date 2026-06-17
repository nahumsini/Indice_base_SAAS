export type DigitalContractStatus =
  | 'Draft'
  | 'Internal review'
  | 'Sent'
  | 'Viewed'
  | 'Pending signature'
  | 'Signed'
  | 'Expired'
  | 'Cancelled';

export type DigitalSignatureStatus = 'Not requested' | 'Waiting' | 'Signed' | 'Declined' | 'Expired';

export type DigitalContractType =
  | 'Service agreement'
  | 'Sales agreement'
  | 'Renewal agreement'
  | 'Subscription agreement'
  | 'NDA'
  | 'Operational agreement'
  | 'Custom contract';

export type DigitalContractSource = 'Uploaded document' | 'Template generated';

export type DigitalContractCountry = 'Mexico' | 'Canada' | 'USA' | 'Colombia' | 'Brazil';

export type ContractAssignedEntityType = 'contact' | 'opportunity' | 'quote' | 'post-sale';

export type DigitalContractFileKind = 'pdf' | 'attachment' | 'specification' | 'annex' | 'signed version' | 'editable version';

export type DigitalContractDynamicFieldKey =
  | 'client_name'
  | 'company'
  | 'quote_amount'
  | 'contract_start_date'
  | 'contract_end_date'
  | 'responsible_seller'
  | 'unit'
  | 'business'
  | 'renewal_date'
  | 'operational_conditions';

export type DigitalContractLifecycleStepKey =
  | 'created'
  | 'assigned'
  | 'documentPrepared'
  | 'signatureRequested'
  | 'clientReview'
  | 'signedVersionStored';

export type DigitalContractDynamicField = {
  key: DigitalContractDynamicFieldKey;
  label: string;
  exampleValue: string;
  required: boolean;
};

export type DigitalContractTemplate = {
  id: string;
  name: string;
  contractType: DigitalContractType;
  country: DigitalContractCountry;
  description: string;
  dynamicFields: DigitalContractDynamicField[];
  version: string;
  status: 'Active' | 'Draft';
  updatedAt: string;
};

export type DigitalContractFile = {
  id: string;
  name: string;
  kind: DigitalContractFileKind;
  source: DigitalContractSource;
  status: 'attached' | 'generated' | 'signed-placeholder';
};

export type DigitalContractSignatureRequest = {
  id: string;
  requestedAt?: string;
  requestedBy: string;
  recipientName: string;
  recipientEmail: string;
  provider: 'Prepared only' | 'DocuSign' | 'Adobe Sign' | 'Local provider';
  status: DigitalSignatureStatus;
};

export type DigitalContract = {
  id: string;
  backendId?: number;
  contractNumber: string;
  title: string;
  clientId?: string;
  clientName: string;
  contactPerson: string;
  relatedOpportunityId?: string;
  relatedQuoteId?: string;
  relatedPostSaleCaseId?: string;
  contractType: DigitalContractType;
  status: DigitalContractStatus;
  owner: string;
  signatureStatus: DigitalSignatureStatus;
  source: DigitalContractSource;
  country: DigitalContractCountry;
  templateId?: string;
  dynamicFieldValues: Partial<Record<DigitalContractDynamicFieldKey, string>>;
  lastUpdated: string;
  expirationDate: string;
  files: DigitalContractFile[];
  signatureRequest?: DigitalContractSignatureRequest;
  lifecycle: Array<{
    labelKey: DigitalContractLifecycleStepKey;
    status: 'done' | 'current' | 'future';
  }>;
  notes: string;
  filesCount?: number;
};

export type CreateDigitalContractInput = Omit<DigitalContract, 'id' | 'contractNumber' | 'lastUpdated'> & {
  contractNumber?: string;
  lastUpdated?: string;
};

export const digitalContractStatuses: DigitalContractStatus[] = [
  'Draft',
  'Internal review',
  'Sent',
  'Viewed',
  'Pending signature',
  'Signed',
  'Expired',
  'Cancelled',
];

export const digitalSignatureStatuses: DigitalSignatureStatus[] = [
  'Not requested',
  'Waiting',
  'Signed',
  'Declined',
  'Expired',
];

export const digitalContractTypes: DigitalContractType[] = [
  'Service agreement',
  'Sales agreement',
  'Renewal agreement',
  'Subscription agreement',
  'NDA',
  'Operational agreement',
  'Custom contract',
];

export const digitalContractSources: DigitalContractSource[] = ['Uploaded document', 'Template generated'];

export const digitalContractCountries: DigitalContractCountry[] = ['Mexico', 'Canada', 'USA', 'Colombia', 'Brazil'];
