import type { PlatformAccountCreatePayload } from "../api/platformAdmin";

export type AccountCreationStep = "company" | "owner" | "access";

type SafeAccountCreationForm = Omit<
  PlatformAccountCreatePayload,
  "temporary_password"
>;

export type AccountCreationDraft = {
  step: AccountCreationStep;
  form: SafeAccountCreationForm;
};

const draftStorageKey = "indice:platform-admin:account-creation-draft:v1";
const validSteps = new Set<AccountCreationStep>(["company", "owner", "access"]);

const sessionStorageOrNull = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export const readAccountCreationDraft = (): AccountCreationDraft | null => {
  const storage = sessionStorageOrNull();
  if (!storage) return null;

  try {
    const parsed = JSON.parse(storage.getItem(draftStorageKey) || "null") as {
      step?: unknown;
      form?: unknown;
    } | null;
    if (
      !parsed ||
      typeof parsed.step !== "string" ||
      !validSteps.has(parsed.step as AccountCreationStep) ||
      !parsed.form ||
      typeof parsed.form !== "object"
    ) {
      return null;
    }

    return {
      step: parsed.step as AccountCreationStep,
      form: parsed.form as SafeAccountCreationForm,
    };
  } catch {
    storage.removeItem(draftStorageKey);
    return null;
  }
};

export const saveAccountCreationDraft = (
  step: AccountCreationStep,
  form: PlatformAccountCreatePayload,
) => {
  const storage = sessionStorageOrNull();
  if (!storage) return;

  // Never persist the temporary password. A fresh one is generated when the
  // wizard is restored after authentication or a page reload.
  const { temporary_password: omittedPassword, ...safeForm } = form;
  void omittedPassword;
  storage.setItem(draftStorageKey, JSON.stringify({ step, form: safeForm }));
};

export const clearAccountCreationDraft = () => {
  sessionStorageOrNull()?.removeItem(draftStorageKey);
};

export const hasAccountCreationDraft = () => readAccountCreationDraft() !== null;
