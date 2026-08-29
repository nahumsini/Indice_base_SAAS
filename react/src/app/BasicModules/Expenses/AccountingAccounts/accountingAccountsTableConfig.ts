import type { AccountingAccount, AccountingSortField } from './types';

export type AccountingColumnKey = keyof Pick<
  AccountingAccount,
  'balance' | 'businessId' | 'code' | 'description' | 'isActive' | 'name' | 'type' | 'unitId'
  | 'countryCode' | 'localStandard' | 'statementSection'
>;

export type AccountingColumnConfig = {
  description?: string;
  fixed?: boolean;
  key: AccountingColumnKey;
  label: string;
  sortField: AccountingSortField;
  visible: boolean;
};

export const defaultAccountingColumnWidths: Record<AccountingColumnKey | 'actions', number> = {
  code: 130,
  name: 230,
  type: 150,
  countryCode: 130,
  localStandard: 190,
  statementSection: 180,
  unitId: 170,
  businessId: 170,
  description: 260,
  balance: 150,
  isActive: 140,
  actions: 150,
};

export const defaultAccountingColumns: AccountingColumnConfig[] = [
  { key: 'code', label: 'Código', description: 'Código interno del catálogo contable.', sortField: 'code', visible: true, fixed: true },
  { key: 'name', label: 'Cuenta contable', description: 'Nombre principal de la cuenta.', sortField: 'name', visible: true, fixed: true },
  { key: 'type', label: 'Tipo', description: 'Grupo financiero de clasificación.', sortField: 'type', visible: true },
  { key: 'countryCode', label: 'País', description: 'País origen del catálogo base.', sortField: 'countryCode', visible: false },
  { key: 'localStandard', label: 'Estándar', description: 'Referencia normativa o fiscal local.', sortField: 'localStandard', visible: false },
  { key: 'statementSection', label: 'Sección', description: 'Sección canónica del estado financiero.', sortField: 'statementSection', visible: false },
  { key: 'unitId', label: 'Unidad', description: 'Unidad de negocio asignada.', sortField: 'unitId', visible: false },
  { key: 'businessId', label: 'Negocio', description: 'Negocio relacionado dentro de la unidad.', sortField: 'businessId', visible: false },
  { key: 'description', label: 'Descripción', description: 'Uso esperado de la cuenta.', sortField: 'description', visible: false },
  { key: 'balance', label: 'Saldo', description: 'Saldo informativo asociado.', sortField: 'balance', visible: false },
  { key: 'isActive', label: 'Estado', description: 'Disponibilidad actual de la cuenta.', sortField: 'isActive', visible: true },
];

export const legacyWideAccountingFactoryPreset = {
  orderedKeys: defaultAccountingColumns.map(column => column.key),
  visibleKeys: ['code', 'name', 'type', 'countryCode', 'localStandard', 'statementSection', 'description', 'balance', 'isActive'],
};

export const accountingHeaders = defaultAccountingColumns;
