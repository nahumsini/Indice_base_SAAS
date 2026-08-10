import { enCA } from "./en-CA";
import { enUS } from "./en-US";
import { esCO } from "./es-CO";
import { esMX } from "./es-MX";
import { frCA } from "./fr-CA";
import { koCA } from "./ko-CA";
import { ptBR } from "./pt-BR";
import { zhCA } from "./zh-CA";
import type {
  BusinessStructureLocale,
  BusinessStructureTranslations,
} from "./types";

export type {
  BusinessStructureLocale,
  BusinessStructureTranslations,
} from "./types";

const translations: Record<
  BusinessStructureLocale,
  BusinessStructureTranslations
> = {
  "en-CA": enCA,
  "en-US": enUS,
  "fr-CA": frCA,
  "es-MX": esMX,
  "es-CO": esCO,
  "pt-BR": ptBR,
  "ko-CA": koCA,
  "zh-CA": zhCA,
};

export function resolveBusinessStructureLocale(
  locale: string | null | undefined,
): BusinessStructureLocale {
  if (locale && locale in translations) {
    return locale as BusinessStructureLocale;
  }
  return "en-CA";
}

export function getBusinessStructureTranslations(
  locale: string | null | undefined,
): BusinessStructureTranslations {
  return translations[resolveBusinessStructureLocale(locale)];
}
