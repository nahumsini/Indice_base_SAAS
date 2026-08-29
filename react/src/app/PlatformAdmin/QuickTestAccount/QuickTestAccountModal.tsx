import { ArrowRight, Sparkles } from "lucide-react";
import { IndiceModalFrame } from "../../components/indice-modal/IndiceModalFrame";
import { IndiceModalValidation } from "../../components/indice-modal/IndiceModalValidation";
import { IndiceModalWizardStepper } from "../../components/indice-modal/IndiceModalWizardStepper";
import { useLanguage } from "../../shared/context";
import { QuickDetailsStep } from "./components/QuickDetailsStep";
import { QuickScenarioStep } from "./components/QuickScenarioStep";
import { useQuickTestAccountFlow } from "./hooks/useQuickTestAccountFlow";
import { getQuickTestAccountCopy } from "./translations";
import type { QuickTestAccountModalProps } from "./types";

export default function QuickTestAccountModal(
  props: QuickTestAccountModalProps,
) {
  const { currentLanguage } = useLanguage();
  const copy = getQuickTestAccountCopy(currentLanguage.code);
  const flow = useQuickTestAccountFlow({ ...props, copy });
  const selectedOption =
    flow.options.find((option) => option.id === flow.draft.scenario) ??
    flow.options[0];

  return (
    <IndiceModalFrame
      open
      onOpenChange={(open) => !open && props.onClose()}
      modalType="wizard"
      tone="aqua"
      contentClassName="sm:max-w-4xl"
      bodyClassName="px-4 py-4 sm:px-6 sm:py-5"
      eyebrow={copy.modal.eyebrow}
      title={copy.modal.title}
      description={copy.modal.description}
      icon={<Sparkles className="h-6 w-6" />}
      footerSummary={copy.progress.step(flow.stepIndex + 1)}
      footer={
        <>
          <button type="button" onClick={flow.goBack}>
            {flow.step === "scenario"
              ? copy.actions.cancel
              : copy.actions.previous}
          </button>
          {flow.step === "scenario" ? (
            <button
              type="button"
              onClick={flow.advance}
              className="inline-flex items-center justify-center gap-2"
            >
              {copy.actions.next} <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="submit" form="quick-test-account-form">
              {copy.actions.review}
            </button>
          )}
        </>
      }
    >
      <form
        ref={flow.formRef}
        id="quick-test-account-form"
        onSubmit={flow.submit}
        className="space-y-4"
      >
        <IndiceModalWizardStepper
          activeStepId={flow.step}
          accent="aqua"
          progressLabel={copy.progress.label}
          steps={[
            { id: "scenario", label: copy.steps.scenario },
            { id: "details", label: copy.steps.details },
          ]}
        />
        <IndiceModalValidation messages={flow.error ? [flow.error] : []} />
        {flow.step === "scenario" ? (
          <QuickScenarioStep
            copy={copy}
            selected={flow.draft.scenario}
            options={flow.options}
            onSelect={flow.selectScenario}
          />
        ) : selectedOption ? (
          <QuickDetailsStep
            copy={copy}
            draft={flow.draft}
            option={selectedOption}
            moduleCount={flow.selectedProductCodes.length}
            onChange={flow.updateDraft}
          />
        ) : null}
      </form>
    </IndiceModalFrame>
  );
}
