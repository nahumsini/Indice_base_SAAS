import {
  Building2,
  KeyRound,
  LoaderCircle,
  Plus,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { IndiceModalFrame } from "../components/indice-modal/IndiceModalFrame";
import { IndiceModalValidation } from "../components/indice-modal/IndiceModalValidation";
import { IndiceModalWizardStepper } from "../components/indice-modal/IndiceModalWizardStepper";
import { useLanguage } from "../shared/context";
import { AccessStep } from "./AccountCreation/components/AccessStep";
import { AccountCreationSuccess } from "./AccountCreation/components/AccountCreationSuccess";
import { CompanyStep } from "./AccountCreation/components/CompanyStep";
import { OwnerStep } from "./AccountCreation/components/OwnerStep";
import { useAccountCreationFlow } from "./AccountCreation/hooks/useAccountCreationFlow";
import { accountCreationSteps } from "./AccountCreation/accountCreationUtils";
import { getAccountCreationCopy } from "./AccountCreation/translations";
import type { AccountCreationModalProps } from "./AccountCreation/types";

export default function AccountCreationModal(props: AccountCreationModalProps) {
  const { currentLanguage } = useLanguage();
  const copy = getAccountCreationCopy(currentLanguage.code);
  const flow = useAccountCreationFlow({ ...props, copy });
  const localizedSteps = accountCreationSteps.map((step) => ({
    id: step.id,
    label: copy.steps[step.labelKey],
  }));
  const accountTypeLabel =
    flow.form.account_type === "DISTRIBUTOR"
      ? copy.company.distributor
      : copy.company.superAdmin;

  const footer = flow.created ? (
    <>
      <button type="button" onClick={flow.closeModal}>
        {copy.actions.finish}
      </button>
      <button
        type="button"
        onClick={() => props.onOpenAccount(flow.created!.company_id)}
        className="inline-flex items-center justify-center gap-2"
      >
        <Building2 className="h-4 w-4" /> {copy.actions.manageAccount}
      </button>
    </>
  ) : (
    <>
      <button type="button" onClick={flow.goBack}>
        {flow.stepIndex === 0 ? copy.actions.cancel : copy.actions.previous}
      </button>
      {flow.sessionExpired ? (
        <button
          type="button"
          onClick={flow.resumeAfterAuthentication}
          className="inline-flex items-center justify-center gap-2"
        >
          <KeyRound className="h-4 w-4" /> {copy.actions.signInAgain}
        </button>
      ) : flow.step === "access" ? (
        <button
          type="submit"
          form="platform-account-create-form"
          disabled={flow.saving || !flow.selectableProducts.length}
          className="inline-flex items-center justify-center gap-2"
        >
          {flow.saving ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              {copy.actions.creating}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> {copy.actions.create}
            </>
          )}
        </button>
      ) : (
        <button type="button" onClick={flow.advance}>
          {copy.actions.next}
        </button>
      )}
    </>
  );

  return (
    <IndiceModalFrame
      open
      busy={flow.saving}
      onOpenChange={(open) => !open && flow.closeModal()}
      modalType="wizard"
      tone="blue"
      contentClassName="sm:max-h-[min(860px,calc(100dvh-2rem))]"
      bodyClassName="px-4 py-4 sm:px-6 sm:py-5"
      eyebrow={copy.modal.eyebrow}
      title={flow.created ? copy.modal.successTitle : copy.modal.title}
      description={
        flow.created
          ? copy.modal.successDescription
          : copy.modal.description
      }
      icon={<UserPlus className="h-6 w-6" />}
      footer={footer}
      footerSummary={
        flow.created
          ? copy.progress.ready(flow.created.company_id)
          : copy.progress.step(
              flow.stepIndex + 1,
              accountCreationSteps.length,
              flow.form.product_codes.length,
            )
      }
    >
      {flow.created ? (
        <AccountCreationSuccess created={flow.created} copy={copy} />
      ) : (
        <form
          ref={flow.formRef}
          id="platform-account-create-form"
          onSubmit={flow.submit}
          className="space-y-4"
        >
          <IndiceModalWizardStepper
            activeStepId={flow.step}
            accent="blue"
            progressLabel={copy.progress.label}
            steps={localizedSteps}
          />

          {flow.step !== "company" ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs text-[#143675]">
              <span>
                <strong>{copy.context.company}:</strong>{" "}
                {flow.form.company_name || "—"}
              </span>
              <span>{accountTypeLabel}</span>
              {flow.step === "access" ? (
                <>
                  <span className="truncate">
                    <strong>{copy.context.owner}:</strong>{" "}
                    {flow.form.owner_email}
                  </span>
                  <span>{flow.form.employee_count} {currentLanguage.code.startsWith("es") ? "empleados" : "employees"}</span>
                </>
              ) : null}
            </div>
          ) : null}

          <IndiceModalValidation messages={flow.error ? [flow.error] : []} />

          {flow.restoredDraft ? (
            <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-[#143675]">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <p>{copy.notices.restored}</p>
            </div>
          ) : null}

          {flow.step === "company" ? (
            <CompanyStep
              copy={copy}
              form={flow.form}
              nameInputRef={flow.companyNameRef}
              onChange={flow.updateForm}
              lockedAccountType={props.lockedAccountType}
            />
          ) : null}

          {flow.step === "owner" ? (
            <OwnerStep
              copy={copy}
              form={flow.form}
              emailInputRef={flow.ownerEmailRef}
              phoneInputRef={flow.phoneRef}
              passwordInputRef={flow.passwordRef}
              showPassword={flow.showPassword}
              onChange={flow.updateForm}
              onShowPasswordChange={flow.setShowPassword}
            />
          ) : null}

          {flow.step === "access" ? (
            <AccessStep
              copy={copy}
              form={flow.form}
              products={flow.selectableProducts}
              onChange={flow.updateForm}
              onToggleProduct={flow.toggleProduct}
            />
          ) : null}

          {flow.step === "access" ? (
            <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-[#143675]">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <p>{copy.notices.audit}</p>
            </div>
          ) : null}
        </form>
      )}
    </IndiceModalFrame>
  );
}
