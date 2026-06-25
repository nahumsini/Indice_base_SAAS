import type { ProviderRecord } from './useProveedoresLogic';

export type ProviderSortField = keyof ProviderRecord;
export type SortDirection = 'asc' | 'desc' | null;
export type ProviderColumnKey = Exclude<keyof ProviderRecord, 'auditNotes' | 'createdAt' | 'updatedAt'>;
export type ProviderColumnConfig = {
  description?: string;
  fixed?: boolean;
  key: ProviderColumnKey;
  label: string;
  sortField: ProviderSortField;
  visible: boolean;
};

export const defaultProviderColumnWidths: Record<string, number> = {
  folio: 120,
  name: 210,
  company: 180,
  type: 130,
  businessUnit: 160,
  business: 160,
  contactName: 180,
  email: 210,
  phone: 150,
  taxId: 150,
  address: 230,
  accountingAccount: 180,
  status: 140,
  attachments: 130,
  authorizer: 150,
  performer: 150,
  actions: 180,
};

export const defaultProviderColumns: ProviderColumnConfig[] = [
  { key: 'folio', label: 'Folio', description: 'Identificador interno del proveedor.', sortField: 'folio', visible: true, fixed: true },
  { key: 'name', label: 'Proveedor', description: 'Nombre principal visible en el directorio.', sortField: 'name', visible: true, fixed: true },
  { key: 'company', label: 'Razón social', description: 'Nombre fiscal o empresa asociada.', sortField: 'company', visible: true },
  { key: 'type', label: 'Tipo', description: 'Clasificación operativa del proveedor.', sortField: 'type', visible: true },
  { key: 'businessUnit', label: 'Unidad', description: 'Unidad de negocio asignada.', sortField: 'businessUnit', visible: true },
  { key: 'business', label: 'Negocio', description: 'Negocio relacionado dentro de la unidad.', sortField: 'business', visible: true },
  { key: 'contactName', label: 'Contacto', description: 'Persona principal de contacto.', sortField: 'contactName', visible: true },
  { key: 'email', label: 'Correo', description: 'Correo operativo del proveedor.', sortField: 'email', visible: true },
  { key: 'phone', label: 'Teléfono', description: 'Teléfono principal de contacto.', sortField: 'phone', visible: true },
  { key: 'taxId', label: 'ID fiscal', description: 'RFC, tax ID o identificación fiscal.', sortField: 'taxId', visible: true },
  { key: 'address', label: 'Dirección', description: 'Dirección fiscal u operativa.', sortField: 'address', visible: true },
  { key: 'accountingAccount', label: 'Cuenta contable', description: 'Cuenta contable asociada.', sortField: 'accountingAccount', visible: true },
  { key: 'status', label: 'Estado', description: 'Estado actual del proveedor.', sortField: 'status', visible: true },
  { key: 'attachments', label: 'Adjuntos', description: 'Documentos asociados al proveedor.', sortField: 'attachments', visible: true },
  { key: 'authorizer', label: 'Autoriza', description: 'Usuario responsable de autorizar.', sortField: 'authorizer', visible: true },
  { key: 'performer', label: 'Responsable', description: 'Usuario responsable del seguimiento.', sortField: 'performer', visible: true },
];

export const providerHeaders = defaultProviderColumns;
