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

export type SalesLocale =
  | 'en-CA'
  | 'en-US'
  | 'fr-CA'
  | 'es-MX'
  | 'es-CO'
  | 'pt-BR'
  | 'ko-CA'
  | 'zh-CA';

export type SalesTranslations = WidenLiterals<typeof enCA>;
