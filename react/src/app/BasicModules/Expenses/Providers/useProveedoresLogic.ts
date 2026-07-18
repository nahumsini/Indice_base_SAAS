import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { isBackendId } from '../adapters/adapter.utils';
import { mockProviderRecords } from '../data/providerRecords.mock';
import { providersService, toFinanceApiErrorMessage } from '../services';

export type ProviderType =
  | 'Arrendamiento'
  | 'Construcción'
  | 'Consultoría'
  | 'Contabilidad'
  | 'Financiero'
  | 'Gobierno'
  | 'Insumos'
  | 'Legal'
  | 'Logística'
  | 'Mantenimiento'
  | 'Marketing'
  | 'Nómina'
  | 'Productos'
  | 'Seguros'
  | 'Servicios'
  | 'Servicios básicos'
  | 'Tecnología'
  | 'Viajes'
  | 'Otros';
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
  registrationSource?: string;
  registrationKioskId?: number;
};

export type ProviderFormValues = Pick<
  ProviderRecord,
  | 'accountingAccount'
  | 'authorizer'
  | 'business'
  | 'businessUnit'
  | 'company'
  | 'contactName'
  | 'email'
  | 'name'
  | 'performer'
  | 'phone'
  | 'status'
  | 'taxId'
  | 'type'
  | 'address'
>;

