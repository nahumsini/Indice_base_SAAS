import { useLanguage } from "../../../shared/context";
import { copy as enCA } from "./en-CA";
import { copy as esMX } from "./es-MX";
import { copy as frCA } from "./fr-CA";
import { copy as ptBR } from "./pt-BR";
import { copy as koCA } from "./ko-CA";
import { copy as zhCA } from "./zh-CA";
import type { TrainingProgramCopy, TrainingProgramLocale } from "./types";
export type { TrainingProgramCopy, TrainingProgramLocale } from "./types";

const copies: Record<TrainingProgramLocale, TrainingProgramCopy> = {
  "en-CA": enCA, "en-US": enCA, "es-MX": esMX, "es-CO": esMX,
  "fr-CA": frCA, "pt-BR": ptBR, "ko-CA": koCA, "zh-CA": zhCA,
};
export function getTrainingProgramLocale(value: string): TrainingProgramLocale {
  return Object.prototype.hasOwnProperty.call(copies, value) ? value as TrainingProgramLocale : "en-CA";
}
export function getTrainingProgramCopy(value: string): TrainingProgramCopy {
  return copies[getTrainingProgramLocale(value)];
}
export function useTrainingProgramCopy() {
  const { currentLanguage } = useLanguage();
  const locale = getTrainingProgramLocale(currentLanguage.code);
  return { locale, copy: copies[locale] };
}
export function trainingProgramText(template: string, values: Record<string, string | number>, locale: TrainingProgramLocale = "en-CA") {
  return template.replace(/\{([a-zA-Z0-9]+)\}/g, (token, key: string) => typeof values[key] === "number" ? new Intl.NumberFormat(locale).format(values[key] as number) : String(values[key] ?? token));
}
export function trainingProgramNumber(value: number, locale: TrainingProgramLocale) {
  return new Intl.NumberFormat(locale).format(value);
}
