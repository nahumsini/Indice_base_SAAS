import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import type {
  EditablePlatformAccountType,
  PlatformAccountCreatePayload,
  PlatformAccountCreateResult,
  PlatformCatalogProduct,
} from "../../../api/platformAdmin";
import { ApiClientError } from "../../../lib/apiClient";
import { isValidAccountPassword } from "../../../shared/validation/password";
import { validatePhoneForCountry } from "../../../shared/validation/phone";
import {
  clearAccountCreationDraft,
  readAccountCreationDraft,
  saveAccountCreationDraft,
  type AccountCreationStep,
} from "../../accountCreationDraft";
import {
  accountCreationSteps,
  creationErrorStep,
  emptyAccountCreationForm,
  generateTemporaryPassword,
  INCLUDED_ACCOUNT_SEATS,
  normalizeEmail,
  requiredExtraSeats,
} from "../accountCreationUtils";
import type {
  AccountCreationFocusField,
  CreatedAccountAccess,
} from "../types";
import type { AccountCreationCopy } from "../translations";

type UseAccountCreationFlowProps = {
  products: PlatformCatalogProduct[];
  existingOwnerEmails: string[];
  copy: AccountCreationCopy;
  onClose: () => void;
  onCreate: (
    payload: PlatformAccountCreatePayload,
  ) => Promise<PlatformAccountCreateResult>;
  lockedAccountType?: EditablePlatformAccountType;
  initialForm?: Partial<PlatformAccountCreatePayload>;
  initialStep?: AccountCreationStep;
  returnTo?: string;
};

