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

export type AssetsLocale =
  | 'es-MX'
  | 'es-CO'
  | 'en-US'
  | 'en-CA'
  | 'fr-CA'
  | 'pt-BR'
  | 'ko-CA'
  | 'zh-CA';

export type AssetsTranslations = WidenLiterals<typeof enCA>;
export type AssetHeaderCopy = Pick<AssetsTranslations, 'title' | 'subtitle' | 'newAsset' | 'columnPicker' | 'preferredCurrency' | 'exchangeRates'>;
export type AssetFiltersCopy = Pick<AssetsTranslations, 'filtersPanel' | 'filters' | 'addNewAsset'>;
export type AssetKpiCopy = Pick<AssetsTranslations, 'cards' | 'kpis'>;
export type AssetColumnPickerCopy = AssetsTranslations['columnPicker'];
export type AssetDetailsCopy = Pick<AssetsTranslations, 'detailsModal' | 'filters' | 'addNewAsset' | 'emptyValue'>;
export type AddNewAssetCopy = AssetsTranslations['addNewAsset'];
