import { useLanguage } from "../../shared/context";
import { copy as enCA } from "./en-CA";
import { copy as esMX } from "./es-MX";
import { copy as frCA } from "./fr-CA";
import { copy as ptBR } from "./pt-BR";
import { copy as koCA } from "./ko-CA";
import { copy as zhCA } from "./zh-CA";
import type { OperationsCopy, OperationsLocale } from "./types";
export type { OperationsCopy, OperationsLocale } from "./types";

const copies: Record<OperationsLocale, OperationsCopy> = {
  "en-CA": enCA, "en-US": enCA, "es-MX": esMX, "es-CO": esMX,
  "fr-CA": frCA, "pt-BR": ptBR, "ko-CA": koCA, "zh-CA": zhCA,
};
export function getOperationsLocale(value: string): OperationsLocale {
  return Object.prototype.hasOwnProperty.call(copies, value) ? value as OperationsLocale : "en-CA";
}
export function getOperationsCopy(value: string): OperationsCopy {
  return copies[getOperationsLocale(value)];
}
export function useOperationsCopy() {
  const { currentLanguage } = useLanguage();
  const locale = getOperationsLocale(currentLanguage.code);
  return { locale, copy: copies[locale] };
}
export function operationsText(template: string, values: Record<string, string | number>, locale: OperationsLocale = "en-CA") {
  return template.replace(/\{([a-zA-Z0-9]+)\}/g, (token, key: string) => typeof values[key] === "number" ? new Intl.NumberFormat(locale).format(values[key] as number) : String(values[key] ?? token));
}
export function operationsNumber(value: number, locale: OperationsLocale) {
  return new Intl.NumberFormat(locale).format(value);
}

/** Labels for known operational states; unknown provider codes remain intact. */
export function operationsStatus(value: string | null | undefined, locale: OperationsLocale): string {
  const copy = getOperationsCopy(locale);
  const labels: Record<string, string> = {
    ACTIVE: copy.active, INACTIVE: copy.inactive, TRIAL: copy.trialing, TRIALING: copy.trialing,
    PAID: copy.paid, SUCCESS: copy.success, SUCCEEDED: copy.success, CORRECTO: copy.success,
    FAILED: copy.failed, BLOCKED: copy.blocked, PAST_DUE: copy.pastDue, UNPAID: copy.unpaid,
    SUSPENDED: copy.suspended, READ_ONLY: copy.readOnly, READONLY: copy.readOnly, RESTRICTED: copy.restricted,
    CANCELED: copy.cancelled, CANCELLED: copy.cancelled, PAUSED: copy.paused,
    INCOMPLETE: copy.incomplete, INCOMPLETE_EXPIRED: copy.expired, EXPIRED: copy.expired,
    OPEN: copy.open, VOID: copy.voided, VOIDED: copy.voided, UNCOLLECTIBLE: copy.uncollectible,
    REFUNDED: copy.refunded, PENDING: copy.pending, FULL: copy.fullAccess, FULL_ACCESS: copy.fullAccess,
    GRACE: copy.gracePeriod, GRACE_PERIOD: copy.gracePeriod, DELETED: copy.deleted,
    PAYMENT_ONLY: copy.paymentOnly, PLATFORM_ROOT: copy.platformRoot,
    USER: copy.user, ADMIN: copy.admin, SUPERADMIN: copy.superAdmin, ROOT: copy.root,
  };
  return value ? labels[value.toUpperCase()] ?? value : copy.notAvailable;
}
