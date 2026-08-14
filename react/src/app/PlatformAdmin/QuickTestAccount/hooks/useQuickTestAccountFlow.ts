import { useMemo, useRef, useState, type FormEvent } from "react";
import type { PlatformAccountCreatePayload } from "../../../api/platformAdmin";
import { normalizeEmail } from "../../AccountCreation/accountCreationUtils";
import type { QuickTestAccountCopy } from "../translations";
import {
  buildQuickTestAccountForm,
  createQuickTestDraft,
  quickScenarioDefaults,
  selectQuickScenarioProductCodes,
} from "../quickTestAccountUtils";
import type {
  QuickTestAccountModalProps,
  QuickTestDraft,
  QuickTestScenario,
  QuickTestScenarioOption,
  QuickTestStep,
} from "../types";

type UseQuickTestAccountFlowProps = QuickTestAccountModalProps & {
  copy: QuickTestAccountCopy;
};

const quickTestSteps: QuickTestStep[] = ["scenario", "details"];

export function useQuickTestAccountFlow({
  products,
  existingOwnerEmails,
  copy,
  onClose,
  onContinue,
}: UseQuickTestAccountFlowProps) {
  const [draft, setDraft] = useState<QuickTestDraft>(() =>
    createQuickTestDraft(
      existingOwnerEmails,
      copy.details.companyPrefix,
      copy.details.defaultOwnerName,
    ),
  );
  const [step, setStep] = useState<QuickTestStep>("scenario");
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const knownEmails = useMemo(
    () => new Set(existingOwnerEmails.map(normalizeEmail).filter(Boolean)),
    [existingOwnerEmails],
  );
  const selectedProductCodes = useMemo(
    () => selectQuickScenarioProductCodes(products, draft.scenario),
    [draft.scenario, products],
  );
  const options = useMemo<QuickTestScenarioOption[]>(
    () =>
      (["people", "commerce", "complete"] as QuickTestScenario[]).map(
        (scenario) => ({
          id: scenario,
          label: copy.scenario.options[scenario].label,
          description: copy.scenario.options[scenario].description,
          moduleCount: selectQuickScenarioProductCodes(products, scenario).length,
          employeeCount: quickScenarioDefaults[scenario].employeeCount,
          accessDays: quickScenarioDefaults[scenario].accessDays,
        }),
      ),
    [copy, products],
  );
  const stepIndex = quickTestSteps.indexOf(step);

  const updateDraft = (patch: Partial<QuickTestDraft>) => {
    setError("");
    setDraft((current) => ({ ...current, ...patch }));
  };

  const selectScenario = (scenario: QuickTestScenario) => {
    const defaults = quickScenarioDefaults[scenario];
    updateDraft({
      scenario,
      employee_count: defaults.employeeCount,
      access_days: defaults.accessDays,
    });
  };

  const advance = () => {
    if (!selectedProductCodes.length) {
      setError(copy.errors.noModules);
      return;
    }
    setError("");
    setStep("details");
  };

  const goBack = () => {
    setError("");
    if (step === "scenario") onClose();
    else setStep("scenario");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === "scenario") {
      advance();
      return;
    }
    if (!formRef.current?.reportValidity()) return;
    if (knownEmails.has(normalizeEmail(draft.owner_email))) {
      setError(copy.errors.duplicateEmail);
      return;
    }
    if (!selectedProductCodes.length) {
      setError(copy.errors.noModules);
      return;
    }
    const form: PlatformAccountCreatePayload = buildQuickTestAccountForm(
      draft,
      products,
    );
    onContinue(form);
  };

  return {
    advance,
    draft,
    error,
    formRef,
    goBack,
    options,
    selectScenario,
    selectedProductCodes,
    step,
    stepIndex,
    submit,
    updateDraft,
  };
}
