import type { enCA } from './en-CA';

type WidenLiterals<T> = T extends (...args: infer Args) => infer Return
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

export type PurchaseOrderLocale = 'en-CA' | 'en-US' | 'es-MX' | 'es-CO' | 'fr-CA' | 'pt-BR' | 'ko-CA' | 'zh-CA';
export type PurchaseOrderTranslations = WidenLiterals<typeof enCA>;
