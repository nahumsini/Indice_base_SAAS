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

export type PayrollLocale =
  | 'es-MX'
  | 'es-CO'
  | 'en-US'
  | 'en-CA'
  | 'fr-CA'
  | 'pt-BR'
  | 'ko-CA'
  | 'zh-CA';

export type PayrollTranslations = WidenLiterals<typeof enCA>;
export type PayrollHeaderCopy = PayrollTranslations['header'];
export type PayrollOperationsCopy = PayrollTranslations['operations'];
export type PayrollSetupGuideCopy = PayrollTranslations['setupGuide'];
export type PayrollRunActionsCopy = PayrollTranslations['runActions'];
export type PayrollVariablePayCopy = PayrollTranslations['variablePay'];
