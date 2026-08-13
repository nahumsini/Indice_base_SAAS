import type { PlatformAccountCreatePayload } from "../../api/platformAdmin";
import type { AccountCreationStep } from "../accountCreationDraft";

export const INCLUDED_ACCOUNT_SEATS = 5;
export const MAX_ACCOUNT_EXTRA_SEATS = 500;
export const MAX_ACCOUNT_EMPLOYEES =
  INCLUDED_ACCOUNT_SEATS + MAX_ACCOUNT_EXTRA_SEATS;

export function requiredExtraSeats(employeeCount: number) {
  if (!Number.isFinite(employeeCount)) return 0;
  return Math.max(0, Math.trunc(employeeCount) - INCLUDED_ACCOUNT_SEATS);
}

export const emptyAccountCreationForm: PlatformAccountCreatePayload = {
  company_name: "",
  account_type: "SUPER_ADMIN",
  owner_name: "",
  owner_email: "",
  temporary_password: "",
  country_code: "MX",
  phone: "",
  industry: "",
  company_size: "",
  employee_count: 0,
  product_codes: [],
  extra_seats: 0,
  access_days: 30,
  permanent: false,
};

export const accountCreationSteps = [
  { id: "company", labelKey: "company" },
  { id: "owner", labelKey: "owner" },
  { id: "access", labelKey: "access" },
] as const;

export function generateTemporaryPassword() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const random = crypto.getRandomValues(new Uint32Array(12));
  return `Indice-${Array.from(random, (value) => letters[value % letters.length]).join("")}!`;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function creationErrorStep(message: string): AccountCreationStep {
  const normalized = message.toLocaleLowerCase();
  if (/correo|email|contrase|password|tel[eé]fono|phone/.test(normalized)) {
    return "owner";
  }
  if (/empresa|company|pa[ií]s|country/.test(normalized)) return "company";
  return "access";
}

export function humanizeCapability(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}

export async function writeClipboard(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
  } catch {
    // Fall back to a temporary selection when clipboard permissions are blocked.
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) throw new Error("Clipboard write failed.");
}
