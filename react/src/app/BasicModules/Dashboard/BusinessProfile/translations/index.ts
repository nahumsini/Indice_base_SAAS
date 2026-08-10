import { enCA } from "./en-CA";
import { enUS } from "./en-US";
import { esCO } from "./es-CO";
import { esMX } from "./es-MX";
import { frCA } from "./fr-CA";
import { koCA } from "./ko-CA";
import { ptBR } from "./pt-BR";
import { zhCA } from "./zh-CA";
import type {
  BusinessProfileLocale,
  BusinessProfileTranslations,
} from "./types";

export type {
  BusinessProfileLocale,
  BusinessProfileTranslations,
} from "./types";

const translations: Record<BusinessProfileLocale, BusinessProfileTranslations> =
  {
    "en-CA": enCA,
    "en-US": enUS,
    "fr-CA": frCA,
    "es-MX": esMX,
    "es-CO": esCO,
    "pt-BR": ptBR,
    "ko-CA": koCA,
    "zh-CA": zhCA,
  };

export function resolveBusinessProfileLocale(
  locale: string | null | undefined,
): BusinessProfileLocale {
  if (locale && locale in translations) {
    return locale as BusinessProfileLocale;
  }
  return "en-CA";
}

export function getBusinessProfileTranslations(
  locale: string | null | undefined,
): BusinessProfileTranslations {
  return translations[resolveBusinessProfileLocale(locale)];
}
