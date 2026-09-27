import { useCustomerAccountCopy } from "./Customers/useCustomerAccountCopy";
import { Box, Building2, Gift, Users, CreditCard, History } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  BenefitPayload,
  PlatformAdminContext,
  PlatformCatalogProduct,
  PlatformCompanyDetail,
  PlatformCompanyProductPreview,
  platformAdminApi,
} from "../api/platformAdmin";
import { IndiceWorkspaceNavigation } from "../components/frontend-os";
import { IndiceModalFrame } from "../components/indice-modal/IndiceModalFrame";
import { IndiceConfirmationDialog } from "../components/indice-modal/IndiceConfirmationDialog";
import { BenefitAdjustmentModal } from "./BenefitAdjustmentModal";
import { CompanyAccessTab } from "./CompanyAccount/CompanyAccessTab";
import { CompanyActivityTab, type CompanyUserManagementApi } from "./CompanyAccount/CompanyActivityTab";
import { CompanyModulesTab, type PendingModuleChange } from "./CompanyAccount/CompanyModulesTab";
import { CompanyOverviewTab } from "./CompanyAccount/CompanyOverviewTab";
import { activeProductBenefits as selectActiveProductBenefits, nextBenefitEnd } from "./CompanyAccount/companyAccountState";
import { CompanyBillingTab } from "./CompanyAccount/CompanyBillingTab";
import { CompanyHistoryTab } from "./CompanyAccount/CompanyHistoryTab";
import { MercadoPagoActivationPanel } from "./CompanyAccount/MercadoPagoActivationPanel";
import { SquareActivationPanel } from "./CompanyAccount/SquareActivationPanel";
import { initials } from "./CompanyAccount/companyAccountUtils";

export type CompanyAccountTab = "overview" | "modules" | "activity" | "access" | "billing" | "history";

const getAccountTabs = (t: ReturnType<typeof useCustomerAccountCopy>["t"], unified: boolean) => unified ? [
  { id: "overview" as const, label: t("workspaceSummary"), icon: <Building2 className="h-4 w-4" /> },
  { id: "activity" as const, label: t("workspaceUsers"), icon: <Users className="h-4 w-4" /> },
  { id: "modules" as const, label: t("workspaceModules"), icon: <Box className="h-4 w-4" /> },
  { id: "billing" as const, label: t("workspaceBilling"), icon: <CreditCard className="h-4 w-4" /> },
  { id: "history" as const, label: t("workspaceHistory"), icon: <History className="h-4 w-4" /> },
] : [
  { id: "overview" as const, label: t("account"), icon: <Building2 className="h-4 w-4" /> },
  { id: "modules" as const, label: t("modules"), icon: <Box className="h-4 w-4" /> },
  { id: "activity" as const, label: t("usersBilling"), icon: <Users className="h-4 w-4" /> },
  { id: "access" as const, label: t("accesses"), icon: <Gift className="h-4 w-4" /> },
];

export interface CompanyAccountDrawerProps {
  company: PlatformCompanyDetail | null;
  context: PlatformAdminContext | null;
  catalogProducts: PlatformCatalogProduct[];
  benefit: BenefitPayload;
  saving: boolean;
  onClose: () => void;
  onBenefit: (value: BenefitPayload) => void;
  onSubmitBenefit: (event: React.FormEvent) => Promise<void>;
  onGrantProduct: (productCode: string) => Promise<void>;
  onPreviewProducts: (productCodes: string[]) => Promise<PlatformCompanyProductPreview>;
  onUpdateTrialProducts: (productCodes: string[], expectedCatalogVersion: string) => Promise<boolean>;
  onRefreshCompany: () => Promise<void>;
  onUpdatePublicDemo?: (enabled: boolean, reason: string) => Promise<boolean>;
  onRevokeBenefit: (reference: string, label?: string, grantCount?: number) => void;
  feedback: { type: "success" | "error"; message: string } | null;
  initialTab?: CompanyAccountTab;
  userApi?: CompanyUserManagementApi;
  workspaceApi?: Pick<typeof platformAdminApi, "getCompanyInvoices" | "getCompanyHistory">;
  onTabChange?: (tab: CompanyAccountTab) => void;
  onRequestPayment?: () => void;
  onEditAccountType?: () => void;
  onAssignDistributor?: () => void;
  onExtendTrial?: () => void;
}

