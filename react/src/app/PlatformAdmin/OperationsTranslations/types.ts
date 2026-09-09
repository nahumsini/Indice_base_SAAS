import type { copy } from "./en-CA";
export type OperationsCopy = { [Key in keyof typeof copy]: string };
export type OperationsLocale = "en-CA" | "en-US" | "es-MX" | "es-CO" | "fr-CA" | "pt-BR" | "ko-CA" | "zh-CA";