export function useAccountCreationFlow({
  products,
  existingOwnerEmails,
  copy,
  onClose,
  onCreate,
  lockedAccountType,
  initialForm,
  initialStep,
  returnTo = "/platform-admin",
}: UseAccountCreationFlowProps) {
  const navigate = useNavigate();
  const selectableProducts = useMemo(
    () => {
      const versionedOffer = products.some((product) => product.commercial_model);
      return products.filter(
        (product) =>
          product.active &&
          product.commercially_available !== false &&
          (versionedOffer
            ? ["MODULE", "PACKAGE"].includes(product.commercial_kind || "MODULE")
            : ["BASIC", "ADDON"].includes(product.product_type.toUpperCase())),
      );
    },
    [products],
  );
  const restoredDraft = useMemo(
    () => (initialForm ? null : readAccountCreationDraft()),
    [initialForm],
  );
  const knownOwnerEmails = useMemo(
    () => new Set(existingOwnerEmails.map(normalizeEmail).filter(Boolean)),
    [existingOwnerEmails],
  );
  const [form, setForm] = useState<PlatformAccountCreatePayload>(() => {
    const sourceForm = initialForm ?? restoredDraft?.form;
    const restoredEmployees = Number(sourceForm?.employee_count);
    const employeeCount = Number.isInteger(restoredEmployees) && restoredEmployees > 0
      ? restoredEmployees
      : sourceForm
        ? INCLUDED_ACCOUNT_SEATS + Number(sourceForm.extra_seats || 0)
        : 0;
    return {
      ...emptyAccountCreationForm,
      ...sourceForm,
      account_type: lockedAccountType ?? sourceForm?.account_type ?? emptyAccountCreationForm.account_type,
      employee_count: employeeCount,
      extra_seats: requiredExtraSeats(employeeCount),
      temporary_password: generateTemporaryPassword(),
      product_codes: sourceForm
        ? (sourceForm.product_codes ?? []).filter((code) =>
            selectableProducts.some((product) => product.product_code === code),
          )
        : [],
    };
  });
  const [step, setStep] = useState<AccountCreationStep>(
    initialStep ?? restoredDraft?.step ?? "company",
  );
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedAccountAccess | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [focusField, setFocusField] =
    useState<AccountCreationFocusField>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const companyNameRef = useRef<HTMLInputElement>(null);
  const ownerEmailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const stepIndex = accountCreationSteps.findIndex((item) => item.id === step);

  useEffect(() => {
    if (!created) saveAccountCreationDraft(step, form);
  }, [created, form, step]);

  useEffect(() => {
    if (!focusField) return;
    const fields = {
      company_name: companyNameRef,
      owner_email: ownerEmailRef,
      phone: phoneRef,
      temporary_password: passwordRef,
    };
    const field = fields[focusField]?.current;
    if (!field) return;
    field.focus();
    field.select();
    setFocusField(null);
  }, [focusField, step]);

  const updateForm = (patch: Partial<PlatformAccountCreatePayload>) => {
    setError("");
    setSessionExpired(false);
    setForm((current) => {
      const updated = {
        ...current,
        ...patch,
        account_type: lockedAccountType ?? patch.account_type ?? current.account_type,
      };
      return {
        ...updated,
        extra_seats: requiredExtraSeats(updated.employee_count),
      };
    });
  };

  const closeModal = () => {
    clearAccountCreationDraft();
    onClose();
  };

  const goBack = () => {
    setError("");
    if (stepIndex === 0) closeModal();
    else setStep(accountCreationSteps[stepIndex - 1].id);
  };

  const advance = () => {
    if (!formRef.current?.reportValidity()) return;
    if (step === "owner") {
      const normalizedEmail = normalizeEmail(form.owner_email);
      if (knownOwnerEmails.has(normalizedEmail)) {
        setError(copy.errors.duplicateEmail);
        setFocusField("owner_email");
        return;
      }
      if (form.phone?.trim()) {
        const validation = validatePhoneForCountry(
          form.phone,
          form.country_code,
        );
        if (!validation.ok) {
          setError(copy.errors.invalidPhone);
          setFocusField("phone");
          return;
        }
        setForm((current) => ({
          ...current,
          phone: validation.international,
        }));
      }
      if (!isValidAccountPassword(form.temporary_password)) {
        setError(copy.errors.password);
        setFocusField("temporary_password");
        return;
      }
    }
    setError("");
    setStep(accountCreationSteps[Math.min(stepIndex + 1, 2)].id);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (step !== "access") {
      advance();
      return;
    }
    if (saving) return;
    const versionedOffer = selectableProducts.some((product) => product.commercial_model);
    const hasRequiredProduct = selectableProducts.some(
      (product) => form.product_codes.includes(product.product_code)
        && (versionedOffer || product.product_type.toUpperCase() === "BASIC"),
    );
    if (!hasRequiredProduct) {
      setError(copy.errors.selectModule);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const employeeCount = Math.trunc(Number(form.employee_count));
      const extraSeats = requiredExtraSeats(employeeCount);
      const result = await onCreate({
        ...form,
        account_type: lockedAccountType ?? form.account_type,
        company_name: form.company_name.trim(),
        owner_name: form.owner_name?.trim() || undefined,
        owner_email: normalizeEmail(form.owner_email),
        phone: form.phone?.trim() || undefined,
        industry: form.industry?.trim() || undefined,
        company_size: String(employeeCount),
        employee_count: employeeCount,
        access_days: form.permanent
          ? undefined
          : Number(form.access_days || 30),
        extra_seats: extraSeats,
      });
      const requestedProducts = new Set(form.product_codes);
      const confirmedProducts = new Set(result.product_codes ?? []);
      const modulesConfirmed = result.modules_applied === true
        && requestedProducts.size === confirmedProducts.size
        && Array.from(requestedProducts).every((code) => confirmedProducts.has(code));
      if (!modulesConfirmed) {
        throw new Error(copy.errors.modulesNotApplied);
      }
      clearAccountCreationDraft();
      setCreated({ ...result, temporaryPassword: form.temporary_password });
    } catch (creationError) {
      if (
        creationError instanceof ApiClientError &&
        creationError.status === 401
      ) {
        setSessionExpired(true);
        setError(copy.errors.sessionExpired);
        return;
      }
      const message =
        creationError instanceof Error
          ? creationError.message
          : copy.errors.createFailed;
      const errorStep = creationErrorStep(message);
      setError(message);
      setStep(errorStep);
      if (errorStep === "owner") setFocusField("owner_email");
      if (errorStep === "company") setFocusField("company_name");
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = (code: string) => {
    updateForm({
      product_codes: form.product_codes.includes(code)
        ? form.product_codes.filter((item) => item !== code)
        : [...form.product_codes, code],
    });
  };

  const resumeAfterAuthentication = () => {
    saveAccountCreationDraft(step, form);
    navigate("/login", {
      replace: true,
      state: { authenticationExpired: true, returnTo },
    });
  };

  return {
    advance,
    closeModal,
    companyNameRef,
    created,
    error,
    form,
    formRef,
    goBack,
    ownerEmailRef,
    passwordRef,
    phoneRef,
    restoredDraft: Boolean(restoredDraft),
    resumeAfterAuthentication,
    saving,
    selectableProducts,
    sessionExpired,
    setShowPassword,
    showPassword,
    step,
    stepIndex,
    submit,
    toggleProduct,
    updateForm,
  };
}
