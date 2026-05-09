import type { enCA } from './en-CA';

type WidenLiterals<T> =
  T extends (...args: infer Args) => infer Return
    ? (...args: Args) => Return
    : T extends string
      ? string
      : T extends number
        ? number
        : T extends boolean
          ? boolean
          : T extends readonly (infer Item)[]
            ? ReadonlyArray<WidenLiterals<Item>>
            : T extends object
              ? { readonly [Key in keyof T]: WidenLiterals<T[Key]> }
              : T;

export type RecordsLocale =
  | 'es-MX'
  | 'es-CO'
  | 'en-US'
  | 'en-CA'
  | 'fr-CA'
  | 'pt-BR'
  | 'ko-CA'
  | 'zh-CA';

export type RecordsTranslations = WidenLiterals<typeof enCA>;
export type RecordHeaderCopy = Pick<RecordsTranslations, 'title' | 'subtitle' | 'actions'>;
export type RecordFiltersCopy = Pick<RecordsTranslations, 'filters' | 'types' | 'severity' | 'status'>;
export type RecordKpiCopy = RecordsTranslations['kpis'];
export type RecordColumnsModalCopy = RecordsTranslations['columnsModal'];
export type RecordsListCopy = Pick<RecordsTranslations, 'columns' | 'types' | 'severity' | 'list' | 'actions'>;
export type RecordDetailCopy = Pick<RecordsTranslations, 'types' | 'severity' | 'status' | 'detail' | 'actions'>;
export type CreateRecordModalCopy = Pick<
  RecordsTranslations,
  'modal' | 'types' | 'typeDescriptions' | 'titleSuggestions' | 'severity' | 'status'
>;
