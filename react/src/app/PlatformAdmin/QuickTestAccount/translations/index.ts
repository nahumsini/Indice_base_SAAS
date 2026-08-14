import { enCAQuickTestCopy } from "./en-CA";
import { enUSQuickTestCopy } from "./en-US";
import { esCOQuickTestCopy } from "./es-CO";
import { esMXQuickTestCopy } from "./es-MX";
import { frCAQuickTestCopy } from "./fr-CA";
import { koCAQuickTestCopy } from "./ko-CA";
import { ptBRQuickTestCopy } from "./pt-BR";
import { zhCAQuickTestCopy } from "./zh-CA";

export type { QuickTestAccountCopy } from "./types";

const quickTestTranslations = {
  "en-CA": enCAQuickTestCopy,
  "en-US": enUSQuickTestCopy,
  "es-MX": esMXQuickTestCopy,
  "es-CO": esCOQuickTestCopy,
  "fr-CA": frCAQuickTestCopy,
  "pt-BR": ptBRQuickTestCopy,
  "ko-CA": koCAQuickTestCopy,
  "zh-CA": zhCAQuickTestCopy,
} as const;

export function getQuickTestAccountCopy(languageCode: string) {
  return quickTestTranslations[
    languageCode as keyof typeof quickTestTranslations
  ] ?? enCAQuickTestCopy;
}
