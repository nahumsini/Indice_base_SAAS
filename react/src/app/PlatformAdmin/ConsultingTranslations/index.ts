import { useLanguage } from "../../shared/context";
import { copy as enCA } from "./en-CA";
import { copy as esMX } from "./es-MX";
import { copy as frCA } from "./fr-CA";
import { copy as ptBR } from "./pt-BR";
import { copy as koCA } from "./ko-CA";
import { copy as zhCA } from "./zh-CA";
import type { ConsultingCopy, ConsultingLocale } from "./types";
export type { ConsultingCopy, ConsultingLocale } from "./types";

const copies: Record<ConsultingLocale, ConsultingCopy> = {
  "en-CA": enCA, "en-US": enCA, "es-MX": esMX, "es-CO": esMX,
  "fr-CA": frCA, "pt-BR": ptBR, "ko-CA": koCA, "zh-CA": zhCA,
};
export function getConsultingLocale(value: string): ConsultingLocale {
  return Object.prototype.hasOwnProperty.call(copies, value) ? value as ConsultingLocale : "en-CA";
}
export function getConsultingCopy(value: string): ConsultingCopy {
  return copies[getConsultingLocale(value)];
}
export function useConsultingCopy() {
  const { currentLanguage } = useLanguage();
  const locale = getConsultingLocale(currentLanguage.code);
  return { locale, copy: copies[locale] };
}
export function consultingText(template: string, values: Record<string, string | number>) {
  return template.replace(/\{([a-zA-Z]+)\}/g, (token, key: string) => String(values[key] ?? token));
}
export function consultingNumber(value: number, locale: ConsultingLocale) {
  return new Intl.NumberFormat(locale).format(value);
}
export function consultingWeekdays(locale: ConsultingLocale) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(Date.UTC(2026, 0, 5 + index));
    return {
      id: index + 1,
      label: new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(day),
      short: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(day),
    };
  });
}