export const providerTypeOptions: Array<{ value: ProviderType; label: string }> = [
  { value: 'Servicios', label: 'Servicios' },
  { value: 'Productos', label: 'Productos' },
  { value: 'Logística', label: 'Logística' },
  { value: 'Tecnología', label: 'Tecnología' },
  { value: 'Arrendamiento', label: 'Arrendamiento' },
  { value: 'Mantenimiento', label: 'Mantenimiento' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Consultoría', label: 'Consultoría' },
  { value: 'Legal', label: 'Legal' },
  { value: 'Contabilidad', label: 'Contabilidad' },
  { value: 'Financiero', label: 'Financiero' },
  { value: 'Seguros', label: 'Seguros' },
  { value: 'Construcción', label: 'Construcción' },
  { value: 'Insumos', label: 'Insumos' },
  { value: 'Servicios básicos', label: 'Servicios básicos' },
  { value: 'Gobierno', label: 'Gobierno / impuestos' },
  { value: 'Viajes', label: 'Viajes' },
  { value: 'Nómina', label: 'Nómina / contratistas' },
  { value: 'Otros', label: 'Otros' },
];

export const providerFilterTypeOptions: Array<{ value: ProviderType | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  ...providerTypeOptions,
];

export const providerStatusOptions: Array<{ value: ProviderStatus; label: string }> = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
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


const getNextProviderFolio = (providers: ProviderRecord[]) => {
  const nextNumber = providers.reduce((maxNumber, provider) => {
    const match = provider.folio.match(/PROV-(\d+)/);
    const folioNumber = match ? Number(match[1]) : 0;
    return Math.max(maxNumber, folioNumber);
  }, 0) + 1;

  return `PROV-${String(nextNumber).padStart(4, '0')}`;
};

const createProviderFromValues = (providers: ProviderRecord[], values: ProviderFormValues): ProviderRecord => {
  const now = new Date();

  return {
    id: `prov-${Date.now()}`,
    folio: getNextProviderFolio(providers),
    name: values.name.trim(),
    company: values.company,
    type: values.type,
    contactName: values.contactName,
    email: values.email,
    phone: values.phone,
    taxId: values.taxId,
    address: values.address,
    accountingAccount: values.accountingAccount,
    status: values.status,
    businessUnit: values.businessUnit,
    business: values.business,
    attachments: [],
    authorizer: values.authorizer,
    performer: values.performer,
    auditNotes: '',
    createdAt: now,
    updatedAt: now,
  };
};

interface UseProveedoresLogicParams {
  onError?: (message: string) => void;
  onProvidersChange?: Dispatch<SetStateAction<ProviderRecord[]>>;
  onSuccess?: (message: string) => void;
  providers?: ProviderRecord[];
}

export function useProveedoresLogic({
  onError,
  onProvidersChange,
  onSuccess,
  providers: controlledProviders,
}: UseProveedoresLogicParams = {}) {
  const [internalProviders, setInternalProviders] = useState<ProviderRecord[]>(mockProviderRecords);
  const providers = controlledProviders ?? internalProviders;
  const setProviders = onProvidersChange ?? setInternalProviders;
  const saveTimeoutsRef = useRef<Record<string, number>>({});
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

  useEffect(() => () => {
    Object.values(saveTimeoutsRef.current).forEach(timeoutId => window.clearTimeout(timeoutId));
  }, []);

  const reportError = useCallback((error: unknown, fallbackMessage: string) => {
    onError?.(toFinanceApiErrorMessage(error, fallbackMessage));
  }, [onError]);

  const persistProvider = useCallback((provider: ProviderRecord) => {
    if (!isBackendId(provider.id)) return;
    window.clearTimeout(saveTimeoutsRef.current[provider.id]);
    saveTimeoutsRef.current[provider.id] = window.setTimeout(() => {
      providersService.updateProvider(provider)
        .then(savedProvider => {
          setProviders(currentProviders => currentProviders.map(item => (
            item.id === provider.id ? savedProvider : item
          )));
        })
        .catch(error => reportError(error, 'No se pudo guardar el proveedor. Se conservaron los cambios locales.'));
    }, 700);
  }, [reportError, setProviders]);

  const addProvider = async (values: ProviderFormValues) => {
    const provider = createProviderFromValues(providers, values);
    try {
      const savedProvider = await providersService.createProvider(provider);
      setProviders(currentProviders => [savedProvider, ...currentProviders]);
      onSuccess?.('Proveedor creado en Finance.');
      return savedProvider.id;
    } catch (error) {
      reportError(error, 'No se pudo crear el proveedor en Finance.');
      throw error;
    }
  };

  const updateProvider = (providerId: string, updates: Partial<ProviderRecord>) => {
    const currentProvider = providers.find(provider => provider.id === providerId);
    const nextProvider = currentProvider
      ? { ...currentProvider, ...updates, updatedAt: new Date() }
      : null;

    setProviders(currentProviders =>
      currentProviders.map(provider =>
        provider.id === providerId
          ? { ...provider, ...updates, updatedAt: nextProvider?.updatedAt ?? new Date() }
          : provider,
      ),
    );
    if (nextProvider) persistProvider(nextProvider);
  };

  const saveProvider = async (providerId: string, updates: Partial<ProviderRecord>) => {
    const provider = providers.find(item => item.id === providerId);
    if (!provider) throw new Error('Proveedor no encontrado.');
    const nextProvider = { ...provider, ...updates, updatedAt: new Date() };
    try {
      const savedProvider = isBackendId(providerId)
        ? await providersService.updateProvider(nextProvider)
        : nextProvider;
      setProviders(currentProviders => currentProviders.map(item => (
        item.id === providerId ? savedProvider : item
      )));
      onSuccess?.('Proveedor actualizado en Finance.');
    } catch (error) {
      reportError(error, 'No se pudo guardar el proveedor.');
      throw error;
    }
  };

  const duplicateProvider = (providerId: string) => {
    const provider = providers.find(item => item.id === providerId);
    if (!provider) return;
    const copy = {
      ...provider,
      id: `prov-${Date.now()}`,
      folio: getNextProviderFolio(providers),
      name: `${provider.name} copia`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    providersService.createProvider(copy)
      .then(savedProvider => {
        setProviders(currentProviders => [savedProvider, ...currentProviders]);
        onSuccess?.('Proveedor duplicado en Finance.');
      })
      .catch(error => {
        setProviders(currentProviders => [copy, ...currentProviders]);
        reportError(error, 'No se pudo duplicar el proveedor en Finance. Se agregó como dato local.');
      });
  };

  const deleteProvider = async (providerId: string) => {
    const provider = providers.find(item => item.id === providerId);
    if (!provider) return false;
    try {
      if (isBackendId(providerId)) {
        await providersService.deleteProvider(providerId);
      }
      setProviders(currentProviders => currentProviders.filter(item => item.id !== providerId));
      onSuccess?.('Proveedor eliminado de Finance.');
      return true;
    } catch (error) {
      reportError(error, 'No se pudo eliminar el proveedor en Finance.');
      return false;
    }
  };

  const activateProvider = (providerId: string) => {
    const provider = providers.find(item => item.id === providerId);
    if (!provider) return;
    const activatedProvider = { ...provider, status: 'active' as const, updatedAt: new Date() };
    setProviders(currentProviders => currentProviders.map(item => item.id === providerId ? activatedProvider : item));
    if (!isBackendId(providerId)) return;
    window.clearTimeout(saveTimeoutsRef.current[providerId]);
    providersService.updateProvider(activatedProvider)
      .then(savedProvider => setProviders(currentProviders => currentProviders.map(item => item.id === providerId ? savedProvider : item)))
      .catch(error => {
        setProviders(currentProviders => currentProviders.map(item => item.id === providerId ? provider : item));
        reportError(error, 'No se pudo activar el proveedor.');
      });
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
    saveProvider,
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
