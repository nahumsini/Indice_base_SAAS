import type {
  AccountingAccount,
  AccountingAccountType,
  AccountingCountryCode,
  AccountingStatementSection,
} from './types';

export type AccountingCatalogTemplate = {
  canonicalKey: string;
  code: string;
  countryCode: AccountingCountryCode;
  description: string;
  localReferenceCode: string;
  localStandard: string;
  name: string;
  statementSection: AccountingStatementSection;
  type: AccountingAccountType;
};

export const accountingCountryOptions: Array<{ code: AccountingCountryCode; label: string; standard: string }> = [
  { code: 'MX', label: 'México', standard: 'NIF / SAT Anexo 24' },
  { code: 'CO', label: 'Colombia', standard: 'NIIF / PUC' },
  { code: 'BR', label: 'Brasil', standard: 'CPC / SPED ECF' },
  { code: 'CA', label: 'Canadá', standard: 'IFRS / ASPE' },
  { code: 'US', label: 'Estados Unidos', standard: 'US GAAP / IRS' },
];

export const statementSectionLabels: Record<AccountingStatementSection, string> = {
  assets: 'Activos',
  cost_of_sales: 'Costo de ventas',
  equity: 'Capital',
  financial_expenses: 'Gastos financieros',
  income_taxes: 'Impuestos',
  liabilities: 'Pasivos',
  non_operating_income: 'Otros ingresos',
  operating_expenses: 'Gastos operativos',
  revenue: 'Ingresos',
};

const baseTemplates: Array<Omit<AccountingCatalogTemplate, 'code' | 'countryCode' | 'localReferenceCode' | 'localStandard' | 'name'>> = [
  { canonicalKey: 'CASH', description: 'Efectivo y caja general.', statementSection: 'assets', type: 'asset' },
  { canonicalKey: 'BANKS', description: 'Cuentas bancarias operativas.', statementSection: 'assets', type: 'asset' },
  { canonicalKey: 'ACCOUNTS_RECEIVABLE', description: 'Cuentas por cobrar a clientes.', statementSection: 'assets', type: 'asset' },
  { canonicalKey: 'ACCOUNTS_PAYABLE', description: 'Cuentas por pagar a proveedores.', statementSection: 'liabilities', type: 'liability' },
  { canonicalKey: 'OWNER_EQUITY', description: 'Capital o patrimonio aportado.', statementSection: 'equity', type: 'equity' },
  { canonicalKey: 'SALES_REVENUE', description: 'Ingresos por ventas o prestación de servicios.', statementSection: 'revenue', type: 'income' },
  { canonicalKey: 'SALES_RETURNS_DISCOUNTS', description: 'Devoluciones, descuentos y rebajas sobre ventas.', statementSection: 'revenue', type: 'income' },
  { canonicalKey: 'COST_OF_GOODS_SOLD', description: 'Costo directo de productos o servicios vendidos.', statementSection: 'cost_of_sales', type: 'expense' },
  { canonicalKey: 'PAYROLL_EXPENSE', description: 'Sueldos, salarios y cargas relacionadas.', statementSection: 'operating_expenses', type: 'expense' },
  { canonicalKey: 'RENT_EXPENSE', description: 'Renta de oficinas, locales o instalaciones.', statementSection: 'operating_expenses', type: 'expense' },
  { canonicalKey: 'UTILITIES_EXPENSE', description: 'Electricidad, agua, telefonía e internet.', statementSection: 'operating_expenses', type: 'expense' },
  { canonicalKey: 'MAINTENANCE_EXPENSE', description: 'Mantenimiento de equipos e instalaciones.', statementSection: 'operating_expenses', type: 'expense' },
  { canonicalKey: 'MARKETING_EXPENSE', description: 'Publicidad, marketing y promoción.', statementSection: 'operating_expenses', type: 'expense' },
  { canonicalKey: 'PROFESSIONAL_SERVICES', description: 'Honorarios legales, contables y consultoría.', statementSection: 'operating_expenses', type: 'expense' },
  { canonicalKey: 'SOFTWARE_EXPENSE', description: 'Software, SaaS y herramientas digitales.', statementSection: 'operating_expenses', type: 'expense' },
  { canonicalKey: 'DEPRECIATION_AMORTIZATION', description: 'Depreciación y amortización del periodo.', statementSection: 'operating_expenses', type: 'expense' },
  { canonicalKey: 'FINANCIAL_EXPENSES', description: 'Intereses, comisiones y gastos financieros.', statementSection: 'financial_expenses', type: 'expense' },
  { canonicalKey: 'INCOME_TAX_EXPENSE', description: 'Impuesto sobre la renta o impuesto a las ganancias.', statementSection: 'income_taxes', type: 'expense' },
];

