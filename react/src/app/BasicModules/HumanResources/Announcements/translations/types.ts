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

export type AnnouncementsLocale =
  | 'es-MX'
  | 'es-CO'
  | 'en-US'
  | 'en-CA'
  | 'fr-CA'
  | 'pt-BR'
  | 'ko-CA'
  | 'zh-CA';

export type AnnouncementsTranslations = WidenLiterals<typeof enCA>;
export type AnnouncementHeaderCopy = AnnouncementsTranslations['actions'] & Pick<AnnouncementsTranslations, 'pageTitle' | 'pageSubtitle'>;
export type AnnouncementFiltersCopy = AnnouncementsTranslations['filters'];
export type AnnouncementKpiCopy = AnnouncementsTranslations['kpis'];
export type AnnouncementTableCopy = Pick<
  AnnouncementsTranslations,
  'table' | 'typeLabels' | 'statusLabels' | 'previews' | 'audienceLabels' | 'feedback'
>;
export type AnnouncementColumnsModalCopy = AnnouncementsTranslations['columnsModal'];
export type AnnouncementDetailCopy = AnnouncementsTranslations['detail'];
export type CreateAnnouncementModalCopy = AnnouncementsTranslations['modal'];
