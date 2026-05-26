import type { DigitalContractTemplate } from '../types/digitalContractTypes';

export const digitalContractTemplateRegistry: DigitalContractTemplate[] = [
  {
    id: 'TPL-001',
    name: 'Operational service agreement',
    contractType: 'Service agreement',
    country: 'Mexico',
    description: 'Prepared for service delivery, implementation milestones, payment conditions and operational responsibilities.',
    version: '1.0',
    status: 'Active',
    updatedAt: '2026-05-23',
    dynamicFields: [
      { key: 'client_name', label: 'Client name', exampleValue: 'Grupo Boreal', required: true },
      { key: 'quote_amount', label: 'Quote amount', exampleValue: '$93,612', required: true },
      { key: 'contract_start_date', label: 'Start date', exampleValue: '2026-06-01', required: true },
      { key: 'responsible_seller', label: 'Responsible seller', exampleValue: 'Nahum Pena', required: true },
      { key: 'operational_conditions', label: 'Operational conditions', exampleValue: 'Implementation scope and support cadence.', required: false },
    ],
  },
  {
    id: 'TPL-002',
    name: 'Subscription renewal agreement',
    contractType: 'Renewal agreement',
    country: 'Canada',
    description: 'Prepared for recurring services, renewal windows, subscription dates and future signature providers.',
    version: '1.0',
    status: 'Active',
    updatedAt: '2026-05-22',
    dynamicFields: [
      { key: 'client_name', label: 'Client name', exampleValue: 'Soluciones Atlas', required: true },
      { key: 'company', label: 'Company', exampleValue: 'Indice', required: true },
      { key: 'contract_start_date', label: 'Start date', exampleValue: '2026-06-18', required: true },
      { key: 'contract_end_date', label: 'End date', exampleValue: '2027-06-18', required: true },
      { key: 'renewal_date', label: 'Renewal date', exampleValue: '2027-05-18', required: false },
    ],
  },
  {
    id: 'TPL-003',
    name: 'Commercial NDA',
    contractType: 'NDA',
    country: 'USA',
    description: 'Prepared for discovery, proposal exchange, confidential attachments and future signature request lifecycle.',
    version: '0.9',
    status: 'Draft',
    updatedAt: '2026-05-20',
    dynamicFields: [
      { key: 'client_name', label: 'Client name', exampleValue: 'Nova Retail', required: true },
      { key: 'company', label: 'Company', exampleValue: 'Indice', required: true },
      { key: 'contract_start_date', label: 'Effective date', exampleValue: '2026-06-01', required: true },
      { key: 'operational_conditions', label: 'Confidential scope', exampleValue: 'Commercial and operational documentation.', required: false },
    ],
  },
];
