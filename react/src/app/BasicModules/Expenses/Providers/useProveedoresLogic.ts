import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';

export type ProviderType = 'Servicios' | 'Productos' | 'Logística' | 'Tecnología' | 'Otros';
export type ProviderStatus = 'active' | 'inactive';

export type ProviderRecord = {
  id: string;
  folio: string;
  name: string;
  company: string;
  type: ProviderType;
  contactName: string;
  email: string;
  phone: string;
  taxId: string;
  address: string;
  accountingAccount: string;
  status: ProviderStatus;
  businessUnit: string;
  business: string;
  attachments: string[];
  authorizer: string;
  performer: string;
  auditNotes: string;
  createdAt: Date;
  updatedAt: Date;
};

export const providerTypeOptions: Array<{ value: ProviderType; label: string }> = [
  { value: 'Servicios', label: 'Servicios' },
  { value: 'Productos', label: 'Productos' },
  { value: 'Logística', label: 'Logística' },
  { value: 'Tecnología', label: 'Tecnología' },
  { value: 'Otros', label: 'Otros' },
];

export const providerFilterTypeOptions: Array<{ value: ProviderType | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'Servicios', label: 'Servicios' },
  { value: 'Productos', label: 'Productos' },
  { value: 'Logística', label: 'Logística' },
  { value: 'Tecnología', label: 'Tecnología' },
];

export const providerStatusOptions: Array<{ value: ProviderStatus; label: string }> = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
];