const countryNames: Record<AccountingCountryCode, Record<string, string>> = {
  MX: {
    CASH: 'Caja', BANKS: 'Bancos', ACCOUNTS_RECEIVABLE: 'Clientes', ACCOUNTS_PAYABLE: 'Proveedores', OWNER_EQUITY: 'Capital social',
    SALES_REVENUE: 'Ventas', SALES_RETURNS_DISCOUNTS: 'Devoluciones y descuentos sobre ventas', COST_OF_GOODS_SOLD: 'Costo de ventas',
    PAYROLL_EXPENSE: 'Sueldos y salarios', RENT_EXPENSE: 'Rentas', UTILITIES_EXPENSE: 'Servicios públicos', MAINTENANCE_EXPENSE: 'Mantenimiento',
    MARKETING_EXPENSE: 'Publicidad y marketing', PROFESSIONAL_SERVICES: 'Honorarios profesionales', SOFTWARE_EXPENSE: 'Software y suscripciones',
    DEPRECIATION_AMORTIZATION: 'Depreciación y amortización', FINANCIAL_EXPENSES: 'Gastos financieros', INCOME_TAX_EXPENSE: 'Impuestos a la utilidad',
  },
  CO: {
    CASH: 'Caja', BANKS: 'Bancos', ACCOUNTS_RECEIVABLE: 'Clientes', ACCOUNTS_PAYABLE: 'Proveedores nacionales', OWNER_EQUITY: 'Capital social',
    SALES_REVENUE: 'Ingresos operacionales', SALES_RETURNS_DISCOUNTS: 'Devoluciones, rebajas y descuentos', COST_OF_GOODS_SOLD: 'Costo de ventas',
    PAYROLL_EXPENSE: 'Gastos de personal', RENT_EXPENSE: 'Arrendamientos', UTILITIES_EXPENSE: 'Servicios', MAINTENANCE_EXPENSE: 'Mantenimiento y reparaciones',
    MARKETING_EXPENSE: 'Publicidad, propaganda y promoción', PROFESSIONAL_SERVICES: 'Honorarios', SOFTWARE_EXPENSE: 'Software y licencias',
    DEPRECIATION_AMORTIZATION: 'Depreciaciones y amortizaciones', FINANCIAL_EXPENSES: 'Gastos financieros', INCOME_TAX_EXPENSE: 'Impuesto de renta',
  },
  BR: {
    CASH: 'Caixa', BANKS: 'Bancos conta movimento', ACCOUNTS_RECEIVABLE: 'Clientes', ACCOUNTS_PAYABLE: 'Fornecedores', OWNER_EQUITY: 'Capital social',
    SALES_REVENUE: 'Receita de vendas', SALES_RETURNS_DISCOUNTS: 'Deduções da receita bruta', COST_OF_GOODS_SOLD: 'Custo das mercadorias vendidas',
    PAYROLL_EXPENSE: 'Salários e encargos', RENT_EXPENSE: 'Aluguéis', UTILITIES_EXPENSE: 'Serviços públicos', MAINTENANCE_EXPENSE: 'Manutenção',
    MARKETING_EXPENSE: 'Publicidade e propaganda', PROFESSIONAL_SERVICES: 'Serviços profissionais', SOFTWARE_EXPENSE: 'Software e assinaturas',
    DEPRECIATION_AMORTIZATION: 'Depreciação e amortização', FINANCIAL_EXPENSES: 'Despesas financeiras', INCOME_TAX_EXPENSE: 'IRPJ e CSLL',
  },
  CA: {
    CASH: 'Cash', BANKS: 'Bank accounts', ACCOUNTS_RECEIVABLE: 'Accounts receivable', ACCOUNTS_PAYABLE: 'Accounts payable', OWNER_EQUITY: 'Share capital',
    SALES_REVENUE: 'Sales revenue', SALES_RETURNS_DISCOUNTS: 'Sales returns and discounts', COST_OF_GOODS_SOLD: 'Cost of goods sold',
    PAYROLL_EXPENSE: 'Payroll expense', RENT_EXPENSE: 'Rent expense', UTILITIES_EXPENSE: 'Utilities expense', MAINTENANCE_EXPENSE: 'Repairs and maintenance',
    MARKETING_EXPENSE: 'Advertising and marketing', PROFESSIONAL_SERVICES: 'Professional fees', SOFTWARE_EXPENSE: 'Software subscriptions',
    DEPRECIATION_AMORTIZATION: 'Depreciation and amortization', FINANCIAL_EXPENSES: 'Interest and bank charges', INCOME_TAX_EXPENSE: 'Income tax expense',
  },
  US: {
    CASH: 'Cash', BANKS: 'Bank accounts', ACCOUNTS_RECEIVABLE: 'Accounts receivable', ACCOUNTS_PAYABLE: 'Accounts payable', OWNER_EQUITY: 'Owner equity',
    SALES_REVENUE: 'Sales revenue', SALES_RETURNS_DISCOUNTS: 'Returns and allowances', COST_OF_GOODS_SOLD: 'Cost of goods sold',
    PAYROLL_EXPENSE: 'Wages and payroll taxes', RENT_EXPENSE: 'Rent expense', UTILITIES_EXPENSE: 'Utilities expense', MAINTENANCE_EXPENSE: 'Repairs and maintenance',
    MARKETING_EXPENSE: 'Advertising expense', PROFESSIONAL_SERVICES: 'Legal and professional services', SOFTWARE_EXPENSE: 'Software and subscriptions',
    DEPRECIATION_AMORTIZATION: 'Depreciation and amortization', FINANCIAL_EXPENSES: 'Interest and bank fees', INCOME_TAX_EXPENSE: 'Income tax expense',
  },
};