export function CompanyAccountDrawer({
  company,
  context,
  catalogProducts,
  benefit,
  saving,
  onClose,
  onBenefit,
  onSubmitBenefit,
  onGrantProduct,
  onPreviewProducts,
  onUpdateTrialProducts,
  onRefreshCompany,
  onUpdatePublicDemo,
  onRevokeBenefit,
  feedback,
  initialTab = "overview",
  userApi,
  workspaceApi,
  onTabChange,
  onRequestPayment,
  onEditAccountType,
  onAssignDistributor,
  onExtendTrial,
}: CompanyAccountDrawerProps) {
  const { t, locale, number } = useCustomerAccountCopy();
  const [tab, setTab] = useState<CompanyAccountTab>(initialTab);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const adjustmentSubmitted = useRef(false);
  const [usersBusy, setUsersBusy] = useState(false);
  const [modulesBusy, setModulesBusy] = useState(false);
  const [pendingModuleChange, setPendingModuleChange] = useState<PendingModuleChange | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [adjustmentTypes, setAdjustmentTypes] = useState<BenefitPayload["benefit_type"][]>(["PRODUCT", "SEAT", "STORAGE"]);
  const contentTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (company) setTab(initialTab);
  }, [company?.id, initialTab]);

  useEffect(() => {
    if (adjustmentOpen && adjustmentSubmitted.current && !saving && feedback?.type === "success") {
      adjustmentSubmitted.current = false;
      setAdjustmentOpen(false);
    }
  }, [adjustmentOpen, feedback, saving]);

  const activeProductBenefits = useMemo(() => selectActiveProductBenefits(company?.benefits ?? []), [company]);

  const activeProducts = useMemo(
    () => new Set([...(company?.products.map((product) => product.code) || []), ...activeProductBenefits.keys()]),
    [activeProductBenefits, company],
  );
  const basicProducts = useMemo(
    () => catalogProducts.filter(
      (product) => product.active
        && product.commercially_available !== false
        && product.commercial_kind !== "SEAT"
        && ["BASIC", "ADDON"].includes(product.product_type.toUpperCase()),
    ),
    [catalogProducts],
  );

  if (!company) return null;

  const companyActive = company.platform_status !== "DELETED";
  const canManageBenefits = Boolean(context?.can_manage_benefits);
  const canCreateBenefits = companyActive && canManageBenefits;
  const safeCount = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };
  const activeUserCount = safeCount(company.seat_usage?.active ?? company.active_members);
  const reservedUserCount = safeCount(company.seat_usage?.reserved ?? company.invitations?.length);
  const declaredCapacity =
    safeCount(company.seat_usage?.included ?? company.included_seats) +
    safeCount(company.seat_usage?.purchased_extra ?? company.purchased_extra_seats ?? company.extra_seats) +
    safeCount(company.seat_usage?.courtesy_extra);
  const capacity = declaredCapacity;
  const availableSeats = Math.max(capacity - activeUserCount - reservedUserCount, 0);
  const billingStatus = company.billing_status?.toUpperCase();
  const accessLabel = billingStatus === "TRIALING"
    ? `${t("stripeTrial")}${company.trial_ends_at ? ` · ${t("untilDate", { date: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(company.trial_ends_at)) })}` : ""}`
    : company.billing_managed_by_stripe
      ? t("stripeSubscription")
      : company.active_benefits > 0
        ? t("adminAccess")
        : t("noCommercialAccess");

  if (adjustmentOpen) {
    return (
      <BenefitAdjustmentModal
        benefit={benefit}
        products={workspaceApi ? basicProducts.filter(product => !activeProductBenefits.has(product.product_code)) : catalogProducts}
        allowedTypes={adjustmentTypes}
        saving={saving}
        onClose={() => setAdjustmentOpen(false)}
        onBenefit={onBenefit}
        companyName={company.name}
        error={feedback?.type === "error" ? feedback.message : undefined}
        onSubmit={(event) => { adjustmentSubmitted.current = true; void onSubmitBenefit(event); }}
      />
    );
  }

  const selectTab = (nextTab: CompanyAccountTab) => {
    if (saving || usersBusy || modulesBusy) return;
    const destination = workspaceApi && nextTab === "access" ? "modules" : nextTab;
    setTab(destination);
    onTabChange?.(destination);
    requestAnimationFrame(() => {
      const scrollContainer = contentTopRef.current?.parentElement;
      scrollContainer?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const close = () => {
    if (saving || usersBusy || modulesBusy) return;
    if (pendingModuleChange) setDiscardOpen(true);
    else onClose();
  };
  const openCapacity = () => {
    if (!canCreateBenefits || saving || usersBusy || modulesBusy) return;
    onBenefit({ benefit_type: "SEAT", quantity: 1, product_code: "", reason: "", source_type: "COURTESY", ends_at: "" });
    setAdjustmentTypes(["SEAT", "STORAGE"]);
    adjustmentSubmitted.current = false;
    setAdjustmentOpen(true);
  };
  if (discardOpen) return <IndiceConfirmationDialog open title={t("accessDiscardTitle")} description={t("accessDiscardHelp")}
    cancelLabel={t("accessKeepEditing")} confirmLabel={t("accessDiscard")} destructive tone="aqua"
    onCancel={() => setDiscardOpen(false)} onConfirm={onClose} />;
  return (
    <IndiceModalFrame
      open
      busy={saving || usersBusy || modulesBusy}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
      }}
      eyebrow={t("customerAccount")}
      title={company.name}
      description={`${company.owner_email || t("noOwnerEmail")} · ${t("companyId", { id: String(company.id) })}`}
      icon={
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-sm font-medium text-white">
          {initials(company.name)}
        </span>
      }
      modalType="operational-workspace"
      tone="aqua"
      bodyClassName="bg-slate-50/70 p-0 dark:bg-slate-950/40"
      contentClassName="sm:w-[96vw] sm:max-w-[96rem] sm:max-h-[90dvh]"
      footerSummary={`${t("modulesSummary", { count: activeProducts.size })} · ${company.seat_usage?.enforced === false ? t("workspaceNoLimit") : t("accessUsersSummary", { active: activeUserCount, reserved: reservedUserCount, capacity })}`}
      footer={
        <button type="button" disabled={saving || usersBusy || modulesBusy} className="cursor-pointer disabled:opacity-50" onClick={close}>
          {t("close")}</button>
      }
    >
      <div ref={contentTopRef} />
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:px-5">
        <IndiceWorkspaceNavigation<CompanyAccountTab>
          ariaLabel={t("accountSections")}
          items={getAccountTabs(t, Boolean(workspaceApi)).map((item) => ({ ...item, disabled: saving || usersBusy || modulesBusy }))}
          value={tab}
          onValueChange={selectTab}
          tone="aqua"
          variant="sections"
        />
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {pendingModuleChange && tab !== "modules" ? <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <button type="button" className="min-h-11 text-left underline" onClick={() => selectTab("modules")}>{t("accessReviewPending")}</button>
        </div> : null}
        {feedback ? (
          <div role="status" className={`rounded-lg border px-4 py-3 text-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200" : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200"}`}>
            {feedback.message}
          </div>
        ) : null}

        {tab === "overview" && (onEditAccountType || onAssignDistributor || onExtendTrial) ? <div className="flex flex-wrap gap-2">
          {onEditAccountType ? <button type="button" disabled={saving || Boolean(pendingModuleChange)} onClick={onEditAccountType} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#177D66] dark:bg-slate-900">{t("editType")}</button> : null}
          {onAssignDistributor ? <button type="button" disabled={saving || Boolean(pendingModuleChange)} onClick={onAssignDistributor} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#177D66] dark:bg-slate-900">{t("assignDistributor")}</button> : null}
          {onExtendTrial ? <button type="button" disabled={saving || Boolean(pendingModuleChange)} onClick={onExtendTrial} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#177D66] dark:bg-slate-900">{t("extendTrial")}</button> : null}
        </div> : null}

        {tab === "overview" ? (
          <CompanyOverviewTab
            company={company}
            activeProductCount={activeProducts.size}
            capacity={capacity}
            activeUserCount={activeUserCount}
            availableSeats={availableSeats}
            accessLabel={accessLabel}
            canManagePublicDemo={Boolean(companyActive && context?.can_manage_accounts && onUpdatePublicDemo)}
            saving={saving}
            onUpdatePublicDemo={onUpdatePublicDemo}
          />
        ) : null}
        {tab === "overview" && context?.role === "PLATFORM_ROOT" ? (
          <><MercadoPagoActivationPanel companyId={company.id} /><SquareActivationPanel companyId={company.id} /></>
        ) : null}

        {(tab === "modules" || (workspaceApi && tab === "access")) ? (
          <CompanyModulesTab
            company={company}
            products={basicProducts}
            activeProducts={activeProducts}
            activeProductBenefits={activeProductBenefits}
            pendingChange={pendingModuleChange}
            onPendingChange={setPendingModuleChange}
            onBusyChange={setModulesBusy}
            saving={saving}
            canManageProducts={canCreateBenefits}
            canRevokeBenefits={canManageBenefits}
            onGrant={workspaceApi ? async (productCode) => {
              const endsAt = nextBenefitEnd(company.benefits);
              const localEnd = endsAt ? new Date(Date.parse(endsAt) - new Date(endsAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
              onBenefit({ benefit_type: "PRODUCT", source_type: "COURTESY", product_code: productCode, quantity: 1, reason: "", ends_at: localEnd });
              setAdjustmentTypes(["PRODUCT"]);
              adjustmentSubmitted.current = false;
              setAdjustmentOpen(true);
            } : onGrantProduct}
            onPreviewProducts={onPreviewProducts}
            onUpdateTrialProducts={onUpdateTrialProducts}
            onRevoke={onRevokeBenefit}
          />
        ) : null}

        {tab === "activity" ? (
          <CompanyActivityTab
            company={company}
            canManage={Boolean(companyActive && context?.can_manage_accounts)}
            onRefresh={onRefreshCompany}
            onManageSeats={workspaceApi ? openCapacity : () => selectTab("access")}
            canManageCapacity={canCreateBenefits && !pendingModuleChange}
            userApi={userApi}
            showBilling={!workspaceApi}
            inlineForms={Boolean(workspaceApi)}
            canManageRoles={context?.role === "PLATFORM_ROOT"}
            onBusyChange={setUsersBusy}
          />
        ) : null}

        {((!workspaceApi && tab === "access") || (workspaceApi && tab === "activity")) ? (
          <CompanyAccessTab
            capacityOnly={Boolean(workspaceApi)}
            products={catalogProducts}
            company={company}
            saving={saving}
            canCreate={canCreateBenefits}
            canRevoke={canManageBenefits && !pendingModuleChange}
            onCreate={() => { adjustmentSubmitted.current = false; setAdjustmentOpen(true); }}
            onRevoke={onRevokeBenefit}
          />
        ) : null}
        {tab === "billing" && workspaceApi ? <CompanyBillingTab company={company} loadInvoices={workspaceApi.getCompanyInvoices} onRequestPayment={pendingModuleChange ? undefined : onRequestPayment} /> : null}
        {tab === "history" && workspaceApi ? <CompanyHistoryTab companyId={company.id} loadHistory={workspaceApi.getCompanyHistory} /> : null}
      </div>
    </IndiceModalFrame>
  );
}

export default CompanyAccountDrawer;
