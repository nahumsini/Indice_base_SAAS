import { enCACopy } from "./en-CA";
import { enUSCopy } from "./en-US";
import { esCOCopy } from "./es-CO";
import { esMXCopy } from "./es-MX";
import { frCACopy } from "./fr-CA";
import { koCACopy } from "./ko-CA";
import { ptBRCopy } from "./pt-BR";
import { zhCACopy } from "./zh-CA";

export type { AccountCreationCopy } from "./types";

const translations = {
  "en-CA": enCACopy,
  "en-US": enUSCopy,
  "es-MX": esMXCopy,
  "es-CO": esCOCopy,
  "fr-CA": frCACopy,
  "pt-BR": ptBRCopy,
  "ko-CA": koCACopy,
  "zh-CA": zhCACopy,
} as const;

export function getAccountCreationCopy(languageCode: string) {
  return translations[languageCode as keyof typeof translations] ?? enCACopy;
}
