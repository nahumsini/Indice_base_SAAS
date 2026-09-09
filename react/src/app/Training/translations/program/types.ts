import type { copy } from "./en-CA";
export type TrainingProgramCopy = { [Key in keyof typeof copy]: string };
export type TrainingProgramLocale = "en-CA" | "en-US" | "es-MX" | "es-CO" | "fr-CA" | "pt-BR" | "ko-CA" | "zh-CA";
