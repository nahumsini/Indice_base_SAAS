export type DocumentPrintCategory =
  | 'executive-report'
  | 'operational-report'
  | 'tab-print'
  | 'transaction-document'
  | 'legal-document'
  | 'thermal-document';

export type DocumentPrintModifier =
  | 'approval-required'
  | 'confidential'
  | 'customer-facing'
  | 'employee-facing'
  | 'fiscal'
  | 'internal'
  | 'legal'
  | 'multi-currency'
  | 'signature-required'
  | 'thermal'
  | 'white-label';

export type DocumentPageSize = 'a4' | 'letter' | '58mm' | '80mm';
export type DocumentPageOrientation = 'portrait' | 'landscape';

export interface DocumentPrintContract {
  category: DocumentPrintCategory;
  modifiers: DocumentPrintModifier[];
  orientation: DocumentPageOrientation;
  pageSize: DocumentPageSize;
  version: string;
}

export const documentPrintAttribution = 'Powered by www.indiceapp.com';

export const getDocumentPrintLabels = (locale: string) => {
  const language = locale.toLowerCase().split('-')[0];
  return ({
    en: { page: 'Page', updated: 'Updated' },
    es: { page: 'Página', updated: 'Actualizado' },
    fr: { page: 'Page', updated: 'Mis à jour' },
    ko: { page: '페이지', updated: '업데이트' },
    pt: { page: 'Página', updated: 'Atualizado' },
    zh: { page: '页', updated: '更新' },
  } as Record<string, { page: string; updated: string }>)[language]
    ?? { page: 'Page', updated: 'Updated' };
};

export const formatDocumentPrintDateTime = (
  date: Date,
  locale: string,
) => new Intl.DateTimeFormat(locale, {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(date);
