import type { enCA } from './en-CA';

type Widen<T> = T extends (...args: infer A) => infer R ? (...args: A) => R : T extends string ? string : T extends object ? { readonly [K in keyof T]: Widen<T[K]> } : T;
export type OrgChartTranslations = Widen<typeof enCA>;
export type OrgChartLocale = 'en-CA' | 'en-US' | 'fr-CA' | 'es-MX' | 'es-CO' | 'pt-BR' | 'ko-CA' | 'zh-CA';
