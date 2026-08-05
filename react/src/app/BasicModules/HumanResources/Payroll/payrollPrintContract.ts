import type { PayrollLineItem, PayrollRunLine } from '../../../api/humanResources';
import type { DocumentPrintContract } from '../../shared/print/documentPrintContract';

export const payrollRunPrintContract = {
  category: 'operational-report',
  modifiers: ['confidential', 'internal', 'fiscal', 'multi-currency'],
  orientation: 'landscape',
  pageSize: 'a4',
  version: '1.0',
} as const satisfies DocumentPrintContract;

export const payrollLinePrintContract = {
  category: 'legal-document',
  modifiers: ['confidential', 'employee-facing', 'fiscal'],
  orientation: 'landscape',
  pageSize: 'a4',
  version: '1.0',
} as const satisfies DocumentPrintContract;

type SupportedLanguage = 'en' | 'es' | 'fr' | 'pt';

type JurisdictionCopy = {
  calculationFramework: string;
  calculationModeFiscal: string;
  calculationModeOperational: string;
  complianceActive: string;
  complianceOperational: string;
  frameworkByCode: Record<string, string>;
  globalJurisdiction: string;
  legalEvidence: string;
  localeByCode: Record<string, string>;
  noLegalEvidence: string;
};

const jurisdictionCopy: Record<SupportedLanguage, JurisdictionCopy> = {
  es: {
    calculationFramework: 'Marco de cálculo',
    calculationModeFiscal: 'Nómina fiscal',
    calculationModeOperational: 'Nómina operativa',
    complianceActive: 'Proveedor estatutario activo',
    complianceOperational: 'Estimación operativa; no acredita cumplimiento fiscal',
    frameworkByCode: {
      MX: 'ISR · IMSS · INFONAVIT · SAR',
      CO: 'Retención · PILA · Seguridad social · Parafiscales',
      US: 'Retención federal/estatal · FICA · FUTA/SUTA',
      CA_STANDARD: 'Impuesto federal/provincial · CPP · EI',
      CA_QUEBEC: 'Impuesto federal/Quebec · QPP · QPIP · EI',
      BR: 'INSS · IRRF · FGTS · RAT/Terceros',
    },
    globalJurisdiction: 'Jurisdicción global',
    legalEvidence: 'Referencias registradas',
    localeByCode: {
      MX: 'México',
      CO: 'Colombia',
      US: 'Estados Unidos',
      CA_STANDARD: 'Canadá',
      CA_QUEBEC: 'Quebec, Canadá',
      BR: 'Brasil',
    },
    noLegalEvidence: 'Sin referencias normativas registradas en esta línea',
  },
  en: {
    calculationFramework: 'Calculation framework',
    calculationModeFiscal: 'Statutory payroll',
    calculationModeOperational: 'Operational payroll',
    complianceActive: 'Statutory provider active',
    complianceOperational: 'Operational estimate; does not evidence statutory compliance',
    frameworkByCode: {
      MX: 'ISR · IMSS · INFONAVIT · SAR',
      CO: 'Withholding · PILA · Social security · Parafiscals',
      US: 'Federal/state withholding · FICA · FUTA/SUTA',
      CA_STANDARD: 'Federal/provincial tax · CPP · EI',
      CA_QUEBEC: 'Federal/Quebec tax · QPP · QPIP · EI',
      BR: 'INSS · IRRF · FGTS · RAT/third parties',
    },
    globalJurisdiction: 'Global jurisdiction',
    legalEvidence: 'Recorded references',
    localeByCode: {
      MX: 'Mexico',
      CO: 'Colombia',
      US: 'United States',
      CA_STANDARD: 'Canada',
      CA_QUEBEC: 'Quebec, Canada',
      BR: 'Brazil',
    },
    noLegalEvidence: 'No statutory references are recorded for this line',
  },
  fr: {
    calculationFramework: 'Cadre de calcul',
    calculationModeFiscal: 'Paie statutaire',
    calculationModeOperational: 'Paie opérationnelle',
    complianceActive: 'Fournisseur statutaire actif',
    complianceOperational: 'Estimation opérationnelle; ne prouve pas la conformité',
    frameworkByCode: {
      MX: 'ISR · IMSS · INFONAVIT · SAR',
      CO: 'Retenue · PILA · Sécurité sociale · Parafiscaux',
      US: 'Retenue fédérale/provinciale · FICA · FUTA/SUTA',
      CA_STANDARD: 'Impôt fédéral/provincial · RPC · AE',
      CA_QUEBEC: 'Impôt fédéral/Québec · RRQ · RQAP · AE',
      BR: 'INSS · IRRF · FGTS · RAT/Tiers',
    },
    globalJurisdiction: 'Juridiction globale',
    legalEvidence: 'Références enregistrées',
    localeByCode: {
      MX: 'Mexique',
      CO: 'Colombie',
      US: 'États-Unis',
      CA_STANDARD: 'Canada',
      CA_QUEBEC: 'Québec, Canada',
      BR: 'Brésil',
    },
    noLegalEvidence: 'Aucune référence statutaire enregistrée pour cette ligne',
  },
  pt: {
    calculationFramework: 'Marco de cálculo',
    calculationModeFiscal: 'Folha legal',
    calculationModeOperational: 'Folha operacional',
    complianceActive: 'Provedor legal ativo',
    complianceOperational: 'Estimativa operacional; não comprova conformidade legal',
    frameworkByCode: {
      MX: 'ISR · IMSS · INFONAVIT · SAR',
      CO: 'Retenção · PILA · Previdência social · Parafiscais',
      US: 'Retenção federal/estadual · FICA · FUTA/SUTA',
      CA_STANDARD: 'Imposto federal/provincial · CPP · EI',
      CA_QUEBEC: 'Imposto federal/Quebec · QPP · QPIP · EI',
      BR: 'INSS · IRRF · FGTS · RAT/Terceiros',
    },
    globalJurisdiction: 'Jurisdição global',
    legalEvidence: 'Referências registradas',
    localeByCode: {
      MX: 'México',
      CO: 'Colômbia',
      US: 'Estados Unidos',
      CA_STANDARD: 'Canadá',
      CA_QUEBEC: 'Quebec, Canadá',
      BR: 'Brasil',
    },
    noLegalEvidence: 'Nenhuma referência legal registrada para esta linha',
  },
};

