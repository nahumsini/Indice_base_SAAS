import type {
  CreateDigitalContractInput,
  DigitalContract,
  DigitalContractDynamicField,
  DigitalContractSignatureRequest,
  DigitalContractTemplate,
} from '../types/digitalContractTypes';

export type DigitalContractBackendEntityName =
  | 'sales_contracts'
  | 'sales_contract_templates'
  | 'sales_contract_versions'
  | 'sales_signature_requests'
  | 'sales_contract_dynamic_fields'
  | 'sales_generated_documents'
  | 'sales_contract_assignments';

export type DigitalContractPreparedEndpoints = {
  contracts: '/api/v1/sales/contracts';
  templates: '/api/v1/sales/contracts/templates';
  versions: '/api/v1/sales/contracts/versions';
  signatureRequests: '/api/v1/sales/contracts/signature-requests';
  generatedDocuments: '/api/v1/sales/contracts/generated-documents';
};

export const preparedDigitalContractEndpoints: DigitalContractPreparedEndpoints = {
  contracts: '/api/v1/sales/contracts',
  templates: '/api/v1/sales/contracts/templates',
  versions: '/api/v1/sales/contracts/versions',
  signatureRequests: '/api/v1/sales/contracts/signature-requests',
  generatedDocuments: '/api/v1/sales/contracts/generated-documents',
};

export type DigitalContractRepositoryContract = {
  listContracts: () => Promise<DigitalContract[]>;
  createContract: (payload: CreateDigitalContractInput) => Promise<DigitalContract>;
  listTemplates: () => Promise<DigitalContractTemplate[]>;
  resolveDynamicFields: (templateId: string) => Promise<DigitalContractDynamicField[]>;
  createSignatureRequest: (contractId: string, payload: DigitalContractSignatureRequest) => Promise<DigitalContractSignatureRequest>;
};

export const digitalContractsBackendPreparation = {
  entities: [
    'sales_contracts',
    'sales_contract_templates',
    'sales_contract_versions',
    'sales_signature_requests',
    'sales_contract_dynamic_fields',
    'sales_generated_documents',
    'sales_contract_assignments',
  ] satisfies DigitalContractBackendEntityName[],
  relationships: [
    'contact_id',
    'opportunity_id',
    'quote_id',
    'post_sale_case_id',
    'owner_user_company_id',
    'unit_id',
    'business_id',
  ],
  futureIntegrations: [
    'DocuSign',
    'Adobe Sign',
    'local signature providers',
    'PDF generation services',
    'certificate providers',
  ],
};
