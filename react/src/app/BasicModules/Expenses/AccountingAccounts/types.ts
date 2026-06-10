export type AccountingAccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type AccountingCountryCode = 'BR' | 'CA' | 'CO' | 'MX' | 'US';
export type AccountingStatementSection =
  | 'assets'
  | 'cost_of_sales'
  | 'equity'
  | 'financial_expenses'
  | 'income_taxes'
  | 'liabilities'
  | 'non_operating_income'
  | 'operating_expenses'
  | 'revenue';

export type AccountingAccount = {
  id: string;
  unitId?: string;
  businessId?: string;
  code: string;
  name: string;
  type: AccountingAccountType;
  parentAccount?: string;
  description?: string;
  isActive: boolean;
  balance: number;
  canonicalKey?: string;
  countryCode?: AccountingCountryCode;
  importedFromCatalog?: boolean;
  localReferenceCode?: string;
  localStandard?: string;
  statementSection?: AccountingStatementSection;
};

export type AccountingSortField = keyof AccountingAccount;
export type SortDirection = 'asc' | 'desc' | null;
