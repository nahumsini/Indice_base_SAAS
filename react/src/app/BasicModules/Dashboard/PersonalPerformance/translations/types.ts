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
            ? Array<WidenLiterals<Item>>
            : T extends object
              ? { [Key in keyof T]: WidenLiterals<T[Key]> }
              : T;

export type PersonalPerformanceLocale =
  | 'es-MX'
  | 'es-CO'
  | 'en-US'
  | 'en-CA'
  | 'fr-CA'
  | 'pt-BR'
  | 'ko-CA'
  | 'zh-CA';

export type PersonalPerformanceTranslations = WidenLiterals<typeof enCA>;
export type PersonalPerformancePdfCopy = PersonalPerformanceTranslations['pdf'];
export type PersonalPerformancePdfEditorialCopy = PersonalPerformancePdfCopy['editorial'];
