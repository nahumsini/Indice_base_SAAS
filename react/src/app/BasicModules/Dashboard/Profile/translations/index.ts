import { enCA } from "./en-CA";
import { enUS } from "./en-US";
import { esCO } from "./es-CO";
import { esMX } from "./es-MX";
import { frCA } from "./fr-CA";
import { koCA } from "./ko-CA";
import { ptBR } from "./pt-BR";
import { zhCA } from "./zh-CA";
import type { ProfileLocale, ProfileTranslations } from "./types";

export type { ProfileLocale, ProfileTranslations } from "./types";

const translations: Record<ProfileLocale, ProfileTranslations> = {
  "en-CA": enCA,
  "en-US": enUS,
  "fr-CA": frCA,
  "es-MX": esMX,
  "es-CO": esCO,
  "pt-BR": ptBR,
  "ko-CA": koCA,
  "zh-CA": zhCA,
};

export function resolveProfileLocale(
  locale: string | null | undefined,
): ProfileLocale {
  if (locale && locale in translations) {
    return locale as ProfileLocale;
  }
  return "en-CA";
}

export function getProfileTranslations(
  locale: string | null | undefined,
): ProfileTranslations {
  return translations[resolveProfileLocale(locale)];
}