const normalizeCode = (value?: string | null) => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/[-\s]+/g, '_');

const resolveLanguage = (locale: string): SupportedLanguage => {
  const language = locale.trim().toLowerCase().split('-')[0];
  return language === 'es' || language === 'fr' || language === 'pt' ? language : 'en';
};

const resolveJurisdictionCode = (line: Pick<PayrollRunLine, 'country_code' | 'jurisdiction_code'>) => {
  const country = normalizeCode(line.country_code);
  const jurisdiction = normalizeCode(line.jurisdiction_code);

  if (country === 'CA' || country === 'CANADA') {
    return ['QC', 'QUEBEC', 'QUÉBEC', 'CA_QUEBEC'].includes(jurisdiction) ? 'CA_QUEBEC' : 'CA_STANDARD';
  }
  if (['US', 'USA', 'UNITED_STATES'].includes(country)) return 'US';
  if (['MX', 'MEXICO', 'MÉXICO'].includes(country)) return 'MX';
  if (['CO', 'COLOMBIA'].includes(country)) return 'CO';
  if (['BR', 'BRAZIL', 'BRASIL'].includes(country)) return 'BR';
  return country || jurisdiction || 'GLOBAL';
};

const uniqueText = (values: Array<string | null | undefined>) => Array.from(new Set(
  values.map((value) => String(value || '').trim()).filter(Boolean),
));

export type PayrollPrintJurisdictionContext = {
  calculationFrameworkLabel: string;
  calculationModeLabel: string;
  code: string;
  complianceLabel: string;
  evidenceLabel: string;
  evidenceReferences: string[];
  framework: string;
  label: string;
};

export const resolvePayrollPrintJurisdiction = (
  line: PayrollRunLine,
  locale: string,
): PayrollPrintJurisdictionContext => {
  const language = resolveLanguage(locale);
  const copy = jurisdictionCopy[language];
  const code = resolveJurisdictionCode(line);
  const treatment = String(line.payroll_treatment || '').trim().toLowerCase();
  const fiscal = line.include_in_fiscal && !['operational_payroll', 'no_payroll'].includes(treatment);
  const jurisdiction = String(line.jurisdiction_code || '').trim();
  const baseLabel = copy.localeByCode[code] || jurisdiction || copy.globalJurisdiction;
  const regionalJurisdiction = jurisdiction
    && !['MX', 'CO', 'BR', 'US', 'USA', 'CA', 'CANADA', code].includes(normalizeCode(jurisdiction))
    ? jurisdiction
    : '';
  const evidenceReferences = uniqueText(line.items.flatMap((item: PayrollLineItem) => [
    item.legal_classification,
    item.rule_code,
    item.tax_treatment,
  ])).slice(0, 8);

  return {
    calculationFrameworkLabel: copy.calculationFramework,
    calculationModeLabel: fiscal ? copy.calculationModeFiscal : copy.calculationModeOperational,
    code,
    complianceLabel: fiscal && line.statutory_compliance !== false
      ? copy.complianceActive
      : copy.complianceOperational,
    evidenceLabel: copy.legalEvidence,
    evidenceReferences: evidenceReferences.length > 0 ? evidenceReferences : [copy.noLegalEvidence],
    framework: copy.frameworkByCode[code] || copy.noLegalEvidence,
    label: regionalJurisdiction ? `${regionalJurisdiction} · ${baseLabel}` : baseLabel,
  };
};