export const providerAccountingAccountOptions = [
  { value: 'Gastos operativos', label: 'Gastos operativos' },
  { value: 'Servicios', label: 'Servicios' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Nómina', label: 'Nómina' },
  { value: 'Activos', label: 'Activos' },
];

export const providerBusinessUnitOptions = [
  'Operations',
  'IT',
  'Marketing',
  'Finance',
  'HR',
];

export const providerBusinessOptions = [
  'Restaurante',
  'Hotel',
  'Retail',
  'Servicios',
  'Administración',
];

export const providerUserOptions = [
  'Usuario Demo',
  'Jane Doe',
  'John Admin',
  'Operations Manager',
  'Finance Manager',
  'Procurement Lead',
  'CFO',
];

export const mockProviderRecords: ProviderRecord[] = [
  {
    id: 'provider-1',
    folio: 'PROV-0001',
    name: 'Office Supplies Inc.',
    company: 'Office Supplies Inc.',
    type: 'Productos',
    contactName: 'Laura Mendoza',
    email: 'laura@officesupplies.example',
    phone: '+1 555 0101',
    taxId: 'OSI860215AB1',
    address: '120 Business Ave, Toronto',
    accountingAccount: 'Gastos operativos',
    status: 'active',
    businessUnit: 'Operations',
    business: 'Restaurante',
    attachments: ['contrato-office-supplies.pdf'],
    authorizer: 'Finance Manager',
    performer: 'Procurement Lead',
    auditNotes: 'Contrato revisado para compras recurrentes.',
    createdAt: new Date(2026, 0, 12),
    updatedAt: new Date(2026, 3, 20),
  },
  {
    id: 'provider-2',
    folio: 'PROV-0002',
    name: 'Tech Solutions LLC',
    company: 'Tech Solutions LLC',
    type: 'Tecnología',
    contactName: 'Marco Silva',
    email: 'marco@techsolutions.example',
    phone: '+1 555 0102',
    taxId: 'TSL910704CD2',
    address: '88 Software Park, Montreal',
    accountingAccount: 'Servicios',
    status: 'active',
    businessUnit: 'IT',
    business: 'Hotel',
    attachments: ['nda-tech-solutions.pdf', 'sla-2026.pdf'],
    authorizer: 'CFO',
    performer: 'John Admin',
    auditNotes: 'SLA vigente hasta Q4.',
    createdAt: new Date(2026, 1, 5),
    updatedAt: new Date(2026, 3, 18),
  },
  {
    id: 'provider-3',
    folio: 'PROV-0003',
    name: 'Marketing Pro Agency',
    company: 'Marketing Pro Agency',
    type: 'Servicios',
    contactName: 'Ana Rojas',
    email: 'ana@marketingpro.example',
    phone: '+1 555 0103',
    taxId: 'MPA780923EF3',
    address: '45 Creative St, Vancouver',
    accountingAccount: 'Marketing',
    status: 'active',
    businessUnit: 'Marketing',
    business: 'Retail',
    attachments: [],
    authorizer: 'Jane Doe',
    performer: 'Usuario Demo',
    auditNotes: 'Pendiente validar tarifas por campaña.',
    createdAt: new Date(2026, 2, 2),
    updatedAt: new Date(2026, 3, 10),
  },
  {
    id: 'provider-4',
    folio: 'PROV-0004',
    name: 'Legal Advisors Group',
    company: 'Legal Advisors Group',
    type: 'Servicios',
    contactName: 'Emma Wilson',
    email: 'emma@legaladvisors.example',
    phone: '+1 555 0104',
    taxId: 'LAG780402GH4',
    address: '321 Law St, Boston',
    accountingAccount: 'Servicios',
    status: 'active',
    businessUnit: 'Finance',
    business: 'Servicios',
    attachments: ['contrato-legal.pdf'],
    authorizer: 'CFO',
    performer: 'Finance Manager',
    auditNotes: 'Proveedor validado para consultas contractuales.',
    createdAt: new Date(2026, 2, 18),
    updatedAt: new Date(2026, 3, 2),
  },
  {
    id: 'provider-5',
    folio: 'PROV-0005',
    name: 'Global Logistics Co.',
    company: 'Global Logistics Co.',
    type: 'Logística',
    contactName: 'Carlos Mendez',
    email: 'carlos@globallogistics.example',
    phone: '+1 555 0105',
    taxId: 'GLC660118GH5',
    address: '9 Distribution Road, Ottawa',
    accountingAccount: 'Gastos operativos',
    status: 'active',
    businessUnit: 'Operations',
    business: 'Servicios',
    attachments: ['contrato-logistica.pdf'],
    authorizer: 'Operations Manager',
    performer: 'Procurement Lead',
    auditNotes: 'Tarifas logísticas actualizadas para 2026.',
    createdAt: new Date(2026, 2, 18),
    updatedAt: new Date(2026, 3, 2),
  },
  {
    id: 'provider-6',
    folio: 'PROV-0006',
    name: 'Clean & Shine Services',
    company: 'Clean & Shine Services',
    type: 'Servicios',
    contactName: 'Maria Garcia',
    email: 'maria@cleanshine.example',
    phone: '+1 555 0106',
    taxId: 'CSS556677AA6',
    address: '25 Cleaning St, Toronto',
    accountingAccount: 'Servicios',
    status: 'active',
    businessUnit: 'Operations',
    business: 'Hotel',
    attachments: ['cleaning-sla.pdf'],
    authorizer: 'Operations Manager',
    performer: 'Procurement Lead',
    auditNotes: 'Servicio recurrente validado.',
    createdAt: new Date(2026, 1, 14),
    updatedAt: new Date(2026, 3, 28),
  },
  {
    id: 'provider-7',
    folio: 'PROV-0007',
    name: 'Security Plus',
    company: 'Security Plus',
    type: 'Servicios',
    contactName: 'Roberto Sánchez',
    email: 'roberto@securityplus.example',
    phone: '+1 555 0107',
    taxId: 'SP998877BB7',
    address: '100 Security Blvd, Monterrey',
    accountingAccount: 'Servicios',
    status: 'active',
    businessUnit: 'Operations',
    business: 'Retail',
    attachments: ['security-contract.pdf'],
    authorizer: 'Operations Manager',
    performer: 'Procurement Lead',
    auditNotes: 'Cobertura mensual activa.',
    createdAt: new Date(2026, 0, 22),
    updatedAt: new Date(2026, 3, 22),
  },
  {
    id: 'provider-8',
    folio: 'PROV-0008',
    name: 'Food Wholesale Inc.',
    company: 'Food Wholesale Inc.',
    type: 'Productos',
    contactName: 'Ana López',
    email: 'ana@foodwholesale.example',
    phone: '+1 555 0108',
    taxId: 'FWI334455CC8',
    address: '45 Central Market, Guadalajara',
    accountingAccount: 'Gastos operativos',
    status: 'active',
    businessUnit: 'Operations',
    business: 'Restaurante',
    attachments: ['food-supply-agreement.pdf'],
    authorizer: 'Operations Manager',
    performer: 'Procurement Lead',
    auditNotes: 'Proveedor crítico de alimentos.',
    createdAt: new Date(2026, 0, 8),
    updatedAt: new Date(2026, 3, 30),
  },
];

const getNextProviderFolio = (providers: ProviderRecord[]) => {
  const nextNumber = providers.reduce((maxNumber, provider) => {
    const match = provider.folio.match(/PROV-(\d+)/);
    const folioNumber = match ? Number(match[1]) : 0;
    return Math.max(maxNumber, folioNumber);
  }, 0) + 1;

  return `PROV-${String(nextNumber).padStart(4, '0')}`;
};

const createEmptyProvider = (providers: ProviderRecord[]): ProviderRecord => {
  const now = new Date();

  return {
    id: `prov-${Date.now()}`,
    folio: getNextProviderFolio(providers),
    name: 'Nuevo proveedor',
    company: '',
    type: 'Servicios',
    contactName: '',
    email: '',
    phone: '',
    taxId: '',
    address: '',
    accountingAccount: 'Gastos operativos',
    status: 'active',
    businessUnit: providerBusinessUnitOptions[0],
    business: providerBusinessOptions[0],
    attachments: [],
    authorizer: '',
    performer: '',
    auditNotes: '',
    createdAt: now,
    updatedAt: now,
  };
};

interface UseProveedoresLogicParams {
  onProvidersChange?: Dispatch<SetStateAction<ProviderRecord[]>>;
  providers?: ProviderRecord[];
}

export function useProveedoresLogic({
  onProvidersChange,
  providers: controlledProviders,
}: UseProveedoresLogicParams = {}) {
  const [internalProviders, setInternalProviders] = useState<ProviderRecord[]>(mockProviderRecords);
  const providers = controlledProviders ?? internalProviders;
  const setProviders = onProvidersChange ?? setInternalProviders;
  const [businessFilter, setBusinessFilter] = useState('all');
  const [businessUnitFilter, setBusinessUnitFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProviderStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ProviderType | 'all'>('all');

  const filteredProviders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return providers.filter(provider => {
      const matchesSearch = !normalizedSearch ||
        provider.name.toLowerCase().includes(normalizedSearch) ||
        provider.company.toLowerCase().includes(normalizedSearch) ||
        provider.contactName.toLowerCase().includes(normalizedSearch);
      const matchesType = typeFilter === 'all' || provider.type === typeFilter;
      const matchesBusinessUnit = businessUnitFilter === 'all' || provider.businessUnit === businessUnitFilter;
      const matchesBusiness = businessFilter === 'all' || provider.business === businessFilter;
      const matchesStatus = statusFilter === 'all' || provider.status === statusFilter;

      return matchesSearch && matchesType && matchesBusinessUnit && matchesBusiness && matchesStatus;
    });
  }, [businessFilter, businessUnitFilter, providers, searchTerm, statusFilter, typeFilter]);

  const addProvider = () => {
    const provider = createEmptyProvider(providers);
    setProviders(currentProviders => [provider, ...currentProviders]);
    return provider.id;
  };

  const updateProvider = (providerId: string, updates: Partial<ProviderRecord>) => {
    setProviders(currentProviders =>
      currentProviders.map(provider =>
        provider.id === providerId
          ? {
              ...provider,
              ...updates,
              updatedAt: new Date(),
            }
          : provider,
      ),
    );
  };

  const duplicateProvider = (providerId: string) => {
    setProviders(currentProviders => {
      const provider = currentProviders.find(item => item.id === providerId);
      if (!provider) return currentProviders;

      return [
        {
          ...provider,
          id: `prov-${Date.now()}`,
          folio: getNextProviderFolio(currentProviders),
          name: `${provider.name} copia`,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        ...currentProviders,
      ];
    });
  };

  const deleteProvider = (providerId: string) => {
    setProviders(currentProviders => currentProviders.filter(provider => provider.id !== providerId));
  };

  const activateProvider = (providerId: string) => {
    updateProvider(providerId, { status: 'active' });
  };

  return {
    addProvider,
    activateProvider,
    businessFilter,
    businessUnitFilter,
    deleteProvider,
    duplicateProvider,
    filteredProviders,
    providers,
    searchTerm,
    setBusinessFilter,
    setBusinessUnitFilter,
    setSearchTerm,
    setStatusFilter,
    setTypeFilter,
    statusFilter,
    typeFilter,
    updateProvider,
  };
}
