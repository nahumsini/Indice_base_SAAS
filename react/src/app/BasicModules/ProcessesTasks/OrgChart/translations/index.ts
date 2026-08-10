import { enCA } from './en-CA';
import { enUS } from './en-US';
import { esCO } from './es-CO';
import { esMX } from './es-MX';
import { frCA } from './fr-CA';
import { koCA } from './ko-CA';
import { ptBR } from './pt-BR';
import { zhCA } from './zh-CA';
import type { OrgChartLocale, OrgChartTranslations } from './types';

export type { OrgChartTranslations } from './types';
const copies: Record<OrgChartLocale, OrgChartTranslations> = { 'en-CA': enCA, 'en-US': enUS, 'fr-CA': frCA, 'es-MX': esMX, 'es-CO': esCO, 'pt-BR': ptBR, 'ko-CA': koCA, 'zh-CA': zhCA };
export const getOrgChartTranslations = (locale?: string | null) => copies[(locale && locale in copies ? locale : 'en-CA') as OrgChartLocale] ?? enCA;
