import type { enCA } from './en-CA';

export type PettyCashLocale =
  | 'es-MX'
  | 'es-CO'
  | 'en-US'
  | 'en-CA'
  | 'fr-CA'
  | 'pt-BR'
  | 'ko-CA'
  | 'zh-CA';

export type WidenLiterals<T> = T extends (...args: infer Args) => infer Return
  ? (...args: Args) => WidenLiterals<Return>
  : T extends string
    ? string
    : T extends number
      ? number
      : T extends boolean
        ? boolean
        : T extends null | undefined
          ? T
          : T extends readonly (infer Item)[]
            ? WidenLiterals<Item>[]
            : T extends object
              ? { [Key in keyof T]: WidenLiterals<T[Key]> }
              : T;

export type PettyCashTranslations = WidenLiterals<typeof enCA>;