const countryCodes: Record<AccountingCountryCode, string[]> = {
  MX: ['1010', '1020', '1050', '2010', '3010', '4010', '4020', '5010', '6010', '6020', '6030', '6040', '6050', '6060', '6070', '6080', '7010', '8010'],
  CO: ['1105', '1110', '1305', '2205', '3105', '4135', '4175', '6135', '5105', '5120', '5135', '5145', '5230', '5110', '5160', '5165', '5305', '5405'],
  BR: ['1.01.01', '1.01.02', '1.01.03', '2.01.01', '2.03.01', '3.01.01', '3.01.02', '3.02.01', '3.03.01', '3.03.02', '3.03.03', '3.03.04', '3.03.05', '3.03.06', '3.03.07', '3.03.08', '3.04.01', '3.05.01'],
  CA: ['1000', '1010', '1200', '2000', '3000', '4000', '4010', '5000', '6100', '6110', '6120', '6130', '6140', '6150', '6160', '6170', '7000', '8000'],
  US: ['1000', '1010', '1200', '2000', '3000', '4000', '4010', '5000', '6100', '6200', '6300', '6400', '6500', '6600', '6700', '6800', '7100', '8100'],
};

const countryReferencePrefix: Record<AccountingCountryCode, string> = {
  MX: 'SAT',
  CO: 'PUC',
  BR: 'SPED',
  CA: 'IFRS-ASPE',
  US: 'US-GAAP',
};

export const accountingCatalogTemplates: AccountingCatalogTemplate[] = accountingCountryOptions.flatMap(country => (
  baseTemplates.map((template, index) => ({
    ...template,
    code: countryCodes[country.code][index],
    countryCode: country.code,
    localReferenceCode: `${countryReferencePrefix[country.code]}-${countryCodes[country.code][index]}`,
    localStandard: country.standard,
    name: countryNames[country.code][template.canonicalKey],
  }))
));

export const catalogTemplateKey = (template: Pick<AccountingCatalogTemplate, 'canonicalKey' | 'countryCode'>) => `${template.countryCode}:${template.canonicalKey}`;

export const accountMatchesCatalogTemplate = (account: AccountingAccount, template: AccountingCatalogTemplate) => {
  const sameCanonical = account.countryCode === template.countryCode && account.canonicalKey === template.canonicalKey;
  const sameCountryCode = account.countryCode === template.countryCode && account.code === template.code;
  const sameLegacyAccount = !account.countryCode && account.code === template.code && account.name.trim().toLowerCase() === template.name.trim().toLowerCase();
  return sameCanonical || sameCountryCode || sameLegacyAccount;
};

export const catalogTemplateToAccount = (template: AccountingCatalogTemplate): AccountingAccount => ({
  id: `catalog-${template.countryCode}-${template.code}`,
  balance: 0,
  canonicalKey: template.canonicalKey,
  code: template.code,
  countryCode: template.countryCode,
  description: template.description,
  importedFromCatalog: true,
  isActive: true,
  localReferenceCode: template.localReferenceCode,
  localStandard: template.localStandard,
  name: template.name,
  statementSection: template.statementSection,
  type: template.type,
});
