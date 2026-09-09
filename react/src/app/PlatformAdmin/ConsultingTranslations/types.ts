import type { copy } from "./en-CA";

export type ConsultingCopy = { [Key in keyof typeof copy]: string };
export type ConsultingLocale = "en-CA" | "en-US" | "es-MX" | "es-CO" | "fr-CA" | "pt-BR" | "ko-CA" | "zh-CA";
