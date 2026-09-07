import { Box, Building2, Gift, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  BenefitPayload,
  PlatformAdminContext,
  PlatformBenefit,
  PlatformCatalogProduct,
  PlatformCompanyDetail,
  PlatformCompanyProductPreview,
} from "../api/platformAdmin";
import { IndiceWorkspaceNavigation } from "../components/frontend-os";
import { IndiceModalFrame } from "../components/indice-modal/IndiceModalFrame";
import { BenefitAdjustmentModal } from "./BenefitAdjustmentModal";
import { CompanyAccessTab } from "./CompanyAccount/CompanyAccessTab";
import { CompanyActivityTab, type CompanyUserManagementApi } from "./CompanyAccount/CompanyActivityTab";
import { CompanyModulesTab } from "./CompanyAccount/CompanyModulesTab";
import { CompanyOverviewTab } from "./CompanyAccount/CompanyOverviewTab";
import { initials } from "./CompanyAccount/companyAccountUtils";

export type CompanyAccountTab = "overview" | "modules" | "activity" | "access";

const accountTabs = [
  { id: "overview" as const, label: "Cuenta", icon: <Building2 className="h-4 w-4" /> },
  { id: "modules" as const, label: "Módulos", icon: <Box className="h-4 w-4" /> },
  { id: "activity" as const, label: "Usuarios y facturación", icon: <Users className="h-4 w-4" /> },
  { id: "access" as const, label: "Accesos", icon: <Gift className="h-4 w-4" /> },
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
}: CompanyAccountDrawerProps) {
  const [tab, setTab] = useState<CompanyAccountTab>(initialTab);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const contentTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (company) setTab(initialTab);
  }, [company?.id, initialTab]);

  useEffect(() => {
    if (adjustmentOpen && feedback?.type === "success") setAdjustmentOpen(false);
  }, [adjustmentOpen, feedback]);

  const activeProductBenefits = useMemo(() => {
    const grouped = new Map<string, PlatformBenefit[]>();
    if (!company) return grouped;
    company.benefits
      .filter((benefitItem) => benefitItem.status.toUpperCase() === "ACTIVE" && Boolean(benefitItem.product_code))
      .forEach((benefitItem) => {
        const productCode = benefitItem.product_code as string;
        grouped.set(productCode, [...(grouped.get(productCode) || []), benefitItem]);
      });
    return grouped;
  }, [company]);

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
  const capacity = Math.max(declaredCapacity, activeUserCount + reservedUserCount);
  const availableSeats = Math.max(capacity - activeUserCount - reservedUserCount, 0);
  const billingStatus = company.billing_status?.toUpperCase();
  const accessLabel = billingStatus === "TRIALING"
    ? `Prueba Stripe${company.trial_ends_at ? ` · hasta ${new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" }).format(new Date(company.trial_ends_at))}` : ""}`
    : company.stripe_subscription_id
      ? "Suscripción Stripe"
      : company.active_benefits > 0
        ? "Acceso administrativo"
        : "Sin acceso comercial";

  if (adjustmentOpen) {
    return (
      <BenefitAdjustmentModal
        benefit={benefit}
        products={catalogProducts}
        saving={saving}
        onClose={() => setAdjustmentOpen(false)}
        onBenefit={onBenefit}
        onSubmit={onSubmitBenefit}
      />
    );
  }

  const selectTab = (nextTab: CompanyAccountTab) => {
    setTab(nextTab);
    requestAnimationFrame(() => {
      const scrollContainer = contentTopRef.current?.parentElement;
      scrollContainer?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  return (
    <IndiceModalFrame
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      eyebrow="Cuenta de cliente"
      title={company.name}
      description={`${company.owner_email || "Sin correo propietario"} · Empresa #${company.id}`}
      icon={
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-sm font-medium text-white">
          {initials(company.name)}
        </span>
      }
      modalType="operational-workspace"
      tone="aqua"
      bodyClassName="bg-slate-50/70 p-0 dark:bg-slate-950/40"
      contentClassName="sm:w-[96vw] sm:max-w-[96rem] sm:max-h-[90dvh]"
      footerSummary={`${activeProducts.size} módulo(s) activo(s) · ${activeUserCount} activo(s)${reservedUserCount ? ` + ${reservedUserCount} reservado(s)` : ""} de ${capacity} lugares`}
      footer={
        <button type="button" className="cursor-pointer" onClick={() => onClose()}>
          Cerrar
        </button>
      }
    >
      <div ref={contentTopRef} />
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:px-5">
        <IndiceWorkspaceNavigation<CompanyAccountTab>
          ariaLabel="Secciones de la cuenta"
          items={accountTabs}
          value={tab}
          onValueChange={selectTab}
          tone="aqua"
          variant="sections"
        />
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {feedback ? (
          <div role="status" className={`rounded-lg border px-4 py-3 text-sm ${feedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200" : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200"}`}>
            {feedback.message}
          </div>
        ) : null}

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

        {tab === "modules" ? (
          <CompanyModulesTab
            company={company}
            products={basicProducts}
            activeProducts={activeProducts}
            activeProductBenefits={activeProductBenefits}
            saving={saving}
            canManageProducts={canCreateBenefits}
            canRevokeBenefits={canManageBenefits}
            onGrant={onGrantProduct}
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
            onManageSeats={() => selectTab("access")}
            userApi={userApi}
          />
        ) : null}

        {tab === "access" ? (
          <CompanyAccessTab
            company={company}
            saving={saving}
            canCreate={canCreateBenefits}
            canRevoke={canManageBenefits}
            onCreate={() => setAdjustmentOpen(true)}
            onRevoke={onRevokeBenefit}
          />
        ) : null}
      </div>
    </IndiceModalFrame>
  );
}

export default CompanyAccountDrawer;
