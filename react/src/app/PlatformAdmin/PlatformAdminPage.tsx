import { catalogProductLabel } from "./CatalogWorkspace/catalogLabels";
import { catalogValidationMessage } from "./CatalogWorkspace/catalogValidationMessage";
import { PlatformAdminLanguageSelect } from "./PlatformAdminLanguageSelect";
import { usePlatformAdminTranslations } from "./translations/usePlatformAdminTranslations";
import { getPlatformAdminTranslator, type PlatformAdminLocale } from "./translations";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Activity,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BadgeCheck,
  Boxes,
  Building2,
  ChevronLeft,
  CircleAlert,
  CircleDollarSign,
  ClipboardList,
  Columns3,
  CreditCard,
  Database,
  Download,
  ExternalLink,
  FileClock,
  Gift,
  GraduationCap,
  HardDrive,
  Handshake,
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  Mail,
  MoreHorizontal,
  PackageCheck,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router";
import { IndiceBrandLogo } from "../Auth/components/IndiceBrandLogo";
import {
  IndiceConfirmationDialog,
  IndiceModalFrame,
  IndiceModalValidation,
} from "../components/indice-modal";
import {
  IndiceFilterBar,
  IndiceFilterSearch,
  IndiceFilterSelect,
  IndiceTitleBar,
  IndiceWorkspaceNavigation,
} from "../components/frontend-os";
import { useWorkspaceNavigationMemory } from "../hooks/useWorkspaceNavigationMemory";
import { DataTablePagination } from "../components/table/DataTablePagination";
import {
  getIndiceTableMinimumWidth,
  IndiceOperationalTable,
  IndiceTableActionGroup,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  IndiceTableShell,
  type IndiceTableColumnDefinition,
} from "../components/table/IndiceTableEngine";
import { TableBody, TableCell, TableRow } from "../components/ui/table";
import { usePersistentColumnWidths } from "../hooks/usePersistentColumnWidths";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { useLanguage } from "../shared/context";
import { SystemTicketsWorkspace } from "../SystemTickets";
import { TrainingWorkspace } from "../Training";
import { InternalDevelopmentWorkspace } from "../InternalDevelopment";
import { UsageAnalyticsWorkspace } from "./UsageAnalyticsWorkspace";
import AccountCreationModal from "./AccountCreationModal";
import AccountTypeEditModal from "./AccountTypeEditModal";
import DistributorAssignmentModal from "./DistributorAssignmentModal";
import { QuickTestAccountModal } from "./QuickTestAccount";
import CompanyAccountDrawer, { type CompanyAccountTab } from "./CompanyAccountDrawer";
import { CustomerUsersModal } from "./Customers/CustomerUsersModal";
import { PaymentRequestModal } from "./Customers/PaymentRequestModal";
import ConsultingAdminTab from "./ConsultingAdminTab";
import { CompaniesDirectoryTab } from "./UsersDirectoryTab";
import { CatalogProductCard } from "./Catalog";
import { CommercialOfferWorkspace, ModuleAvailabilityWorkspace } from "./CatalogWorkspace";
import { CatalogPublishDialog } from "./CatalogWorkspace/CatalogPublishDialog";
import { publishCatalogOffer } from "./CatalogWorkspace/catalogPublication";
import { stripeEnvironmentLabel } from "./CatalogWorkspace/commercialOfferPresentation";
import { StripeSetupPanel } from "./BillingWorkspace/StripeSetupPanel";
import { StripeDemoConnectionDialog } from "./BillingWorkspace/StripeDemoConnectionDialog";
import { canUseLocalStripeDemo } from "./BillingWorkspace/localStripeDemo";
import {
  CustomersTable,
  CustomerColumnsModal,
  CustomerControlCenter,
  TrialExtensionModal,
  getCustomerTableCopy,
  loadCustomerTableColumnIds,
  saveCustomerTableColumnIds,
  type CustomerTableColumnId,
  type CustomerSortKey,
  type SortDirection,
  type TrialExtensionDays,
} from "./Customers";
import {
  ModuleWorkOrderModal,
  useModuleWorkOrderCopy,
  useModuleWorkOrders,
} from "./ModuleWorkOrders";
import {
  flowOptionLabel,
  accessDayOptions,
  accessReasonOptions,
  currencyOptions,
  extraSeatOptions,
  moduleAvailabilityReasonOptions,
  redemptionOptions,
  revocationReasonOptions,
} from "./flowOptions";
import { hasAccountCreationDraft } from "./accountCreationDraft";
import { selectActiveCatalogProducts } from "./selectActiveCatalogProducts";
import {
  platformAdminApi,
  type BenefitPayload,
  type CourtesyCodeCatalog,
  type CourtesyCodePayload,
  type EditablePlatformAccountType,
  type PlatformAdminContext,
  type PlatformAccountCreatePayload,
  type PlatformAccountCreateResult,
  type PlatformAudit,
  type PlatformBilling,
  type PlatformCatalog,
  type PlatformCatalogPrice,
  type PlatformCatalogProduct,
  type PlatformCatalogValidation,
  type PlatformCompanyDetail,
  type PlatformCompanySummary,
  type PlatformInvoice,
  type PlatformModule,
  type PlatformModules,
  type PlatformOverview,
} from "../api/platformAdmin";

type AdminTab =
  | "customers"
  | "companies"
  | "billing"
  | "catalog"
  | "consulting"
  | "training"
  | "systemTickets"
  | "internalDevelopment"
  | "audit";
type BillingSortKey =
  "customer" | "invoice" | "status" | "amount" | "paid" | "period";
type CatalogPriceSortKey =
  "concept" | "type" | "monthly" | "yearly" | "status";
type Revocation = {
  kind: "benefit" | "courtesy";
  reference: string;
  label?: string;
  grantCount?: number;
} | null;
type ModuleAvailabilityChange = {
  module: PlatformModule;
  active: boolean;
} | null;

const initialCourtesy: CourtesyCodePayload = {
  label: "",
  allowed_email: "",
  product_codes: [],
  included_extra_seats: 0,
  access_days: 30,
  permanent: false,
  max_redemptions: 1,
  reason: "",
  campaign_code: "",
};

const initialBenefit: BenefitPayload = {
  benefit_type: "PRODUCT",
  product_code: "",
  quantity: 1,
  source_type: "COURTESY",
  reason: "",
  campaign_code: "",
};

const controlClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#177D66] focus:ring-2 focus:ring-[#177D66]/10 disabled:bg-slate-100 disabled:text-slate-400";
const tableHeadClass =
  "whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-slate-500";
const tableCellClass = "px-4 py-3 align-middle text-sm text-slate-700";
const catalogPriceColumnIds: CatalogPriceSortKey[] = [
  "concept",
  "type",
  "monthly",
  "yearly",
  "status",
];
const catalogPriceColumnDefaults: Record<CatalogPriceSortKey, number> = {
  concept: 270,
  type: 160,
  monthly: 210,
  yearly: 210,
  status: 190,
};
const catalogPriceColumnMinimums: Record<CatalogPriceSortKey, number> = {
  concept: 220,
  type: 130,
  monthly: 180,
  yearly: 180,
  status: 160,
};
const catalogPriceColumnMaximums: Record<CatalogPriceSortKey, number> = {
  concept: 420,
  type: 260,
  monthly: 320,
  yearly: 320,
  status: 280,
};
const catalogPriceActionsWidth = 220;

const tabDefinitions: {
  id: AdminTab;
  es: string;
  en: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "customers", es: "Clientes", en: "Customers", icon: Building2 },
  { id: "companies", es: "Empresas", en: "Companies", icon: Users },
  { id: "billing", es: "Facturación", en: "Billing", icon: CreditCard },
  {
    id: "catalog",
    es: "Catálogo y módulos",
    en: "Catalog & modules",
    icon: Boxes,
  },
  { id: "consulting", es: "Consultorías", en: "Consulting", icon: Handshake },
  { id: "training", es: "Capacitación y contenido", en: "Training & content", icon: GraduationCap },
  {
    id: "systemTickets",
    es: "Tickets de sistema",
    en: "System tickets",
    icon: TicketCheck,
  },
  {
    id: "internalDevelopment",
    es: "Registro de desarrollo interno",
    en: "Internal development log",
    icon: FileClock,
  },
  { id: "audit", es: "Uso y auditoría", en: "Usage & audit", icon: Activity },
];

const isAdminTab = (value: unknown): value is AdminTab =>
  typeof value === "string" &&
  tabDefinitions.some((tab) => tab.id === value);

const offerLabels = (locale: string): Record<string, string> => {
  const t = getPlatformAdminTranslator(locale);
  return {
  basic_1: t("One module"),
  basic_2: t("Two modules"),
  basic_3: t("Three modules"),
  basic_all: t("Four or more modules"),
  extra_seat: t("Additional user"),
  storage_block: t("Additional storage"),
  };
};

export default function PlatformAdminPage() {
  const { t, locale } = usePlatformAdminTranslations();
  const navigate = useNavigate();
  const { currentLanguage } = useLanguage();
  const english = !currentLanguage.code.startsWith("es");
  const tabs = useMemo(
    () =>
      tabDefinitions.map((tab) => ({
        ...tab,
        label: t(tab.en as Parameters<typeof t>[0]),
      })),
    [t],
  );
  const [activeTab, setActiveTab] = useState<AdminTab>("customers");
  const adminNavigationState = useMemo(
    () => ({ section: activeTab }),
    [activeTab],
  );
  const restoreAdminNavigation = useCallback(
    (restored: { section?: unknown }) => {
      const section = restored.section === "users" || restored.section === "activities"
        ? "companies"
        : restored.section;
      if (isAdminTab(section)) setActiveTab(section);
    },
    [],
  );
  useWorkspaceNavigationMemory({
    moduleKey: "platform-admin",
    tabKey: "primary-navigation",
    state: adminNavigationState,
    defaults: { section: "customers" as AdminTab },
    urlFields: { section: "section" },
    onRestore: restoreAdminNavigation,
    rememberScroll: false,
  });
  const [context, setContext] = useState<PlatformAdminContext | null>(null);
  const canCreateAccounts = context?.can_create_accounts
    ?? Boolean(context?.can_manage_accounts && context.can_manage_benefits);
  const visibleTabs = useMemo(
    () => tabs.filter((tab) => {
      if (tab.id === "systemTickets") return Boolean(context?.can_manage_system_tickets);
      if (tab.id === "internalDevelopment") return context?.role === "PLATFORM_ROOT";
      return true;
    }),
    [context?.can_manage_system_tickets, context?.role, tabs],
  );
  useEffect(() => {
    if (
      context &&
      !visibleTabs.some((tab) => tab.id === activeTab)
    ) {
      setActiveTab("customers");
    }
  }, [activeTab, context, visibleTabs]);
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [billing, setBilling] = useState<PlatformBilling | null>(null);
  const [catalog, setCatalog] = useState<PlatformCatalog | null>(null);
  const [stripeDemoConnected, setStripeDemoConnected] = useState(false);
  const [stripeDemoDialogOpen, setStripeDemoDialogOpen] = useState(false);
  const canDemoConnect = canUseLocalStripeDemo(import.meta.env.DEV, window.location.hostname, context?.role);
  const [stripeStatusRefreshing, setStripeStatusRefreshing] = useState(false);
  const [stripeStatusError, setStripeStatusError] = useState("");
  const refreshStripeStatus = async () => {
    if (stripeStatusRefreshing) return;
    setStripeStatusRefreshing(true);
    setStripeStatusError("");
    try {
      setCatalog(await platformAdminApi.getCatalog());
    } catch (refreshError) {
      setStripeStatusError(t("Stripe setup status could not be refreshed."));
    } finally {
      setStripeStatusRefreshing(false);
    }
  };
  const [moduleRegistry, setModuleRegistry] = useState<PlatformModules | null>(
    null,
  );
  const [auditLog, setAuditLog] = useState<PlatformAudit | null>(null);
  const [courtesyCatalog, setCourtesyCatalog] =
    useState<CourtesyCodeCatalog | null>(null);
  const [selected, setSelected] = useState<PlatformCompanyDetail | null>(null);
  const [selectedInitialTab, setSelectedInitialTab] =
    useState<CompanyAccountTab>("overview");
  const [usersCompany, setUsersCompany] =
    useState<PlatformCompanyDetail | null>(null);
  const [query, setQuery] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [customerSort, setCustomerSort] = useState<{
    key: CustomerSortKey;
    direction: SortDirection;
  }>({ key: "customer", direction: null });
  const [benefit, setBenefit] = useState<BenefitPayload>(initialBenefit);
  const [courtesy, setCourtesy] =
    useState<CourtesyCodePayload>(initialCourtesy);
  const [createdCourtesyCode, setCreatedCourtesyCode] = useState("");
  const [courtesyFeedback, setCourtesyFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [quickTestAccountOpen, setQuickTestAccountOpen] = useState(false);
  const [accountCreationPreset, setAccountCreationPreset] =
    useState<PlatformAccountCreatePayload | null>(null);
  const [accountTypeEdit, setAccountTypeEdit] =
    useState<PlatformCompanySummary | null>(null);
  const [accountTypeEditError, setAccountTypeEditError] = useState("");
  const [distributorAssignment, setDistributorAssignment] =
    useState<PlatformCompanySummary | null>(null);
  const [distributorAssignmentError, setDistributorAssignmentError] =
    useState("");
  const [trialExtension, setTrialExtension] =
    useState<PlatformCompanySummary | null>(null);
  const [paymentRequestCompany, setPaymentRequestCompany] = useState<PlatformCompanySummary | null>(null);
  const [companyDeletion, setCompanyDeletion] = useState<PlatformCompanySummary | null>(null);
  const [companyDeletionName, setCompanyDeletionName] = useState("");
  const [companyDeletionReason, setCompanyDeletionReason] = useState("");
  const [companyDeletionError, setCompanyDeletionError] = useState("");
  const [trialExtensionError, setTrialExtensionError] = useState("");
  const [courtesyAccessOpen, setCourtesyAccessOpen] = useState(false);
  const [revocation, setRevocation] = useState<Revocation>(null);
  const [revocationReason, setRevocationReason] = useState(
    t("End of courtesy or promotion"),
  );
  const [revocationError, setRevocationError] = useState("");
  const [moduleChange, setModuleChange] =
    useState<ModuleAvailabilityChange>(null);
  const [moduleChangeReason, setModuleChangeReason] = useState(
    t("Global availability managed from the Root panel"),
  );
  const [moduleChangeError, setModuleChangeError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [accountFeedback, setAccountFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const initialLoadStarted = useRef(false);
  const overviewRequestSequence = useRef(0);
  const overviewOptions = useMemo(
    () => ({
      query,
      userType: userTypeFilter,
      status: statusFilter,
      sort: customerSort.direction ? customerSort.key : "id",
      direction: customerSort.direction ?? "desc",
      page,
      pageSize,
    }),
    [customerSort, page, pageSize, query, statusFilter, userTypeFilter],
  );
  const overviewOptionsKey = JSON.stringify(overviewOptions);
  const loadedOverviewOptionsKey = useRef<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const access = await platformAdminApi.getContext();
      setContext(access);
      const requests = await Promise.allSettled([
        platformAdminApi.getOverview(overviewOptions),
        platformAdminApi.getBilling(),
        platformAdminApi.getCatalog(),
        platformAdminApi.getModules(),
        platformAdminApi.getAudit(),
        access.can_manage_benefits
          ? platformAdminApi.getCourtesyCodes()
          : Promise.resolve(null),
      ]);
      const [overviewResult, billingResult, catalogResult, modulesResult, auditResult, courtesyResult] = requests;
      if (overviewResult.status === "fulfilled") {
        setOverview(overviewResult.value);
        loadedOverviewOptionsKey.current = overviewOptionsKey;
      }
      if (billingResult.status === "fulfilled") setBilling(billingResult.value);
      if (catalogResult.status === "fulfilled") setCatalog(catalogResult.value);
      if (modulesResult.status === "fulfilled") setModuleRegistry(modulesResult.value);
      if (auditResult.status === "fulfilled") setAuditLog(auditResult.value);
      if (courtesyResult.status === "fulfilled") setCourtesyCatalog(courtesyResult.value);
      const failures = requests.filter((result) => result.status === "rejected");
      if (failures.length) {
        setError(
          t("{p0} section(s) could not be loaded. The available sections remain usable; refresh to retry.", { p0: failures.length }),
        );
      }
    } catch (loadError) {
      setError(
        t("Platform operations could not be loaded."),
      );
    } finally {
      setLoading(false);
    }
  }, [t, overviewOptions, overviewOptionsKey]);

  useEffect(() => {
    if (initialLoadStarted.current) return;
    initialLoadStarted.current = true;
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!context || loading) return;
    if (loadedOverviewOptionsKey.current === overviewOptionsKey) return;
    const requestSequence = ++overviewRequestSequence.current;
    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setOverviewLoading(true);
      try {
        const overviewData = await platformAdminApi.getOverview(overviewOptions);
        if (!cancelled && requestSequence === overviewRequestSequence.current) {
          setOverview(overviewData);
          loadedOverviewOptionsKey.current = overviewOptionsKey;
        }
      } catch (loadError) {
        if (!cancelled && requestSequence === overviewRequestSequence.current) {
          setError(
            t("The customer portfolio could not be updated."),
          );
        }
      } finally {
        if (!cancelled && requestSequence === overviewRequestSequence.current) {
          setOverviewLoading(false);
        }
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [context, t, loading, overviewOptions, overviewOptionsKey]);

  useEffect(() => {
    if (!loading && canCreateAccounts && hasAccountCreationDraft()) {
      setCreateAccountOpen(true);
    }
  }, [canCreateAccounts, loading]);

  const companies = overview?.companies ?? [];
  const distributorAccounts = overview?.distributors ?? [];
  const pagedCompanies = companies;

  const activeCatalogProducts = useMemo(() => {
    return selectActiveCatalogProducts(catalog);
  }, [catalog]);

  useEffect(() => {
    setPage(1);
  }, [query, userTypeFilter, statusFilter, pageSize, customerSort]);

  useEffect(() => {
    if (overview?.pagination && overview.pagination.page !== page) {
      setPage(overview.pagination.page);
    }
  }, [overview?.pagination, page]);

  const openCompany = async (company: PlatformCompanySummary | number) => {
    setError("");
    setAccountFeedback(null);
    setSelectedInitialTab("overview");
    try {
      setSelected(
        await platformAdminApi.getCompany(
          typeof company === "number" ? company : company.id,
        ),
      );
    } catch (loadError) {
      setError(
        t("The account could not be loaded."),
      );
    }
  };

  const openCompanyUsers = async (company: PlatformCompanySummary) => {
    setError("");
    try {
      setUsersCompany(await platformAdminApi.getCompany(company.id));
    } catch (loadError) {
      setError(
        t("Account users could not be loaded."),
      );
    }
  };

  const refreshUsersCompany = async () => {
    if (!usersCompany) return;
    const [overviewData, companyData] = await Promise.all([
      platformAdminApi.getOverview(overviewOptions),
      platformAdminApi.getCompany(usersCompany.id),
    ]);
    setOverview(overviewData);
    setUsersCompany(companyData);
  };

  const refreshOverviewAndCompany = async () => {
    const overviewData = await platformAdminApi.getOverview(overviewOptions);
    setOverview(overviewData);
    if (selected) setSelected(await platformAdminApi.getCompany(selected.id));
  };

  const confirmCompanyDeletion = async () => {
    if (!companyDeletion) return;
    setSaving(true);
    setError("");
    setCompanyDeletionError("");
    try {
      await platformAdminApi.deleteCompanyAccount(companyDeletion.id, companyDeletionName, companyDeletionReason);
      setOverview(await platformAdminApi.getOverview(overviewOptions));
      setAccountFeedback({
        type: "success",
        message: t("{p0} was marked as deleted. Its history was preserved.", { p0: companyDeletion.name }),
      });
      setCompanyDeletion(null);
      setCompanyDeletionName("");
      setCompanyDeletionReason("");
    } catch (deletionError) {
      const message = t("The account could not be deleted.");
      setCompanyDeletionError(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const createCompanyAccount = async (
    payload: PlatformAccountCreatePayload,
  ): Promise<PlatformAccountCreateResult> => {
    const created = await platformAdminApi.createCompanyAccount(payload);
    const [overviewData, courtesyData, auditData] = await Promise.all([
      platformAdminApi.getOverview(overviewOptions),
      platformAdminApi.getCourtesyCodes(),
      platformAdminApi.getAudit(),
    ]);
    setOverview(overviewData);
    setCourtesyCatalog(courtesyData);
    setAuditLog(auditData);
    return created;
  };

  const updateCompanyAccountType = async (
    accountType: EditablePlatformAccountType,
    reason: string,
  ) => {
    if (!accountTypeEdit || saving) return;
    setSaving(true);
    setAccountTypeEditError("");
    try {
      await platformAdminApi.updateCompanyAccountType(
        accountTypeEdit.id,
        accountType,
        reason,
      );
      const [overviewData, auditData] = await Promise.all([
        platformAdminApi.getOverview(overviewOptions),
        platformAdminApi.getAudit(),
      ]);
      setOverview(overviewData);
      setAuditLog(auditData);
      setAccountTypeEdit(null);
    } catch (saveError) {
      setAccountTypeEditError(
        t("The user type could not be updated."),
      );
    } finally {
      setSaving(false);
    }
  };

  const updateCompanyDistributor = async (
    distributorCompanyId: number | null,
    reason: string,
  ) => {
    if (!distributorAssignment || saving) return;
    setSaving(true);
    setDistributorAssignmentError("");
    try {
      await platformAdminApi.updateCompanyDistributor(
        distributorAssignment.id,
        distributorCompanyId,
        reason,
      );
      const [overviewData, auditData] = await Promise.all([
        platformAdminApi.getOverview(overviewOptions),
        platformAdminApi.getAudit(),
      ]);
      setOverview(overviewData);
      setAuditLog(auditData);
      setDistributorAssignment(null);
    } catch (saveError) {
      setDistributorAssignmentError(
        t("The distributor could not be assigned."),
      );
    } finally {
      setSaving(false);
    }
  };

  const extendCompanyTrial = async (days: TrialExtensionDays) => {
    if (!trialExtension || saving) return;
    setSaving(true);
    setTrialExtensionError("");
    try {
      await platformAdminApi.extendCompanyTrial(trialExtension.id, days);
      const [overviewData, auditData] = await Promise.all([
        platformAdminApi.getOverview(overviewOptions),
        platformAdminApi.getAudit(),
      ]);
      setOverview(overviewData);
      setAuditLog(auditData);
      if (selected?.id === trialExtension.id) {
        setSelected(await platformAdminApi.getCompany(trialExtension.id));
      }
      setTrialExtension(null);
    } catch (saveError) {
      setTrialExtensionError(
        t("The trial could not be extended."),
      );
    } finally {
      setSaving(false);
    }
  };

  const grantProductAccess = async (productCode: string) => {
    if (!selected || saving) return;
    setSaving(true);
    setError("");
    setRevocationError("");
    setAccountFeedback(null);
    try {
      const accessEndsAt = selected.benefits
        .filter((item) => item.status.toUpperCase() === "ACTIVE" && item.ends_at)
        .map((item) => item.ends_at as string)
        .sort()[0];
      await platformAdminApi.grantBenefit(selected.id, {
        benefit_type: "PRODUCT",
        product_code: productCode,
        quantity: 1,
        source_type: "SUPPORT",
        reason: t("Module access managed from the Root account."),
        campaign_code: "ROOT-ACCESS",
        ends_at: accessEndsAt,
      });
      await refreshOverviewAndCompany();
      const productName =
        activeCatalogProducts.find(
          (product) => product.product_code === productCode,
        )?.display_name || productCode;
      setAccountFeedback({
        type: "success",
        message: t("{p0} was enabled and synchronized with the account's access.", { p0: productName }),
      });
    } catch (saveError) {
      const message =
        t("The module could not be enabled.");
      setError(message);
      setAccountFeedback({ type: "error", message });
    } finally {
      setSaving(false);
    }
  };

  const previewCompanyProducts = async (productCodes: string[]) => {
    if (!selected) throw new Error(t("Select an account before reviewing the change."));
    return platformAdminApi.previewCompanyProducts(selected.id, productCodes);
  };

  const updateTrialProducts = async (productCodes: string[], expectedCatalogVersion: string) => {
    if (!selected || saving) return false;
    setSaving(true);
    setError("");
    setAccountFeedback(null);
    try {
      const result = await platformAdminApi.updateTrialProducts(
        selected.id,
        productCodes,
        expectedCatalogVersion,
      );
      await refreshOverviewAndCompany();
      setAccountFeedback({
        type: "success",
        message: t("The change to {p0} module(s) was scheduled without an immediate charge. Access will update after payment on the billing date{p1}.", { p0: result.product_codes.length, p1: result.effective_at ? ` (${new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(result.effective_at))})` : "" }),
      });
      return true;
    } catch (saveError) {
      const message = t("Account modules could not be updated.");
      setError(message);
      setAccountFeedback({ type: "error", message });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updatePublicDemoAccess = async (enabled: boolean, reason: string) => {
    if (!selected || saving) return false;
    setSaving(true);
    setError("");
    setAccountFeedback(null);
    try {
      await platformAdminApi.updatePublicDemoAccess(selected.id, enabled, reason);
      await refreshOverviewAndCompany();
      setAccountFeedback({
        type: "success",
        message: enabled
          ? t("The company now appears on /demo and accepts its existing credentials without MFA only on that route.")
          : t("The company no longer accepts /demo access. Normal sign-in is unchanged."),
      });
      return true;
    } catch (saveError) {
      const message = t("Public demo access could not be updated.");
      setError(message);
      setAccountFeedback({ type: "error", message });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submitBenefit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || saving) return;
    setSaving(true);
    setError("");
    setAccountFeedback(null);
    try {
      await platformAdminApi.grantBenefit(selected.id, {
        ...benefit,
        product_code:
          benefit.benefit_type === "PRODUCT"
            ? benefit.product_code?.trim()
            : undefined,
        quantity:
          benefit.benefit_type === "PRODUCT"
            ? 1
            : Number(benefit.quantity || 1),
        reason: benefit.reason.trim(),
        campaign_code: benefit.campaign_code?.trim() || undefined,
        ends_at: benefit.ends_at
          ? new Date(benefit.ends_at).toISOString()
          : undefined,
      });
      setBenefit(initialBenefit);
      await refreshOverviewAndCompany();
      setAccountFeedback({
        type: "success",
        message:
          t("The adjustment was applied and recorded in the audit log."),
      });
    } catch (saveError) {
      const message =
        t("The benefit could not be granted.");
      setError(message);
      setAccountFeedback({ type: "error", message });
    } finally {
      setSaving(false);
    }
  };

  const submitCourtesyCode = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setCourtesyFeedback(null);
    try {
      const created = await platformAdminApi.createCourtesyCode({
        ...courtesy,
        label: courtesy.label.trim(),
        allowed_email:
          courtesy.allowed_email?.trim().toLowerCase() || undefined,
        access_days: courtesy.permanent
          ? undefined
          : Number(courtesy.access_days || 30),
        included_extra_seats: Number(courtesy.included_extra_seats || 0),
        max_redemptions: Number(courtesy.max_redemptions || 1),
        reason: courtesy.reason.trim(),
        campaign_code: courtesy.campaign_code?.trim() || undefined,
      });
      setCreatedCourtesyCode(created.code || "");
      setCourtesy(initialCourtesy);
      setCourtesyCatalog(await platformAdminApi.getCourtesyCodes());
      setCourtesyFeedback({
        kind: "success",
        message:
          t("Promotional access was generated. Copy the code before closing."),
      });
    } catch (saveError) {
      const message =
        t("Promotional access could not be generated.");
      setError(message);
      setCourtesyFeedback({ kind: "error", message });
    } finally {
      setSaving(false);
    }
  };

  const confirmRevocation = async () => {
    if (!revocation || saving || !revocationReason.trim()) return;
    setSaving(true);
    setError("");
    try {
      if (revocation.kind === "benefit") {
        if (!selected) return;
        await platformAdminApi.revokeBenefit(
          selected.id,
          revocation.reference,
          revocationReason.trim(),
        );
        await refreshOverviewAndCompany();
        setAccountFeedback({
          type: "success",
          message: t("{p0} was removed and the account was synchronized.", { p0: revocation.label || t("Access") }),
        });
      } else {
        await platformAdminApi.revokeCourtesyCode(
          revocation.reference,
          revocationReason.trim(),
        );
        setCourtesyCatalog(await platformAdminApi.getCourtesyCodes());
      }
      setRevocation(null);
      setRevocationError("");
      setRevocationReason(t("End of courtesy or promotion"));
    } catch (revokeError) {
      const message =
        t("Revocation could not be completed.");
      setError(message);
      if (revocation.kind === "benefit")
        setAccountFeedback({ type: "error", message });
      setRevocationError(message);
    } finally {
      setSaving(false);
    }
  };

  const confirmModuleAvailability = async () => {
    if (!moduleChange || saving || moduleChangeReason.trim().length < 3) return;
    setSaving(true);
    setError("");
    setModuleChangeError("");
    try {
      await platformAdminApi.updateModuleAvailability(
        moduleChange.module.id,
        moduleChange.active,
        moduleChangeReason.trim(),
      );
      setModuleRegistry(await platformAdminApi.getModules());
      setModuleChange(null);
      setModuleChangeError("");
      setModuleChangeReason(
        t("Global availability managed from the Root panel"),
      );
    } catch (saveError) {
      const message = t("Global module availability could not be changed.");
      setModuleChangeError(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const environment = environmentLabel(locale);
  return (
    <main
      className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white"
      data-module="platform-admin"
    >
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <IndiceBrandLogo
              alt="Índice"
              className="h-9 w-28 shrink-0"
              imageClassName="w-[130px]"
            />
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-medium text-slate-900 dark:text-white">
                  {t("Platform administration")}
                </h1>
                <span
                  className={`hidden rounded-full px-2 py-1 text-[11px] font-medium sm:inline-flex ${environment.className}`}
                >
                  {environment.label}
                </span>
              </div>
              <p className="hidden text-xs text-slate-500 dark:text-slate-400 md:block">
                {t("Customers, catalog, access and commercial operations")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PlatformAdminLanguageSelect />
            <button
              type="button"
              onClick={() => void loadAll()}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              aria-label={t("Refresh data")}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">
                {t("Back to ERP")}
              </span>
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-[1600px] px-4 py-2 lg:px-6">
          <IndiceWorkspaceNavigation<AdminTab>
            ariaLabel={
              t("Administration sections")
            }
            items={visibleTabs.map((tab) => {
              const Icon = tab.icon;
              return {
                id: tab.id,
                label: tab.label,
                icon: <Icon />,
              };
            })}
            onValueChange={setActiveTab}
            tone={activeTab === "customers" ? "aqua" : "blue"}
            value={activeTab}
            variant="sections"
          />
        </div>
        <div className="grid h-1 grid-cols-4" aria-hidden="true">
          <span className="bg-[#59C3A5]" />
          <span className="bg-[#F7C845]" />
          <span className="bg-[#FF6B63]" />
          <span className="bg-[#2563EB]" />
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 lg:px-6 lg:py-6">
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
        {loading && !overview ? <LoadingState /> : null}

        {!loading || overview ? (
          <>
            {activeTab === "customers" ? (
              <CustomersTab
                english={english}
                 totals={overview?.totals}
                 allCompanies={overview?.companies ?? []}
                 control={overview?.control}
                 paginationData={overview?.pagination}
                 loading={overviewLoading}
                companies={companies}
                pagedCompanies={pagedCompanies}
                query={query}
                userTypeFilter={userTypeFilter}
                statusFilter={statusFilter}
                sort={customerSort}
                page={page}
                pageSize={pageSize}
                canCreate={canCreateAccounts}
                canEditTypes={Boolean(context?.can_manage_accounts)}
                canAssignDistributors={Boolean(context?.can_manage_accounts)}
                canExtendTrials={context?.role === "PLATFORM_ROOT"}
                canRequestPayment={context?.role === "PLATFORM_ROOT"}
                canManageCourtesy={Boolean(context?.can_manage_benefits)}
                onCreate={() => {
                  setAccountCreationPreset(null);
                  setCreateAccountOpen(true);
                }}
                onQuickCreate={() => setQuickTestAccountOpen(true)}
                onOpenCourtesy={() => {
                  setCourtesyFeedback(null);
                  setCourtesyAccessOpen(true);
                }}
                onQuery={setQuery}
                onUserType={setUserTypeFilter}
                onStatus={setStatusFilter}
                onSort={(key) =>
                  setCustomerSort((current) =>
                    current.key !== key
                      ? { key, direction: "asc" }
                      : {
                          key,
                          direction:
                            current.direction === null
                              ? "asc"
                              : current.direction === "asc"
                                ? "desc"
                                : null,
                        },
                  )
                }
                onPage={setPage}
                onPageSize={setPageSize}
                onOpenCompany={openCompany}
                onOpenUsers={openCompanyUsers}
                onEditType={(company) => {
                  setAccountTypeEditError("");
                  setAccountTypeEdit(company);
                }}
                onAssignDistributor={(company) => {
                  setDistributorAssignmentError("");
                  setDistributorAssignment(company);
                }}
                onExtendTrial={(company) => {
                  setTrialExtensionError("");
                  setTrialExtension(company);
                }}
                onRequestPayment={setPaymentRequestCompany}
                onDelete={(company) => {
                  setCompanyDeletionName("");
                  setCompanyDeletionReason("");
                  setCompanyDeletionError("");
                  setCompanyDeletion(company);
                }}
              />
            ) : null}
            {activeTab === "companies" ? (
              <CompaniesDirectoryTab
                english={english}
                companies={overview?.companies ?? []}
                canManageRoles={context?.role === "PLATFORM_ROOT"}
                onOpenCompany={(company) => {
                  setSelectedInitialTab("overview");
                  setSelected(company);
                }}
              />
            ) : null}
            {activeTab === "billing" ? (
              <div className="space-y-5">
                <StripeSetupPanel
                  english={english}
                  environment={catalog?.stripe_environment}
                  canDemoConnect={canDemoConnect}
                  demoConnected={canDemoConnect && stripeDemoConnected}
                  onDemoConnect={() => setStripeDemoDialogOpen(true)}
                  onDemoDisconnect={() => setStripeDemoConnected(false)}
                  refreshing={stripeStatusRefreshing}
                  onRefresh={() => void refreshStripeStatus()}
                />
                {canDemoConnect ? (
                  <StripeDemoConnectionDialog
                    open={stripeDemoDialogOpen}
                    english={english}
                    onClose={() => setStripeDemoDialogOpen(false)}
                    onActivate={(active) => {
                      if (canDemoConnect) setStripeDemoConnected(active);
                    }}
                  />
                ) : null}
                {stripeStatusError ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{stripeStatusError}</p> : null}
                <BillingTab
                  english={english}
                  data={billing}
                  onDataChange={setBilling}
                  onOpenCompany={openCompany}
                />
              </div>
            ) : null}
            {activeTab === "catalog" ? (
              <CatalogAndModulesTab
                english={english}
                catalog={catalog}
                modules={moduleRegistry}
                canManage={Boolean(context?.can_manage_modules)}
                canPublish={context?.role === "PLATFORM_ROOT"}
                saving={saving}
                onCatalogChange={setCatalog}
                onModuleChange={(change) => {
                  setModuleChangeError("");
                  setModuleChange(change);
                }}
              />
            ) : null}
            {activeTab === "consulting" ? (
              <ConsultingAdminTab
                canManage={Boolean(context?.can_manage_consulting)}
                companies={companies}
              />
            ) : null}
            {activeTab === "training" ? (
              <TrainingWorkspace portal="root" locale={currentLanguage.code} />
            ) : null}
            {activeTab === "systemTickets" && context?.can_manage_system_tickets ? (
              <SystemTicketsWorkspace portal="root" locale={currentLanguage.code} />
            ) : null}
            {activeTab === "internalDevelopment" && context?.role === "PLATFORM_ROOT" ? (
              <InternalDevelopmentWorkspace locale={currentLanguage.code} />
            ) : null}
            {activeTab === "audit" ? (
              <AuditTab english={english} data={auditLog} />
            ) : null}
          </>
        ) : null}
      </div>

      {selected && revocation?.kind !== "benefit" ? (
        <CompanyAccountDrawer
          company={selected}
          context={context}
          catalogProducts={activeCatalogProducts}
          benefit={benefit}
          saving={saving}
          feedback={accountFeedback}
          onClose={() => {
            setSelected(null);
            setAccountFeedback(null);
          }}
          onBenefit={setBenefit}
          onSubmitBenefit={submitBenefit}
          onGrantProduct={(productCode) => void grantProductAccess(productCode)}
          onPreviewProducts={previewCompanyProducts}
          onUpdateTrialProducts={updateTrialProducts}
          onRefreshCompany={refreshOverviewAndCompany}
          onUpdatePublicDemo={updatePublicDemoAccess}
          onRevokeBenefit={(reference, label, grantCount) => {
            setRevocationError("");
            setRevocation({ kind: "benefit", reference, label, grantCount });
          }}
          initialTab={selectedInitialTab}
        />
      ) : null}
      {usersCompany ? (
        <CustomerUsersModal
          company={usersCompany}
          canManage={Boolean(context?.can_manage_accounts)}
          onClose={() => setUsersCompany(null)}
          onRefresh={refreshUsersCompany}
          onManageSeats={() => {
            setSelectedInitialTab("access");
            setSelected(usersCompany);
            setUsersCompany(null);
          }}
        />
      ) : null}
      {createAccountOpen ? (
        <AccountCreationModal
          products={activeCatalogProducts}
          existingOwnerEmails={(overview?.companies ?? []).flatMap((company) =>
            company.owner_email ? [company.owner_email] : [],
          )}
          initialForm={accountCreationPreset ?? undefined}
          initialStep={accountCreationPreset ? "access" : undefined}
          onClose={() => {
            setCreateAccountOpen(false);
            setAccountCreationPreset(null);
          }}
          onCreate={createCompanyAccount}
          onOpenAccount={(companyId) => {
            setCreateAccountOpen(false);
            setAccountCreationPreset(null);
            setActiveTab("customers");
            void openCompany(companyId);
          }}
        />
      ) : null}
      {quickTestAccountOpen ? (
        <QuickTestAccountModal
          products={activeCatalogProducts}
          existingOwnerEmails={(overview?.companies ?? []).flatMap((company) =>
            company.owner_email ? [company.owner_email] : [],
          )}
          onClose={() => setQuickTestAccountOpen(false)}
          onContinue={(form) => {
            setQuickTestAccountOpen(false);
            setAccountCreationPreset(form);
            setCreateAccountOpen(true);
          }}
        />
      ) : null}
      {accountTypeEdit ? (
        <AccountTypeEditModal
          company={accountTypeEdit}
          english={english}
          saving={saving}
          error={accountTypeEditError}
          onClose={() => {
            setAccountTypeEdit(null);
            setAccountTypeEditError("");
          }}
          onSave={updateCompanyAccountType}
        />
      ) : null}
      {distributorAssignment ? (
        <DistributorAssignmentModal
          company={distributorAssignment}
          distributors={distributorAccounts}
          english={english}
          saving={saving}
          error={distributorAssignmentError}
          onClose={() => {
            setDistributorAssignment(null);
            setDistributorAssignmentError("");
          }}
          onSave={updateCompanyDistributor}
        />
      ) : null}
      {paymentRequestCompany ? (
        <PaymentRequestModal
          key={paymentRequestCompany.id}
          company={paymentRequestCompany}
          english={english}
          onClose={() => setPaymentRequestCompany(null)}
          onChanged={refreshOverviewAndCompany}
        />
      ) : null}
      {trialExtension ? (
        <TrialExtensionModal
          company={trialExtension}
          english={english}
          saving={saving}
          error={trialExtensionError}
          onClose={() => {
            setTrialExtension(null);
            setTrialExtensionError("");
          }}
          onConfirm={extendCompanyTrial}
        />
      ) : null}
      {courtesyAccessOpen ? (
        <IndiceModalFrame
          open
          onOpenChange={(open) => !open && setCourtesyAccessOpen(false)}
          modalType="operational-workspace"
          tone="aqua"
          icon={<Gift className="h-5 w-5" />}
          eyebrow={t("Customers")}
          title={t("Promotional access")}
          description={
            t("Create and manage auditable access codes without leaving the customer workflow.")
          }
        >
          <CourtesyTab
            context={context}
            catalog={courtesyCatalog}
            value={courtesy}
            createdCode={createdCourtesyCode}
            feedback={courtesyFeedback}
            saving={saving}
            onChange={setCourtesy}
            onSubmit={submitCourtesyCode}
            onRevoke={(reference) => {
              setRevocationError("");
              setRevocation({ kind: "courtesy", reference });
            }}
          />
        </IndiceModalFrame>
      ) : null}
      {revocation ? (
        <ConfirmModal
          revocation={revocation}
          reason={revocationReason}
          error={revocationError}
          saving={saving}
          onReason={setRevocationReason}
          onCancel={() => {
            setRevocation(null);
            setRevocationError("");
          }}
          onConfirm={() => void confirmRevocation()}
        />
      ) : null}
      {moduleChange ? (
        <ModuleAvailabilityModal
          change={moduleChange}
          reason={moduleChangeReason}
          error={moduleChangeError}
          saving={saving}
          onReason={setModuleChangeReason}
          onCancel={() => {
            setModuleChange(null);
            setModuleChangeError("");
          }}
          onConfirm={() => void confirmModuleAvailability()}
        />
      ) : null}
      {companyDeletion ? (
        <IndiceConfirmationDialog
          busy={saving}
          confirmDisabled={companyDeletionName !== companyDeletion.name || companyDeletionReason.trim().length < 5}
          cancelLabel={t("Cancel")}
          confirmLabel={saving ? (t("Deleting...")) : (t("Mark as deleted"))}
          description={t("This is a soft deletion. The account and its history remain stored, but access is blocked. Active Stripe subscriptions must be cancelled first.")}
          destructive
          icon={<Trash2 className="h-5 w-5" />}
          itemName={companyDeletion.name}
          onCancel={() => {
            setCompanyDeletion(null);
            setCompanyDeletionError("");
          }}
          onConfirm={() => void confirmCompanyDeletion()}
          open
          title={t("Delete account")}
          tone="coral"
        >
          <IndiceModalValidation messages={companyDeletionError ? [companyDeletionError] : []} />
          <Field label={t("Deletion reason")}>
            <textarea autoFocus minLength={5} value={companyDeletionReason} onChange={(event) => setCompanyDeletionReason(event.target.value)} className={`${controlClass} min-h-24 resize-y py-2`} />
          </Field>
          <Field label={t("Type “{p0}” to confirm", { p0: companyDeletion.name })}>
            <input value={companyDeletionName} onChange={(event) => setCompanyDeletionName(event.target.value)} className={controlClass} autoComplete="off" />
          </Field>
        </IndiceConfirmationDialog>
      ) : null}
    </main>
  );
}

function CustomersTab({
  english,
  totals,
  allCompanies,
  control,
  paginationData,
  loading,
  companies,
  pagedCompanies,
  query,
  userTypeFilter,
  statusFilter,
  sort,
  page,
  pageSize,
  canCreate,
  canEditTypes,
  canAssignDistributors,
  canExtendTrials,
  canRequestPayment,
  canManageCourtesy,
  onCreate,
  onQuickCreate,
  onOpenCourtesy,
  onQuery,
  onUserType,
  onStatus,
  onSort,
  onPage,
  onPageSize,
  onOpenCompany,
  onOpenUsers,
  onEditType,
  onAssignDistributor,
  onExtendTrial,
  onRequestPayment,
  onDelete,
}: {
  english: boolean;
  totals: PlatformOverview["totals"] | undefined;
  allCompanies: PlatformCompanySummary[];
  control: PlatformOverview["control"] | undefined;
  paginationData: PlatformOverview["pagination"] | undefined;
  loading: boolean;
  companies: PlatformCompanySummary[];
  pagedCompanies: PlatformCompanySummary[];
  query: string;
  userTypeFilter: string;
  statusFilter: string;
  sort: { key: CustomerSortKey; direction: SortDirection };
  page: number;
  pageSize: number;
  canCreate: boolean;
  canEditTypes: boolean;
  canAssignDistributors: boolean;
  canExtendTrials: boolean;
  canRequestPayment: boolean;
  canManageCourtesy: boolean;
  onCreate: () => void;
  onQuickCreate: () => void;
  onOpenCourtesy: () => void;
  onQuery: (value: string) => void;
  onUserType: (value: string) => void;
  onStatus: (value: string) => void;
  onSort: (key: CustomerSortKey) => void;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
  onOpenCompany: (company: PlatformCompanySummary | number) => void;
  onOpenUsers: (company: PlatformCompanySummary) => void;
  onEditType: (company: PlatformCompanySummary) => void;
  onAssignDistributor: (company: PlatformCompanySummary) => void;
  onExtendTrial: (company: PlatformCompanySummary) => void;
  onRequestPayment: (company: PlatformCompanySummary) => void;
  onDelete: (company: PlatformCompanySummary) => void;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  const pages = paginationData?.total_pages ?? 1;
  const totalCount = paginationData?.total_items ?? companies.length;
  const copy = getCustomerTableCopy(locale);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<CustomerTableColumnId[]>(
    loadCustomerTableColumnIds,
  );
  useEffect(() => {
    saveCustomerTableColumnIds(visibleColumns);
  }, [visibleColumns]);
  const demoAndTrialAccounts = totals?.demo_and_trial_accounts ?? 0;
  const pagination = (
    <DataTablePagination
      currentPage={page}
      totalPages={pages}
      pageSize={pageSize}
      pageSizeOptions={[10, 25, 50, 100, 200]}
      totalCount={totalCount}
      pageStart={totalCount ? (page - 1) * pageSize + 1 : 0}
      pageEnd={Math.min(page * pageSize, totalCount)}
      itemLabel={t("accounts")}
      onPageChange={onPage}
      onPageSizeChange={onPageSize}
    />
  );

  return (
    <div className="space-y-5" aria-busy={loading}>
      <IndiceTitleBar
        tone="aqua"
        icon={<Building2 className="h-5 w-5" />}
        title={
          t("Customer control center")
        }
        subtitle={
          t("Control each customer's health, owner, access, billing and next action from one place.")
        }
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setColumnsOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#59C3A5]/45 bg-white px-4 text-sm font-medium text-[#176B5B] transition hover:bg-[#59C3A5]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/25 dark:bg-slate-900 dark:text-[#8FE0CA]"
            >
              <Columns3 className="h-4 w-4" />
              {copy.columns}
            </button>
            {canCreate || canManageCourtesy ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#59C3A5]/45 bg-white px-4 text-sm font-medium text-[#176B5B] transition hover:bg-[#59C3A5]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/25 dark:bg-slate-900 dark:text-[#8FE0CA]"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    {copy.more}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-64 rounded-xl border-[#59C3A5]/30 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-900">
                  {canManageCourtesy ? (
                    <DropdownMenuItem onSelect={onOpenCourtesy} className="rounded-lg py-2.5">
                      <Gift className="h-4 w-4 text-[#177D66]" />
                      {t("Promotional access")}
                    </DropdownMenuItem>
                  ) : null}
                  {canCreate ? (
                    <DropdownMenuItem onSelect={onQuickCreate} className="rounded-lg py-2.5">
                      <Sparkles className="h-4 w-4 text-[#177D66]" />
                      {t("Quick test account")}
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            {canCreate ? (
              <button
                type="button"
                onClick={onCreate}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white transition hover:bg-[#126553] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/30"
              >
                <Plus className="h-4 w-4" />
                {t("Add account")}
              </button>
            ) : null}
          </div>
        }
      />
      <CustomerControlCenter
        english={english}
        companies={allCompanies}
        control={control}
        activeFilter={statusFilter}
        onFilter={onStatus}
        onOpenCompany={(company) => onOpenCompany(company)}
      />
      <IndiceFilterBar
        title={t("Customer portfolio")}
        gridClassName="lg:grid-cols-[minmax(0,1fr)_220px_260px]"
      >
        <IndiceFilterSearch
          label={t("Search")}
          placeholder={
            t("Company, email or ID")
          }
          tone="aqua"
          value={query}
          onValueChange={onQuery}
          onClear={() => onQuery("")}
        />
        <IndiceFilterSelect
          label={t("Account type")}
          tone="aqua"
          value={userTypeFilter}
          onValueChange={onUserType}
          options={[
            { value: "all", label: t("All types") },
            { value: "ROOT", label: "Root" },
            { value: "SUPER_ADMIN", label: t("Super Admin") },
            {
              value: "DISTRIBUTOR",
              label: t("Distributor"),
            },
          ]}
        />
        <IndiceFilterSelect
          label={t("Commercial status")}
          tone="aqua"
          value={statusFilter}
          onValueChange={onStatus}
          options={[
            {
              value: "all",
              label: t("All statuses"),
            },
            { value: "active", label: t("Active") },
            {
              value: "temporary",
              label: t("Demo and trial"),
            },
            { value: "trial", label: t("Trial") },
            { value: "demo", label: t("Demo") },
            {
              value: "inactive",
              label: t("Inactive"),
            },
            {
              value: "attention",
              label: t("Needs attention"),
            },
            {
              value: "expiring",
              label: t("Trial ending in 7 days"),
            },
            {
              value: "no_offer",
              label: t("No offer configured"),
            },
            {
              value: "no_adoption",
              label: t("No active users"),
            },
            { value: "deleted", label: t("Deleted") },
          ]}
        />
      </IndiceFilterBar>
      <section
        className="grid gap-3 md:grid-cols-3"
        aria-label={t("Customer KPIs")}
      >
        <Metric
          icon={CircleDollarSign}
          label={t("Monthly projection")}
          value={formatMoney(totals?.projected_monthly_billing_cents, totals?.currency, locale)}
          caption={t("Stripe contracts + estimates")}
          accent="gold"
        />
        <Metric
          icon={Building2}
          label={t("Active accounts")}
          value={String(totals?.active_customer_companies ?? 0)}
          caption={
            t("{p0} total active users", { p0: totals?.customer_active_users ?? 0 })
          }
          accent="mint"
          active={statusFilter === "active"}
          actionLabel={t("Filter active accounts")}
          onClick={() => onStatus(statusFilter === "active" ? "all" : "active")}
        />
        <Metric
          icon={Sparkles}
          label={t("Demo and trial")}
          value={String(demoAndTrialAccounts)}
          caption={t("Temporary access")}
          accent="blue"
          active={statusFilter === "temporary"}
          actionLabel={t("Filter demo and trial accounts")}
          onClick={() => onStatus(statusFilter === "temporary" ? "all" : "temporary")}
        />
      </section>
      <CustomersTable
        english={english}
        companies={pagedCompanies}
        columns={visibleColumns}
        pagination={pagination}
        sort={sort}
        onSort={onSort}
        onOpenCompany={onOpenCompany}
        onOpenUsers={onOpenUsers}
        canEditTypes={canEditTypes}
        canAssignDistributors={canAssignDistributors}
        canExtendTrials={canExtendTrials}
        canRequestPayment={canRequestPayment}
        onEditType={onEditType}
        onAssignDistributor={onAssignDistributor}
        onExtendTrial={onExtendTrial}
        onRequestPayment={onRequestPayment}
        canDelete={canEditTypes}
        onDelete={onDelete}
      />
      <CustomerColumnsModal
        copy={copy}
        isOpen={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
      />
    </div>
  );
}

function BillingTab({
  english,
  data,
  onDataChange,
  onOpenCompany,
}: {
  english: boolean;
  data: PlatformBilling | null;
  onDataChange: (data: PlatformBilling) => void;
  onOpenCompany: (company: number) => void;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestSequence = useRef(0);
  const [sort, setSort] = useState<{
    key: BillingSortKey;
    direction: SortDirection;
  }>({ key: "period", direction: "desc" });
  const totals = data?.totals;
  const invoices = data?.invoices ?? [];
  const changeSort = (key: BillingSortKey) =>
    setSort((current) =>
      current.key !== key
        ? { key, direction: "asc" }
        : {
            key,
            direction:
              current.direction === null
                ? "asc"
                : current.direction === "asc"
                  ? "desc"
                  : null,
          },
    );
  useEffect(() => {
    setPage(1);
  }, [pageSize, query, sort, status]);
  useEffect(() => {
    const sequence = ++requestSequence.current;
    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await platformAdminApi.getBilling({
          query,
          status,
          sort: sort.direction ? sort.key : "period",
          direction: sort.direction ?? "desc",
          page,
          pageSize,
        });
        if (!cancelled && sequence === requestSequence.current) onDataChange(response);
      } catch (loadError) {
        if (!cancelled && sequence === requestSequence.current) {
          setError(
            t("Billing history could not be loaded."),
          );
        }
      } finally {
        if (!cancelled && sequence === requestSequence.current) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [t, onDataChange, page, pageSize, query, sort, status]);
  useEffect(() => {
    if (data?.pagination && data.pagination.page !== page) setPage(data.pagination.page);
  }, [data?.pagination, page]);
  const pagination = (
    <DataTablePagination
      currentPage={page}
      totalPages={data?.pagination?.total_pages ?? 1}
      pageSize={pageSize}
      pageSizeOptions={[10, 25, 50, 100, 200]}
      totalCount={data?.pagination?.total_items ?? invoices.length}
      pageStart={(data?.pagination?.total_items ?? 0) ? (page - 1) * pageSize + 1 : 0}
      pageEnd={Math.min(page * pageSize, data?.pagination?.total_items ?? invoices.length)}
      itemLabel={t("invoices")}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
    />
  );
  return (
    <div className="space-y-5" aria-busy={loading}>
      <IndiceTitleBar
        tone="blue"
        icon={<CreditCard className="h-5 w-5" />}
        eyebrow={t("Billing")}
        title={t("Payments and documents")}
        subtitle={
          t("Stripe remains the payment authority; this view shows synchronized operational status.")
        }
      />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={CircleDollarSign}
          label={t("Total collected")}
          value={formatMoney(totals?.paid_cents, totals?.currency, locale)}
          accent="mint"
        />
        <Metric
          icon={FileClock}
          label={t("Open balance")}
          value={formatMoney(totals?.open_cents, totals?.currency, locale)}
          accent="gold"
        />
        <Metric
          icon={CircleAlert}
          label={
            t("Documents requiring attention")
          }
          value={String(totals?.failed ?? 0)}
          accent="coral"
        />
        <Metric
          icon={CreditCard}
          label={t("Synchronized invoices")}
          value={String(totals?.invoices ?? 0)}
          accent="blue"
        />
      </section>
      <IndiceFilterBar
        title={t("Billing documents")}
        gridClassName="lg:grid-cols-[minmax(0,1fr)_240px]"
      >
        <IndiceFilterSearch
          label={t("Search")}
          placeholder={t("Customer, invoice, status or ID")}
          tone="aqua"
          value={query}
          onValueChange={setQuery}
          onClear={() => setQuery("")}
        />
        <IndiceFilterSelect
          label={t("Document status")}
          tone="aqua"
          value={status}
          onValueChange={setStatus}
          options={[
            { value: "all", label: t("All statuses") },
            { value: "paid", label: t("Paid") },
            { value: "open", label: t("Open") },
            { value: "attention", label: t("Needs attention") },
          ]}
        />
      </IndiceFilterBar>
      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <Panel
        title={t("Billing history")}
        description={
          t("Collected and pending amounts with official Stripe links.")
        }
      >
        <IndiceTableShell pagination={pagination}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                {(
                  [
                    ["customer", t("Customer")],
                    ["invoice", t("Invoice")],
                    ["status", t("Status")],
                    ["amount", t("Amount")],
                    ["paid", t("Paid")],
                    ["period", t("Period")],
                  ] as const
                ).map(([key, label]) => (
                  <SortableBillingHeader
                    key={key}
                    column={key}
                    label={label}
                    sort={sort}
                    onSort={changeSort}
                  />
                ))}
                <th className={`${tableHeadClass} text-right`}>
                  {t("Documents")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.map((invoice) => (
                <InvoiceRow
                  key={invoice.invoice_id}
                  invoice={invoice}
                  onOpenCompany={onOpenCompany}
                />
              ))}
              {!invoices.length ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyRow
                      icon={CreditCard}
                      text={
                        t("No invoices have been synchronized in this environment yet.")
                      }
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
            </table>
          </div>
        </IndiceTableShell>
      </Panel>
    </div>
  );
}

function InvoiceRow({
  invoice,
  onOpenCompany,
}: {
  invoice: PlatformInvoice;
  onOpenCompany: (company: number) => void;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  return (
    <tr className="hover:bg-slate-50/80">
      <td className={tableCellClass}>
        {invoice.company_id ? (
          <button
            type="button"
            onClick={() => onOpenCompany(invoice.company_id!)}
            className="text-left"
          >
            <p className="font-medium text-slate-900">
              {invoice.company_name || `Company #${invoice.company_id}`}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {invoice.owner_email || t("No owner email")}
            </p>
          </button>
        ) : (
          t("Unassigned")
        )}
      </td>
      <td className={tableCellClass}>
        <span className="font-mono text-xs text-slate-600">
          {shortId(invoice.invoice_id)}
        </span>
      </td>
      <td className={tableCellClass}>
        <StatusBadge status={invoice.status || "unknown"} />
      </td>
      <td className={tableCellClass}>
        {formatMoney(invoice.amount_due_cents, invoice.currency, locale)}
      </td>
      <td className={tableCellClass}>
        {formatMoney(invoice.amount_paid_cents, invoice.currency, locale)}
      </td>
      <td className={tableCellClass}>
        <p>{formatDate(invoice.period_starts_at, locale)}</p>
        <p className="text-xs text-slate-500">
          {t("to")}{formatDate(invoice.period_ends_at, locale)}
        </p>
      </td>
      <td className={`${tableCellClass} text-right`}>
        <div className="inline-flex gap-2">
          {invoice.hosted_invoice_url ? (
            <a
              href={invoice.hosted_invoice_url}
              target="_blank"
              rel="noreferrer"
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200"
              aria-label={t("Open invoice")}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
          {invoice.invoice_pdf_url ? (
            <a
              href={invoice.invoice_pdf_url}
              target="_blank"
              rel="noreferrer"
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200"
              aria-label={t("Download PDF")}
            >
              <Download className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function SortableBillingHeader({
  column,
  label,
  sort,
  onSort,
}: {
  column: BillingSortKey;
  label: string;
  sort: { key: BillingSortKey; direction: SortDirection };
  onSort: (key: BillingSortKey) => void;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  const activeDirection = sort.key === column ? sort.direction : null;
  const Icon =
    activeDirection === "asc"
      ? ArrowUp
      : activeDirection === "desc"
        ? ArrowDown
        : ArrowUpDown;
  return (
    <th
      className={tableHeadClass}
      aria-sort={
        activeDirection === "asc"
          ? "ascending"
          : activeDirection === "desc"
            ? "descending"
            : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`group inline-flex items-center gap-1.5 rounded-md py-1 text-left transition hover:text-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/25 ${activeDirection ? "font-semibold text-[#2563EB]" : ""}`}
        title={`${label} · ${activeDirection === "asc" ? t("Ascending") : activeDirection === "desc" ? t("Descending") : t("Sort")}`}
      >
        <span>{label}</span>
        <Icon
          className={`h-3.5 w-3.5 ${activeDirection ? "opacity-100" : "opacity-45 group-hover:opacity-100"}`}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

type CatalogView = "products" | "prices";
type CatalogWorkspaceView = "offer" | "modules";
const isCatalogWorkspaceView = (value: unknown): value is CatalogWorkspaceView =>
  value === "offer" || value === "modules";
const operationalLocaleLabels: Record<string, string> = {
  "en-CA": "English (Canada)",
  "en-US": "English (United States)",
  "es-MX": "Español (México)",
  "es-CO": "Español (Colombia)",
  "fr-CA": "Français (Canada)",
  "pt-BR": "Português (Brasil)",
  "ko-CA": "한국어",
  "zh-CA": "中文",
};
type CatalogEditTarget =
  | { kind: "product"; value: PlatformCatalogProduct }
  | { kind: "price"; value: PlatformCatalogPrice };
type CatalogPriceGroupStatus = "ready" | "review" | "inactive";
type CatalogPriceGroup = {
  key: string;
  name: string;
  priceType: string;
  currency: string;
  monthly?: PlatformCatalogPrice;
  yearly?: PlatformCatalogPrice;
  status: CatalogPriceGroupStatus;
};

const isInactiveCatalogPrice = (price: PlatformCatalogPrice) =>
  ["ARCHIVED", "INACTIVE"].includes(price.status);

const isReadyCatalogPrice = (price?: PlatformCatalogPrice) =>
  Boolean(
    price &&
      !isInactiveCatalogPrice(price) &&
      price.unit_amount_cents != null &&
      price.unit_amount_cents >= 0 &&
      price.external_price_id,
  );

const humanizeCatalogCode = (value: string, locale: string) => {
  const normalized = value
    .replace(/^(addon|base|plan|price)_/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  return normalized
    ? normalized.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase())
    : getPlatformAdminTranslator(locale)("Product");
};

const catalogPriceTypeLabel = (value: string, locale: string) => {
  const t = getPlatformAdminTranslator(locale);
  if (value === "ADDON") return t("Add-on");
  if (["BASE", "PACKAGE", "PLAN"].includes(value)) {
    return t("Package");
  }
  return humanizeCatalogCode(value, locale);
};

function catalogPriceBusinessName(
  price: PlatformCatalogPrice,
  products: PlatformCatalogProduct[],
  locale: string,
) {
  const product = products.find(
    (candidate) =>
      candidate.id === price.catalog_product_id ||
      candidate.product_code === price.billable_code,
  );
  return (
    (product ? catalogProductLabel(product, locale) : "") ||
    offerLabels(locale)[price.billable_code] ||
    humanizeCatalogCode(price.billable_code, locale)
  );
}

function buildCatalogPriceGroups(
  prices: PlatformCatalogPrice[],
  products: PlatformCatalogProduct[],
  locale: string,
) {
  const grouped = new Map<string, CatalogPriceGroup>();
  prices.forEach((price) => {
    const key = `${price.billable_code}:${price.price_type}:${price.currency}`;
    const current = grouped.get(key) || {
      key,
      name: catalogPriceBusinessName(price, products, locale),
      priceType: price.price_type,
      currency: price.currency,
      status: "review" as CatalogPriceGroupStatus,
    };
    if (price.billing_interval === "YEAR") current.yearly = price;
    else current.monthly = price;
    grouped.set(key, current);
  });

  return Array.from(grouped.values()).map((group) => {
    const variants = [group.monthly, group.yearly].filter(
      (price): price is PlatformCatalogPrice => Boolean(price),
    );
    const status: CatalogPriceGroupStatus = variants.every(
      isInactiveCatalogPrice,
    )
      ? "inactive"
      : isReadyCatalogPrice(group.monthly) && isReadyCatalogPrice(group.yearly)
        ? "ready"
        : "review";
    return { ...group, status };
  });
}

function CatalogAndModulesTab({
  english,
  catalog,
  modules,
  canManage,
  canPublish,
  saving,
  onCatalogChange,
  onModuleChange,
}: {
  english: boolean;
  catalog: PlatformCatalog | null;
  modules: PlatformModules | null;
  canManage: boolean;
  canPublish: boolean;
  saving: boolean;
  onCatalogChange: (data: PlatformCatalog) => void;
  onModuleChange: (change: ModuleAvailabilityChange) => void;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  const [view, setView] = useState<CatalogWorkspaceView>("offer");
  const catalogNavigationState = useMemo(() => ({ step: view }), [view]);
  const restoreCatalogNavigation = useCallback(
    (restored: { step: CatalogWorkspaceView }) => {
      if (isCatalogWorkspaceView(restored.step)) setView(restored.step);
    },
    [],
  );
  useWorkspaceNavigationMemory({
    moduleKey: "platform-admin",
    tabKey: "catalog-navigation",
    state: catalogNavigationState,
    defaults: { step: "offer" as CatalogWorkspaceView },
    urlFields: { step: "catalog-step" },
    onRestore: restoreCatalogNavigation,
    rememberScroll: false,
  });
  const [syncing, setSyncing] = useState(false);
  const [catalogWorkflowBusy, setCatalogWorkflowBusy] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [catalogValidation, setCatalogValidation] =
    useState<PlatformCatalogValidation | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const draftVersion = catalog?.versions.find(
    (version) => version.status === "DRAFT",
  );
  const publicationMode = catalog?.stripe_environment?.mode;
  const publicationAvailable = Boolean(
    catalog?.stripe_environment?.enabled &&
    (publicationMode === "TEST" ||
      (publicationMode === "LIVE" && catalog?.stripe_environment?.catalog_live_sync_enabled)),
  );
  const activeVersion = catalog?.versions.find(
    (version) => version.status === "ACTIVE",
  );
  const workingVersion =
    draftVersion || activeVersion ||
    catalog?.versions[0];
  const versionProducts = (catalog?.products ?? []).filter(
    (product) =>
      !workingVersion || product.catalog_version_id === workingVersion.id,
  );

  const synchronizeComplementaries = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const result = await platformAdminApi.synchronizeComplementaryProducts();
      onCatalogChange(await platformAdminApi.getCatalog());
      setCatalogValidation(null);
      setSyncFeedback({
        type: "success",
        message: t("{p0} products and {p1} prices were added to the commercial catalog.", { p0: result.products_created, p1: result.prices_created }),
      });
    } catch (syncError) {
      setSyncFeedback({
        type: "error",
        message:
          t("The commercial catalog could not be updated."),
      });
    } finally {
      setSyncing(false);
    }
  };

  const prepareCatalogDraft = async () => {
    if (catalogWorkflowBusy) return;
    setCatalogWorkflowBusy(true);
    setSyncFeedback(null);
    try {
      const draft = await platformAdminApi.createCatalogDraft();
      onCatalogChange(await platformAdminApi.getCatalog());
      setCatalogValidation(null);
      setSyncFeedback({
        type: "success",
        message: t("{p0} is ready for controlled changes.", { p0: draft.version_code }),
      });
    } catch (workflowError) {
      setSyncFeedback({
        type: "error",
        message:
          t("The working version could not be prepared."),
      });
    } finally {
      setCatalogWorkflowBusy(false);
    }
  };

  const validateCatalogDraft = async () => {
    if (!draftVersion || catalogWorkflowBusy) return;
    setCatalogWorkflowBusy(true);
    setSyncFeedback(null);
    try {
      const validation =
        await platformAdminApi.validateCatalogDraft(draftVersion.id);
      setCatalogValidation(validation);
      onCatalogChange(await platformAdminApi.getCatalog());
      setSyncFeedback({
        type: validation.ready ? "success" : "error",
        message: validation.ready
          ? t("The offer is complete and remotely verified in Stripe {p0}.", { p0: validation.stripe_mode })
          : t("{p0} item(s) must be completed before publishing.", { p0: validation.blockers.length }),
      });
    } catch (workflowError) {
      setSyncFeedback({
        type: "error",
        message:
          t("The offer could not be validated."),
      });
    } finally {
      setCatalogWorkflowBusy(false);
    }
  };

  const publishCatalogDraft = async (confirmation: string) => {
    if (!draftVersion || !canPublish || !publicationMode || !publicationAvailable || catalogWorkflowBusy) return;
    setCatalogWorkflowBusy(true);
    setSyncFeedback(null);
    setPublishError(null);
    try {
      const result = await publishCatalogOffer(
        platformAdminApi,
        draftVersion.id,
        { target_mode: publicationMode, confirmation },
      );
      if (result.catalog) onCatalogChange(result.catalog);
      setCatalogValidation(null);
      if (!result.published) {
        const message = t("Publication could not be confirmed. Refresh the offer status before retrying.");
        setPublishError(message);
        setSyncFeedback({ type: "error", message });
        return;
      }
      setPublishDialogOpen(false);
      setSyncFeedback({
        type: "success",
        message: t("{p0} is now the active offer. Existing customers keep their agreed version.{p1}", { p0: result.versionCode, p1: result.catalog ? "" : ` ${t("Reload the catalog to see the updated status.")}` }),
      });
    } finally {
      setCatalogWorkflowBusy(false);
    }
  };

  const workspaceTabs = [
    {
      id: "offer" as const,
      label: t("Commercial offer"),
      description: t("Modules, packages, prices and promotions"),
      icon: PackageCheck,
    },
    {
      id: "modules" as const,
      label: t("Technical availability"),
      description: t("Advanced system control"),
      icon: Boxes,
    },
  ];

  return (
    <div className="space-y-5">
      <IndiceTitleBar
        tone="aqua"
        icon={<Boxes className="h-5 w-5" />}
        title={t("Catalog and modules")}
        subtitle={
          t("Decide what Indice offers, group it into products and define the amount customers will pay.")
        }
        actions={
          <button
            type="button"
            disabled={syncing}
            onClick={() => void synchronizeComplementaries()}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#59C3A5]/35 bg-white px-4 text-sm font-medium text-[#176B5B] shadow-sm transition hover:bg-[#59C3A5]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/25 disabled:opacity-60 dark:bg-slate-900 dark:text-[#8FE0CA]"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {t("Sync add-ons")}
          </button>
        }
      />

      {syncFeedback ? (
        <div role={syncFeedback.type === "success" ? "status" : "alert"} className={`rounded-xl border px-4 py-3 text-sm font-medium ${syncFeedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {syncFeedback.message}
        </div>
      ) : null}

      <IndiceWorkspaceNavigation<CatalogWorkspaceView>
        ariaLabel={t("Catalog workflow")}
        items={workspaceTabs.map((item) => {
          const Icon = item.icon;
          return {
            id: item.id,
            label: item.label,
            description: item.description,
            icon: <Icon />,
          };
        })}
        onValueChange={setView}
        tone="aqua"
        value={view}
        variant="sections"
      />

      <section className="overflow-hidden rounded-2xl border border-[#59C3A5]/30 bg-white shadow-sm dark:border-[#59C3A5]/25 dark:bg-slate-900">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${draftVersion ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
              {draftVersion ? (
                <FileClock className="h-5 w-5" />
              ) : (
                <BadgeCheck className="h-5 w-5" />
              )}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-medium text-slate-950 dark:text-white">
                  {draftVersion
                    ? t("You have unpublished changes")
                    : t("Active offer")}
                </h2>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                  {stripeEnvironmentLabel(catalog?.stripe_environment?.mode, locale)}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {draftVersion
                  ? t("Customers will keep seeing the current offer until you publish these changes.")
                  : t("Customers and Billing use this offer.")}
              </p>
            </div>
          </div>
          {!draftVersion ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!canManage || catalogWorkflowBusy}
                onClick={() => void prepareCatalogDraft()}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white transition hover:bg-[#126553] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/30 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {t("Prepare changes")}
              </button>
            </div>
          ) : null}
        </div>
        {catalogValidation && !catalogValidation.ready ? (
          <div className="border-t border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-xs font-semibold text-amber-900">
              {t("Complete before publishing:")}
            </p>
            <ul className="mt-2 grid gap-1 text-xs text-amber-800 md:grid-cols-2">
              {catalogValidation.blockers.map((blocker, index) => (
                <li key={`${blocker.code}-${blocker.product_code}-${index}`} className="flex gap-2">
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{catalogValidationMessage(blocker, locale)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {view === "modules" ? (
        <ModuleAvailabilityWorkspace
          canManage={canManage}
          data={modules}
          english={english}
          products={versionProducts}
          saving={saving}
          onChange={onModuleChange}
        />
      ) : (
        <CommercialOfferWorkspace
          canManage={canManage}
          catalog={catalog}
          modules={modules?.modules ?? []}
          onChange={(nextCatalog) => {
            setCatalogValidation(null);
            onCatalogChange(nextCatalog);
          }}
        />
      )}

      {draftVersion ? (
        <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-[#59C3A5]/40 bg-white/95 p-4 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.5)] backdrop-blur dark:bg-slate-900/95 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-950">
              {t("Unpublished changes")}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {!canPublish
                ? t("Only Platform Root can publish the offer.")
                : !publicationAvailable
                ? t("Prices can be saved as drafts. Publishing is unavailable until Stripe catalog synchronization is enabled.")
                : t("Publishing synchronizes and verifies saved prices with Stripe.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canManage || catalogWorkflowBusy}
              onClick={() => void validateCatalogDraft()}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#59C3A5]/40 bg-white px-4 text-sm font-medium text-[#176B5B] transition hover:bg-[#59C3A5]/10 disabled:opacity-50 dark:bg-slate-900 dark:text-[#8FE0CA]"
            >
              <ShieldCheck className="h-4 w-4" />
              {t("Validate offer")}
            </button>
            <button
              type="button"
              disabled={!canPublish || catalogWorkflowBusy || !publicationAvailable}
              onClick={() => {
                setPublishError(null);
                setPublishDialogOpen(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white hover:bg-[#126653] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              <BadgeCheck className="h-4 w-4" />
              {t("Sync and publish offer")}
            </button>
          </div>
        </div>
      ) : null}
      {draftVersion && publicationMode ? (
        <CatalogPublishDialog
          open={publishDialogOpen}
          busy={catalogWorkflowBusy}
          english={english}
          mode={publicationMode}
          versionCode={draftVersion.version_code}
          error={publishError}
          onCancel={() => {
            if (!catalogWorkflowBusy) setPublishDialogOpen(false);
          }}
          onConfirm={(confirmation) => void publishCatalogDraft(confirmation)}
        />
      ) : null}
    </div>
  );
}

function CatalogTab({
  canManage,
  english,
  data,
  modules,
  onChange,
  productSummary,
  view,
}: {
  canManage: boolean;
  english: boolean;
  data: PlatformCatalog | null;
  modules: PlatformModule[];
  onChange: (data: PlatformCatalog) => void;
  productSummary: {
    activeProducts: number;
    linkedCapabilities: number;
    productsWithoutRates: number;
  };
  view: CatalogView;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  const [editing, setEditing] = useState<CatalogEditTarget | null>(null);
  const [priceSort, setPriceSort] = useState<{
    key: CatalogPriceSortKey;
    direction: SortDirection;
  }>({ key: "concept", direction: "asc" });
  const [priceQuery, setPriceQuery] = useState("");
  const [priceTypeFilter, setPriceTypeFilter] = useState("all");
  const [priceStatusFilter, setPriceStatusFilter] = useState("all");
  const [pricePage, setPricePage] = useState(1);
  const [pricePageSize, setPricePageSize] = useState(10);
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [catalogFeedback, setCatalogFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const workingVersion =
    data?.versions.find((version) => version.status === "DRAFT") ||
    data?.versions.find((version) => version.status === "ACTIVE") ||
    data?.versions[0];
  const versionPrices = useMemo(
    () =>
      (data?.prices ?? []).filter(
        (price) =>
          !workingVersion || price.catalog_version_id === workingVersion.id,
      ),
    [workingVersion, data?.prices],
  );
  const products = useMemo(
    () =>
      (data?.products ?? []).filter(
        (product) =>
          !workingVersion || product.catalog_version_id === workingVersion.id,
      ),
    [data?.products, workingVersion],
  );
  const priceGroups = useMemo(
    () => buildCatalogPriceGroups(versionPrices, products, locale),
    [products, versionPrices],
  );
  const priceStatusCounts = useMemo(
    () => ({
      all: priceGroups.length,
      inactive: priceGroups.filter((group) => group.status === "inactive").length,
      ready: priceGroups.filter((group) => group.status === "ready").length,
      review: priceGroups.filter((group) => group.status === "review").length,
    }),
    [priceGroups],
  );
  const filteredPriceGroups = useMemo(() => {
    const query = priceQuery.trim().toLowerCase();
    return priceGroups.filter((group) => {
      const matchesQuery =
        !query ||
        [group.name, group.priceType, group.currency].some((value) =>
          value.toLowerCase().includes(query),
        );
      return (
        matchesQuery &&
        (priceTypeFilter === "all" || group.priceType === priceTypeFilter) &&
        (priceStatusFilter === "all" || group.status === priceStatusFilter)
      );
    });
  }, [
    priceGroups,
    priceQuery,
    priceStatusFilter,
    priceTypeFilter,
  ]);
  const prices = useMemo(() => {
    if (!priceSort.direction) return filteredPriceGroups;
    const direction = priceSort.direction === "asc" ? 1 : -1;
    return [...filteredPriceGroups].sort(
      (left, right) =>
        compareCatalogPriceGroupValues(left, right, priceSort.key) * direction,
    );
  }, [filteredPriceGroups, priceSort]);
  const priceTotalPages = Math.max(1, Math.ceil(prices.length / pricePageSize));
  const pagedPrices = prices.slice(
    (pricePage - 1) * pricePageSize,
    pricePage * pricePageSize,
  );
  useEffect(() => {
    setPricePage(1);
  }, [priceQuery, priceStatusFilter, priceTypeFilter]);
  useEffect(() => {
    if (pricePage > priceTotalPages) setPricePage(priceTotalPages);
  }, [pricePage, priceTotalPages]);
  const priceColumnLabels = useMemo<Record<CatalogPriceSortKey, string>>(
    () => ({
      concept: t("Item"),
      monthly: t("Monthly"),
      status: t("Sales status"),
      type: t("Type"),
      yearly: t("Annual"),
    }),
    [t],
  );
  const { columnWidths: priceColumnWidths, resizeColumn: resizePriceColumn } =
    usePersistentColumnWidths<CatalogPriceSortKey>({
      defaults: catalogPriceColumnDefaults,
      headerLabels: priceColumnLabels,
      maxWidths: catalogPriceColumnMaximums,
      minWidths: catalogPriceColumnMinimums,
      sortableColumnIds: catalogPriceColumnIds,
      storageKey: "indice-platform-admin-catalog-price-widths-v1",
    });
  const priceTableColumns = useMemo<
    Array<IndiceTableColumnDefinition<CatalogPriceSortKey>>
  >(
    () =>
      catalogPriceColumnIds.map((columnId) => ({
        id: columnId,
        label: priceColumnLabels[columnId],
        width: priceColumnWidths[columnId],
        defaultWidth: catalogPriceColumnDefaults[columnId],
        contentMinimumWidth: catalogPriceColumnMinimums[columnId],
        maxWidth: catalogPriceColumnMaximums[columnId],
        sortable: true,
        resizeLabel: t("Resize {p0} column", { p0: priceColumnLabels[columnId] }),
      })),
    [t, priceColumnLabels, priceColumnWidths],
  );
  const priceTableMinimumWidth = getIndiceTableMinimumWidth({
    actionsWidth: catalogPriceActionsWidth,
    columns: priceTableColumns,
  });
  const changePriceSort = (key: CatalogPriceSortKey) =>
    setPriceSort((current) =>
      current.key !== key
        ? { key, direction: "asc" }
        : {
            key,
            direction:
              current.direction === null
                ? "asc"
                : current.direction === "asc"
                  ? "desc"
                  : null,
          },
    );
  const refreshCatalog = async () => {
    const nextCatalog = await platformAdminApi.getCatalog();
    onChange(nextCatalog);
  };
  const saveEdit = async (target: CatalogEditTarget) => {
    if (!data || catalogSaving) return;
    setCatalogSaving(true);
    setCatalogFeedback(null);
    try {
      if (target.kind === "product") {
        const payload = {
          display_name: target.value.display_name,
          sort_order: target.value.sort_order,
          active: target.value.active,
          capabilities: target.value.capabilities,
        };
        if (target.value.id > 0) await platformAdminApi.updateCatalogProduct(target.value.id, payload);
        else await platformAdminApi.createCatalogProduct(payload);
      } else {
        await platformAdminApi.updateCatalogPrice(target.value.id, {
          unit_amount_cents: target.value.unit_amount_cents ?? null,
          external_price_id: target.value.external_price_id?.trim() || null,
          status: target.value.status,
        });
      }
      await refreshCatalog();
      setEditing(null);
      setCatalogFeedback({
        type: "success",
        message: t("The change was saved in the working version. Validate and publish it when the offer is complete."),
      });
    } catch (saveError) {
      setCatalogFeedback({
        type: "error",
        message:
          t("The catalog could not be updated."),
      });
    } finally {
      setCatalogSaving(false);
    }
  };
  return (
    <div className="space-y-5">
      {catalogFeedback ? (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${catalogFeedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {catalogFeedback.message}
        </div>
      ) : null}
      {view === "products" ? (
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-medium text-slate-950 dark:text-white">
                {t("Products customers can select")}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t("Review packages and add-ons, and complete any product still missing a price.")}
              </p>
            </div>
            <button
              type="button"
              disabled={!canManage || !workingVersion}
              onClick={() => workingVersion && setEditing({ kind: "product", value: {
                id: 0,
                catalog_version_id: workingVersion.id,
                version_code: workingVersion.version_code,
                product_code: "",
                display_name: "",
                product_type: "ADDON",
                sort_order: 500,
                active: false,
                capabilities: [],
              } })}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white transition hover:bg-[#126553] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/30 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {t("New package")}
            </button>
          </div>
          <section
            aria-label={t("Product indicators")}
            className="mb-4 grid gap-3 md:grid-cols-3"
          >
            <Metric
              icon={PackageCheck}
              label={t("Active products")}
              value={String(productSummary.activeProducts)}
              accent="mint"
            />
            <Metric
              icon={CircleAlert}
              label={t("Products missing prices")}
              value={String(productSummary.productsWithoutRates)}
              accent="gold"
            />
            <Metric
              icon={Boxes}
              label={t("Linked capabilities")}
              value={String(productSummary.linkedCapabilities)}
              accent="blue"
            />
          </section>
          {products.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const productPrices = versionPrices.filter(
                  (price) =>
                    price.billable_code === product.product_code ||
                    product.capabilities.includes(price.billable_code),
                );
                const connectedIntervals = new Set(
                  productPrices
                    .filter(
                      (price) =>
                        price.unit_amount_cents != null &&
                        Boolean(price.external_price_id) &&
                        !["ARCHIVED", "INACTIVE"].includes(price.status),
                    )
                    .map((price) => price.billing_interval),
                );
                return (
                  <CatalogProductCard
                    key={product.id}
                    english={english}
                    product={product}
                    priceCount={productPrices.length}
                    readyForSale={
                      connectedIntervals.has("MONTH") &&
                      connectedIntervals.has("YEAR")
                    }
                    onEdit={() =>
                      setEditing({ kind: "product", value: product })
                    }
                  />
                );
              })}
            </div>
          ) : (
            <Panel
              title={t("Products and packages")}
            >
              <EmptyRow
                icon={PackageCheck}
                text={
                  t("No products in this version.")
                }
              />
            </Panel>
          )}
        </section>
      ) : (
        <div className="space-y-4">
          <IndiceFilterBar
            title={
              t("Filters")
            }
            subtitle={
              t("Find a product and focus on what is ready to sell.")
            }
            summary={
              t("{p0} matching products", { p0: prices.length })
            }
            gridClassName="md:grid-cols-3"
          >
            <IndiceFilterSearch
              label={t("Search")}
              placeholder={
                t("Product or offer")
              }
              tone="aqua"
              value={priceQuery}
              onValueChange={setPriceQuery}
              onClear={() => setPriceQuery("")}
            />
            <IndiceFilterSelect
              label={t("Type")}
              tone="aqua"
              value={priceTypeFilter}
              onValueChange={setPriceTypeFilter}
              options={[
                {
                  value: "all",
                  label: t("All types"),
                },
                ...Array.from(
                  new Set(versionPrices.map((price) => price.price_type)),
                ).map((value) => ({
                  value,
                  label: catalogPriceTypeLabel(value, locale),
                })),
              ]}
            />
            <IndiceFilterSelect
              label={t("Sales status")}
              tone="aqua"
              value={priceStatusFilter}
              onValueChange={setPriceStatusFilter}
              options={[
                {
                  value: "all",
                  label: t("All"),
                },
                {
                  value: "ready",
                  label: t("Ready to sell"),
                },
                {
                  value: "review",
                  label: t("Require attention"),
                },
                {
                  value: "inactive",
                  label: t("Inactive"),
                },
              ]}
            />
          </IndiceFilterBar>
          <section
            aria-label={t("Commercial price status")}
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <CatalogStatusMetric
              active={priceStatusFilter === "all"}
              icon={CircleDollarSign}
              label={t("Commercial products")}
              value={priceStatusCounts.all}
              tone="aqua"
              onClick={() => setPriceStatusFilter("all")}
            />
            <CatalogStatusMetric
              active={priceStatusFilter === "review"}
              icon={CircleAlert}
              label={t("Require attention")}
              value={priceStatusCounts.review}
              tone="warning"
              onClick={() => setPriceStatusFilter("review")}
            />
            <CatalogStatusMetric
              active={priceStatusFilter === "ready"}
              icon={BadgeCheck}
              label={t("Ready to sell")}
              value={priceStatusCounts.ready}
              tone="success"
              onClick={() => setPriceStatusFilter("ready")}
            />
            <CatalogStatusMetric
              active={priceStatusFilter === "inactive"}
              icon={Activity}
              label={t("Inactive")}
              value={priceStatusCounts.inactive}
              tone="neutral"
              onClick={() => setPriceStatusFilter("inactive")}
            />
          </section>
          <IndiceTableShell
            pagination={prices.length ? (
              <DataTablePagination
                currentPage={pricePage}
                totalPages={priceTotalPages}
                pageSize={pricePageSize}
                pageSizeOptions={[10, 25, 50, 100, 200]}
                totalCount={prices.length}
                pageStart={(pricePage - 1) * pricePageSize + 1}
                pageEnd={Math.min(pricePage * pricePageSize, prices.length)}
                itemLabel={t("products")}
                onPageChange={setPricePage}
                onPageSizeChange={(nextSize) => {
                  setPricePageSize(nextSize);
                  setPricePage(1);
                }}
              />
            ) : undefined}
          >
            <IndiceOperationalTable minimumWidth={priceTableMinimumWidth}>
              <IndiceTableColGroup
                columns={priceTableColumns}
                actionsWidth={catalogPriceActionsWidth}
              />
              <IndiceTableHeaderRow
                actions={{
                  label: t("Actions"),
                  width: catalogPriceActionsWidth,
                }}
                columns={priceTableColumns}
                onResize={resizePriceColumn}
                onSort={changePriceSort}
                sortState={priceSort.direction ? {
                  columnId: priceSort.key,
                  direction: priceSort.direction,
                } : null}
                tone="blue"
              />
              <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pagedPrices.map((group) => (
                  <CatalogPriceGroupRow
                    key={group.key}
                    group={group}
                    english={english}
                    onEdit={(price) =>
                      setEditing({ kind: "price", value: price })
                    }
                  />
                ))}
                {!pagedPrices.length ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyRow
                        icon={CircleDollarSign}
                        text={
                          t("No products match the selected filters.")
                        }
                      />
                    </td>
                  </tr>
                ) : null}
              </TableBody>
            </IndiceOperationalTable>
          </IndiceTableShell>
        </div>
      )}
      <div className="rounded-2xl border border-[#59C3A5]/30 bg-[#59C3A5]/10 px-4 py-3 text-sm text-[#176B5B] dark:text-[#8FE0CA]">
        {t("Price changes apply to new sales. Existing customers and previous invoices keep the conditions already agreed.")}
      </div>
      {editing ? (
        <CatalogEditModal
          english={english}
          modules={modules}
          target={editing}
          onCancel={() => setEditing(null)}
          onSave={saveEdit}
          saving={catalogSaving}
          error={
            catalogFeedback?.type === "error"
              ? catalogFeedback.message
              : null
          }
        />
      ) : null}
    </div>
  );
}

function CatalogStatusMetric({
  active,
  icon: Icon,
  label,
  onClick,
  tone,
  value,
}: {
  active: boolean;
  icon: typeof Users;
  label: string;
  onClick: () => void;
  tone: "aqua" | "neutral" | "success" | "warning";
  value: number;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  const toneClasses = {
    aqua: "bg-[#59C3A5]/15 text-[#177D66] dark:text-[#8FE0CA]",
    neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
    warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  };
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-24 items-center gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-[#59C3A5]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/30 dark:bg-slate-900 ${
        active
          ? "border-[#59C3A5] ring-2 ring-[#59C3A5]/15"
          : "border-slate-200 dark:border-slate-700"
      }`}
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${toneClasses[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span className="mt-1 block text-2xl font-medium text-slate-950 dark:text-white">
          {value}
        </span>
      </span>
    </button>
  );
}

function CatalogPriceGroupRow({
  group,
  english,
  onEdit,
}: {
  group: CatalogPriceGroup;
  english: boolean;
  onEdit: (price: PlatformCatalogPrice) => void;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  return (
    <TableRow className="border-slate-100 hover:bg-[#59C3A5]/5 dark:border-slate-800 dark:hover:bg-[#59C3A5]/10">
      <TableCell className={`${tableCellClass} h-[72px] dark:text-slate-300`}>
        <p className="font-medium text-slate-900 dark:text-white">
          {group.name}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{group.currency}</p>
      </TableCell>
      <TableCell className={`${tableCellClass} h-[72px] dark:text-slate-300`}>
        {catalogPriceTypeLabel(group.priceType, locale)}
      </TableCell>
      <CatalogPriceVariantCell price={group.monthly} english={english} />
      <CatalogPriceVariantCell price={group.yearly} english={english} />
      <TableCell className={`${tableCellClass} h-[72px] dark:text-slate-300`}>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${group.status === "inactive" ? "bg-slate-200 text-slate-600" : group.status === "ready" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}
        >
          {group.status === "inactive"
            ? t("Inactive")
            : group.status === "ready"
              ? t("Ready to sell")
              : t("Needs review")}
        </span>
      </TableCell>
      <TableCell className={`${tableCellClass} h-[72px] text-right dark:text-slate-300`}>
        <IndiceTableActionGroup>
          {group.monthly ? (
            <button
              type="button"
              onClick={() => onEdit(group.monthly!)}
              aria-label={t("Edit monthly price")}
              title={t("Edit monthly price")}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#59C3A5]/40 bg-white px-2.5 text-xs font-medium text-[#176B5B] transition hover:bg-[#59C3A5]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/25 dark:bg-slate-900 dark:text-[#8FE0CA]"
            >
              <PencilLine className="h-3.5 w-3.5" />
              {t("Monthly")}
            </button>
          ) : null}
          {group.yearly ? (
            <button
              type="button"
              onClick={() => onEdit(group.yearly!)}
              aria-label={t("Edit annual price")}
              title={t("Edit annual price")}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#59C3A5]/40 bg-white px-2.5 text-xs font-medium text-[#176B5B] transition hover:bg-[#59C3A5]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/25 dark:bg-slate-900 dark:text-[#8FE0CA]"
            >
              <PencilLine className="h-3.5 w-3.5" />
              {t("Annual")}
            </button>
          ) : null}
        </IndiceTableActionGroup>
      </TableCell>
    </TableRow>
  );
}

function CatalogPriceVariantCell({
  price,
  english,
}: {
  price?: PlatformCatalogPrice;
  english: boolean;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  if (!price) {
    return (
      <TableCell className={`${tableCellClass} h-[72px] dark:text-slate-300`}>
        <span className="text-sm text-slate-400">
          {t("Not configured")}
        </span>
      </TableCell>
    );
  }
  const inactive = isInactiveCatalogPrice(price);
  const ready = isReadyCatalogPrice(price);
  return (
    <TableCell className={`${tableCellClass} h-[72px] dark:text-slate-300`}>
      <p className="font-medium text-slate-900 dark:text-white">
        {formatMoney(price.unit_amount_cents, price.currency, locale)}
      </p>
      <p
        className={`mt-0.5 text-[11px] font-medium ${inactive ? "text-slate-400" : ready ? "text-emerald-700" : "text-amber-700"}`}
      >
        {inactive
          ? t("Inactive")
          : ready
            ? t("Ready")
            : price.unit_amount_cents == null
              ? t("Missing amount")
              : t("Billing connection pending")}
      </p>
    </TableCell>
  );
}

function compareCatalogPriceGroupValues(
  left: CatalogPriceGroup,
  right: CatalogPriceGroup,
  key: CatalogPriceSortKey,
) {
  const text = (a: string | null | undefined, b: string | null | undefined) =>
    (a || "").localeCompare(b || "", undefined, {
      numeric: true,
      sensitivity: "base",
    });
  switch (key) {
    case "concept":
      return text(left.name, right.name) || text(left.currency, right.currency);
    case "type":
      return text(left.priceType, right.priceType);
    case "monthly":
      return (
        (left.monthly?.unit_amount_cents ?? -1) -
        (right.monthly?.unit_amount_cents ?? -1)
      );
    case "yearly":
      return (
        (left.yearly?.unit_amount_cents ?? -1) -
        (right.yearly?.unit_amount_cents ?? -1)
      );
    case "status":
      return text(left.status, right.status);
  }
}

function CatalogEditModal({
  english,
  modules,
  target,
  saving,
  error,
  onCancel,
  onSave,
}: {
  english: boolean;
  modules: PlatformModule[];
  target: CatalogEditTarget;
  saving: boolean;
  error?: string | null;
  onCancel: () => void;
  onSave: (target: CatalogEditTarget) => Promise<void>;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  const [draft, setDraft] = useState<CatalogEditTarget>(target);
  const product = draft.kind === "product" ? draft.value : null;
  const price = draft.kind === "price" ? draft.value : null;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void onSave(draft);
  };
  return (
    <IndiceModalFrame
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      modalType="standard-form"
      tone="aqua"
      icon={<PencilLine className="h-5 w-5" />}
      eyebrow={t("Commercial catalog")}
      title={
        product
          ? product.id <= 0
            ? t("Create package")
            : t("Configure product")
          : t("Configure price")
      }
      description={
        t("The saved information becomes available to customer configuration flows.")
      }
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="h-11 rounded-xl border border-white/40 bg-white px-4 text-sm font-medium text-slate-700"
          >
            {t("Cancel")}
          </button>
          <button
            type="submit"
            disabled={saving}
            form="catalog-edit-form"
            className="h-11 rounded-xl bg-white px-5 text-sm font-medium text-[#177D66] shadow-sm transition hover:bg-[#59C3A5]/10 disabled:cursor-wait disabled:bg-white/45 disabled:text-white/80"
          >
            {saving
              ? t("Saving…")
              : t("Save changes")}
          </button>
        </div>
      }
    >
      <form id="catalog-edit-form" onSubmit={submit} className="space-y-5">
        {error ? (
          <div
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
          >
            {error}
          </div>
        ) : null}
        <div className="rounded-2xl border border-[#59C3A5]/30 bg-[#59C3A5]/10 px-4 py-3 text-sm text-[#176B5B] dark:text-[#8FE0CA]">
          {product
            ? t("Mark the product as available now. Missing prices or Stripe links will be checked before the offer is published.")
            : t("A price is ready to bill when it has an amount and is connected to its Stripe price.")}
        </div>
        {product ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Display name")}>
              <input
                required
                value={product.display_name}
                onChange={(event) =>
                  setDraft({
                    kind: "product",
                    value: { ...product, display_name: event.target.value },
                  })
                }
                className={controlClass}
              />
            </Field>
            <Field label={t("Display order")}>
              <input
                type="number"
                min={0}
                value={product.sort_order}
                onChange={(event) =>
                  setDraft({
                    kind: "product",
                    value: {
                      ...product,
                      sort_order: Number(event.target.value),
                    },
                  })
                }
                className={controlClass}
              />
            </Field>
            <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm font-semibold text-slate-800">
                {t("Included modules")}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {t("These are the modules customers receive when selecting this product.")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {modules.filter((module) => module.assignment_enabled).map((module) => {
                  const selected = product.capabilities.includes(module.slug);
                  return (
                    <label key={module.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${selected ? "border-[#59C3A5] bg-[#59C3A5]/10 text-[#176B5B]" : "border-slate-200 bg-white text-slate-700"}`}>
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={!module.is_active && !selected}
                        onChange={(event) => setDraft({
                          kind: "product",
                          value: {
                            ...product,
                            capabilities: event.target.checked
                              ? [...product.capabilities, module.slug]
                              : product.capabilities.filter((capability) => capability !== module.slug),
                          },
                        })}
                      />
                      {module.name}
                    </label>
                  );
                })}
                {!modules.some((module) => module.assignment_enabled) ? (
                  <span className="text-xs text-slate-500">{t("No assignable modules available.")}</span>
                ) : null}
              </div>
            </div>
            <label className="sm:col-span-2 flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={product.active}
                onChange={(event) =>
                  setDraft({
                    kind: "product",
                    value: { ...product, active: event.target.checked },
                  })
                }
              />
              {t("Available for customers")}
            </label>
          </div>
        ) : price ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">{t("Product")}</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {offerLabels(locale)[price.billable_code] || price.billable_code}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{t("Type")}</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {price.price_type === "ADDON"
                    ? t("Add-on")
                    : t("Package")}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{t("Frequency")}</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {price.billing_interval === "YEAR"
                    ? t("Annual")
                    : t("Monthly")}
                </p>
              </div>
            </div>
            <Field label={`${t("Amount")} (${price.currency})`}>
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={(price.unit_amount_cents ?? 0) / 100}
                onChange={(event) =>
                  setDraft({
                    kind: "price",
                    value: {
                      ...price,
                      unit_amount_cents: Math.round(
                        Number(event.target.value) * 100,
                      ),
                    },
                  })
                }
                className={controlClass}
              />
            </Field>
            <Field label={t("Billing readiness")}>
              <select
                value={price.status}
                onChange={(event) =>
                  setDraft({
                    kind: "price",
                    value: { ...price, status: event.target.value },
                  })
                }
                className={controlClass}
              >
                <option value="ACTIVE">{t("Available to bill")}</option>
                <option value="READY">{t("Ready for review")}</option>
                <option value="DRAFT">{t("Draft")}</option>
                <option value="ARCHIVED">{t("Inactive")}</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label={t("Stripe billing reference")}>
                <input
                  value={price.external_price_id || ""}
                  onChange={(event) =>
                    setDraft({
                      kind: "price",
                      value: {
                        ...price,
                        external_price_id: event.target.value || null,
                      },
                    })
                  }
                  className={controlClass}
                  placeholder="price_..."
                />
              </Field>
              <p className="mt-1.5 text-xs text-slate-500">
                {t("Paste the Price ID created in Stripe to enable automatic billing.")}
              </p>
            </div>
          </div>
        ) : null}
      </form>
    </IndiceModalFrame>
  );
}

function ModulesTab({
  english,
  data,
  canManage,
  saving,
  onChange,
  embedded = false,
}: {
  english: boolean;
  data: PlatformModules | null;
  canManage: boolean;
  saving: boolean;
  onChange: (change: ModuleAvailabilityChange) => void;
  embedded?: boolean;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  const [workOrderOpen, setWorkOrderOpen] = useState(false);
  const { create, error: workOrderError, loading: workOrdersLoading, remove, workOrders } = useModuleWorkOrders();
  const workOrderCopy = useModuleWorkOrderCopy();
  const grouped = ["basic", "complementary", "ai"].map((category) => ({
    category,
    modules: (data?.modules ?? []).filter(
      (module) => module.category === category,
    ),
  }));
  return (
    <div className="space-y-5">
      {embedded ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {t("Available modules")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t("Choose which Indice functions can be included in products, trials and customer accounts.")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#e8f5f2] px-3 py-1.5 text-xs font-medium text-[#177D66]">
              <Activity className="h-4 w-4" />
              {(data?.modules ?? []).filter((module) => module.is_active).length} {t("active")}
            </span>
            {canManage ? (
              <button
                type="button"
                onClick={() => setWorkOrderOpen(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#1D4ED8]"
              >
                <Plus className="h-4 w-4" />
                {workOrderCopy.add}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <IndiceTitleBar
          tone="blue"
          icon={<Boxes className="h-5 w-5" />}
          eyebrow={t("Commercial availability")}
          title={t("Indice modules")}
          subtitle={
            t("Enable the functions that may be offered to customers and safely remove those no longer available.")
          }
        />
      )}
      {!canManage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("You can review availability, but you do not have permission to change the commercial offer.")}
        </div>
      ) : null}
      {workOrderError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {workOrderError}
        </div>
      ) : null}
      {workOrdersLoading ? (
        <p className="text-sm text-slate-500">{t("Loading module requests…")}</p>
      ) : null}
      {workOrders.length ? (
        <Panel
          title={workOrderCopy.sectionTitle}
          description={workOrderCopy.sectionDescription}
        >
          <div className="divide-y divide-slate-100 px-4">
            {workOrders.map((order) => (
              <article
                key={order.id}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-lg dark:border-blue-900 dark:bg-blue-950/20">
                    🧩
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                        {order.moduleName}
                      </h3>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        {workOrderCopy.draft}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {t("Initial language")}: {operationalLocaleLabels[order.sourceLocale] || order.sourceLocale}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => void remove(order.id)}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    {workOrderCopy.remove}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      ) : null}
      {grouped.map((group) => (
        <ModuleGroup
          key={group.category}
          category={group.category}
          modules={group.modules}
          canManage={canManage}
          saving={saving}
          onChange={onChange}
          english={english}
        />
      ))}
      {workOrderOpen ? (
        <ModuleWorkOrderModal
          english={english}
          onClose={() => setWorkOrderOpen(false)}
          onCreate={async (input) => {
            await create(input);
            setWorkOrderOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function ModuleGroup({
  category,
  modules,
  canManage,
  saving,
  onChange,
  english,
}: {
  category: string;
  modules: PlatformModule[];
  canManage: boolean;
  saving: boolean;
  onChange: (change: ModuleAvailabilityChange) => void;
  english: boolean;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  const labels: Record<string, string> = {
    basic: t("Base modules"),
    complementary: t("Add-on modules"),
    ai: t("Artificial intelligence"),
  };
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-medium text-slate-900 dark:text-white">
            {labels[category] || category}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {modules.length} {t("registered modules")}
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {modules.map((module) => {
          const protectedCore = module.is_core;
          const visual = moduleVisual(module);
          const moduleDescription =
            module.description || t("Operational description pending.");
          return (
            <article
              key={module.id}
              className={`group relative flex min-h-[214px] flex-col overflow-hidden rounded-2xl border bg-white p-4 shadow-[0_14px_32px_-30px_rgba(15,23,42,0.7)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_42px_-30px_rgba(15,23,42,0.5)] dark:bg-slate-900 ${module.is_active ? visual.border : "border-slate-200 dark:border-slate-700"}`}
            >
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-br ${visual.gradient} opacity-60`}
                aria-hidden="true"
              />
              <div className="relative flex items-start justify-between gap-3">
                <span
                  className={`grid h-10 w-10 place-items-center rounded-xl border bg-white text-lg shadow-sm transition group-hover:scale-105 dark:bg-slate-900 ${visual.border} ${module.is_active ? "" : "grayscale opacity-70"}`}
                  aria-hidden="true"
                >
                  {visual.emoji}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${module.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                  {module.is_active
                    ? t("Available")
                    : t("Unavailable")}
                </span>
              </div>
              <div className="relative mt-3 flex-1">
                <h3 className="truncate text-base font-semibold text-slate-950 dark:text-white" title={module.name}>
                  {module.name}
                </h3>
                <p
                  className="mt-1 truncate text-xs leading-5 text-slate-500 dark:text-slate-400"
                  title={moduleDescription}
                >
                  {moduleDescription}
                </p>
                <div className="mt-2 flex min-h-6 flex-wrap gap-1">
                  <MiniTag>
                    {module.assignment_enabled
                      ? t("Customer assignable")
                      : t("Internal use")}
                  </MiniTag>
                  {module.is_core ? <MiniTag>{t("Indice essential")}</MiniTag> : null}
                </div>
              </div>
              <div className="relative mt-2 flex items-center justify-between gap-2 border-t border-slate-200/70 pt-2 text-xs dark:border-slate-700">
                <span className="min-w-0 truncate text-slate-500">
                  {module.is_active
                    ? t("Visible in products and accounts")
                    : t("Hidden from new selections")}
                </span>
              </div>
              <button
                type="button"
                disabled={!canManage || saving || protectedCore}
                title={
                  protectedCore
                    ? t("The Indice essentials are required and cannot be removed.")
                    : undefined
                }
                onClick={() => onChange({ module, active: !module.is_active })}
                className={`relative mt-2 h-9 w-full rounded-lg border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${protectedCore ? "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800" : module.is_active ? "border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-900 dark:bg-slate-900" : "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"}`}
              >
                {protectedCore
                  ? t("Required")
                  : module.is_active
                    ? t("Remove from offer")
                    : t("Enable for offer")}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CourtesyTab({
  context,
  catalog,
  value,
  createdCode,
  feedback,
  saving,
  onChange,
  onSubmit,
  onRevoke,
}: {
  context: PlatformAdminContext | null;
  catalog: CourtesyCodeCatalog | null;
  value: CourtesyCodePayload;
  createdCode: string;
  feedback: { kind: "success" | "error"; message: string } | null;
  saving: boolean;
  onChange: (value: CourtesyCodePayload) => void;
  onSubmit: (event: FormEvent) => void;
  onRevoke: (reference: string) => void;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  const [view, setView] = useState<"create" | "history">("create");
  const presetReason = accessReasonOptions.includes(
    value.reason as (typeof accessReasonOptions)[number],
  );
  const reasonSelection = presetReason
    ? value.reason
    : value.reason
      ? "OTHER"
      : "";
  if (!context?.can_manage_benefits) return <PermissionState />;
  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setView("create")}
          className={`h-10 rounded-lg px-4 text-sm font-semibold ${view === "create" ? "bg-[#2563EB] text-white" : "text-slate-600"}`}
        >
          {t("New access")}</button>
        <button
          type="button"
          onClick={() => setView("history")}
          className={`h-10 rounded-lg px-4 text-sm font-semibold ${view === "history" ? "bg-[#2563EB] text-white" : "text-slate-600"}`}
        >
          {t("Issued codes (")}{catalog?.codes.length ?? 0})
        </button>
      </div>
      {feedback ? (
        <IndiceModalValidation
          messages={[feedback.message]}
          tone={feedback.kind}
          title={
            feedback.kind === "success"
              ? t("Access generated")
              : t("Could not generate access")
          }
        />
      ) : null}
      <section className="grid gap-5">
        {view === "create" ? (
          <Panel
            title={t("New promotional access")}
            description={t("The plain code is shown only once after generation.")}
          >
            <form onSubmit={onSubmit} className="space-y-4 p-5">
              {createdCode ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-medium text-emerald-800">
                    {t("Code generated. Copy it now.")}</p>
                  <div className="mt-2 flex gap-2">
                    <code className="min-w-0 flex-1 overflow-x-auto rounded-xl bg-white px-3 py-2 text-sm">
                      {createdCode}
                    </code>
                    <button
                      type="button"
                      onClick={() =>
                        void navigator.clipboard.writeText(createdCode)
                      }
                      className="rounded-xl bg-[#177D66] px-3 text-sm font-medium text-white"
                    >
                      {t("Copy")}</button>
                  </div>
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("Internal name")}>
                  <input
                    required
                    value={value.label}
                    onChange={(event) =>
                      onChange({ ...value, label: event.target.value })
                    }
                    className={controlClass}
                    placeholder={t("Pilot customer")}
                  />
                </Field>
                <Field label={t("Authorized email")}>
                  <input
                    type="email"
                    value={value.allowed_email || ""}
                    onChange={(event) =>
                      onChange({ ...value, allowed_email: event.target.value })
                    }
                    className={controlClass}
                    placeholder={t("Optional, recommended")}
                  />
                </Field>
              </div>
              <fieldset className="rounded-2xl border border-slate-200 p-4">
                <legend className="px-1 text-sm font-medium text-slate-700">
                  {t("Included modules")}</legend>
                <p className="mb-3 text-xs text-slate-500">
                  {t("No selection grants all basic modules.")}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {catalog?.products.map((product) => {
                    const checked = value.product_codes.includes(product.code);
                    return (
                      <label
                        key={product.code}
                        className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm ${checked ? "border-[#59C3A5] bg-[#f5fbf9]" : "border-slate-200"}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            onChange({
                              ...value,
                              product_codes: checked
                                ? value.product_codes.filter(
                                    (code) => code !== product.code,
                                  )
                                : [...value.product_codes, product.code],
                            })
                          }
                        />
                        {product.name}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={t("Extra users")}>
                  <select
                    value={value.included_extra_seats}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        included_extra_seats: Number(event.target.value),
                      })
                    }
                    className={controlClass}
                  >
                    {extraSeatOptions.map((quantity) => (
                      <option key={quantity} value={quantity}>
                        {quantity === 0 ? "Ninguno" : quantity}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("Maximum uses")}>
                  <select
                    value={value.max_redemptions}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        max_redemptions: Number(event.target.value),
                      })
                    }
                    className={controlClass}
                  >
                    {redemptionOptions.map((quantity) => (
                      <option key={quantity} value={quantity}>
                        {quantity}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("Access days")}>
                  <select
                    disabled={value.permanent}
                    value={value.access_days || 30}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        access_days: Number(event.target.value),
                      })
                    }
                    className={controlClass}
                  >
                    {accessDayOptions.map((days) => (
                      <option key={days} value={days}>
                        {days} {t("days")}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label={t("Access type")}>
                <select
                  value={value.permanent ? "PERMANENT" : "TIMED"}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      permanent: event.target.value === "PERMANENT",
                    })
                  }
                  className={controlClass}
                >
                  <option value="TIMED">{t("Time-limited access")}</option>
                  <option value="PERMANENT">{t("Permanent access")}</option>
                </select>
              </Field>
              <Field label={t("Auditable reason")}>
                <select
                  required
                  value={reasonSelection}
                  onChange={(event) =>
                    onChange({ ...value, reason: event.target.value })
                  }
                  className={controlClass}
                >
                  <option value="">{t("Select a reason")}</option>
                  {accessReasonOptions.map((reason) => (
                    <option key={reason} value={reason}>
                      {flowOptionLabel(reason, locale)}
                    </option>
                  ))}
                  <option value="OTHER">{t("Other reason")}</option>
                </select>
              </Field>
              {reasonSelection === "OTHER" ? (
                <Field label={t("Describe the reason")}>
                  <textarea
                    required
                    minLength={5}
                    value={value.reason === "OTHER" ? "" : value.reason}
                    onChange={(event) =>
                      onChange({ ...value, reason: event.target.value })
                    }
                    className={`${controlClass} min-h-20 resize-y py-2`}
                  />
                </Field>
              ) : null}
              <Field label={t("Campaign")}>
                <input
                  value={value.campaign_code || ""}
                  onChange={(event) =>
                    onChange({ ...value, campaign_code: event.target.value })
                  }
                  className={controlClass}
                  placeholder={t("Optional")}
                />
              </Field>
              <button
                disabled={saving}
                className="h-11 w-full rounded-xl bg-[#177D66] text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? t("Generating…") : t("Generate secure code")}
              </button>
            </form>
          </Panel>
        ) : (
          <Panel
            title={t("Issued codes")}
            description={t("Validity, redemptions and email restriction.")}
          >
            <div className="max-h-[760px] divide-y divide-slate-100 overflow-y-auto">
              {catalog?.codes.map((item) => (
                <article key={item.reference} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.label}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.allowed_email || t("No email restriction")}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {item.all_basic_products
                      ? t("All basic modules")
                      : item.product_codes.join(", ")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <MiniTag>
                      {item.redemption_count}/{item.max_redemptions} {t("uses")}</MiniTag>
                    <MiniTag>
                      {item.permanent
                        ? t("Permanent")
                        : t("{p0} days", { p0: item.access_days })}
                    </MiniTag>
                    <MiniTag>
                      {item.included_extra_seats} {t("extra users")}</MiniTag>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">{item.reason}</p>
                  {item.status === "ACTIVE" ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onRevoke(item.reference)}
                      className="mt-3 text-xs font-medium text-red-600"
                    >
                      {t("Revoke code")}</button>
                  ) : null}
                </article>
              ))}
              {!catalog?.codes.length ? (
                <EmptyRow icon={KeyRound} text={t("No codes have been issued yet.")} />
              ) : null}
            </div>
          </Panel>
        )}
      </section>
    </div>
  );
}

function AuditTab({
  english,
  data,
}: {
  english: boolean;
  data: PlatformAudit | null;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  return <UsageAnalyticsWorkspace english={english} audit={data} />;
}

function CompanyDrawer({
  company,
  context,
  catalogProducts,
  benefit,
  saving,
  onClose,
  onBenefit,
  onSubmitBenefit,
  onGrantProduct,
  onRevokeBenefit,
}: {
  company: PlatformCompanyDetail;
  context: PlatformAdminContext | null;
  catalogProducts: PlatformCatalogProduct[];
  benefit: BenefitPayload;
  saving: boolean;
  onClose: () => void;
  onBenefit: (value: BenefitPayload) => void;
  onSubmitBenefit: (event: FormEvent) => void;
  onGrantProduct: (productCode: string) => void;
  onRevokeBenefit: (reference: string) => void;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={t("Details for {p0}", { p0: company.name })}
    >
      <section className="flex h-full w-full max-w-3xl flex-col bg-[#f7f9fc] shadow-2xl">
        <div className="border-b border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#e8f5f2] font-medium text-[#177D66]">
                {initials(company.name)}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-medium text-slate-900">
                    {company.name}
                  </h2>
                  <StatusBadge
                    status={
                      company.billing_status ||
                      company.lifecycle_state ||
                      "legacy"
                    }
                  />
                </div>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {company.owner_email || t("Owner pending")} {t("· Company #")}{company.id}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"
              aria-label={t("Close")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SmallMetric
              label={t("Plan")}
              value={
                offerLabels(locale)[company.offer_code || ""] ||
                company.offer_code ||
                t("No plan")
              }
            />
            <SmallMetric
              label={t("Access status")}
              value={humanize(
                company.access_mode || company.lifecycle_state || "legacy",
              )}
            />
            <SmallMetric
              label={t("Users")}
              value={`${company.seat_usage.active ?? 0} / ${(company.seat_usage.included ?? 0) + (company.seat_usage.purchased_extra ?? 0) + (company.seat_usage.courtesy_extra ?? 0)}`}
            />
            <SmallMetric
              label={t("Next renewal")}
              value={formatDate(company.billing_status === "trialing"
                  ? company.trial_ends_at
                  : company.current_period_ends_at, locale)}
            />
          </section>
          <Panel
            title={t("Subscribed products")}
            description={t("Selection associated with the latest subscription.")}
          >
            <div className="flex flex-wrap gap-2 p-5">
              {company.products.map((product) => (
                <span
                  key={product.code}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#59C3A5]/40 bg-[#f5fbf9] px-3 py-2 text-sm text-[#177D66]"
                >
                  <PackageCheck className="h-4 w-4" />
                  {product.name}
                </span>
              ))}
              {!company.products.length ? (
                <p className="text-sm text-slate-500">
                  {t("This account has no associated catalog products yet.")}</p>
              ) : null}
            </div>
          </Panel>
          <section className="grid gap-4 lg:grid-cols-2">
            <Panel
              title={t("Account users")}
              description={t("{p0} registered membership(s).", { p0: company.members.length })}
            >
              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                {company.members.map((member) => (
                  <div
                    key={member.membership_id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {member.name || member.email}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {member.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-700">
                        {humanize(member.role || "user")}
                      </p>
                      <StatusBadge status={member.status || "active"} subtle />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel
              title={t("Recent invoices")}
              description={t("Latest documents associated with the company.")}
            >
              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                {company.invoices.map((invoice) => (
                  <div
                    key={invoice.invoice_id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {formatMoney(invoice.amount_due_cents, invoice.currency, locale)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(invoice.period_ends_at, locale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={invoice.status || "unknown"} />
                      {invoice.hosted_invoice_url ? (
                        <a
                          href={invoice.hosted_invoice_url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={t("Open invoice")}
                        >
                          <ExternalLink className="h-4 w-4 text-slate-500" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
                {!company.invoices.length ? (
                  <EmptyRow
                    icon={CreditCard}
                    text={t("No synchronized invoices.")}
                  />
                ) : null}
              </div>
            </Panel>
          </section>
          {company.storage_usage?.metered ? (
            <Panel
              title={t("Storage")}
              description={t("Measured usage and allocated account capacity.")}
            >
              <div className="grid grid-cols-3 gap-3 p-5">
                <SmallMetric
                  label={t("Used")}
                  value={`${toGigabytes(company.storage_usage.used_bytes + company.storage_usage.reserved_bytes)} GB`}
                />
                <SmallMetric
                  label={t("Limit")}
                  value={`${toGigabytes(company.storage_usage.limit_bytes)} GB`}
                />
                <SmallMetric
                  label={t("Extra blocks")}
                  value={String(
                    company.storage_usage.purchased_blocks +
                      company.storage_usage.benefit_blocks,
                  )}
                />
              </div>
            </Panel>
          ) : null}
          {context?.can_manage_benefits ? (
            <Panel
              title={t("Grant benefit")}
              description={t("Separate from the subscription and recorded in the audit log.")}
            >
              <form onSubmit={onSubmitBenefit} className="space-y-3 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("Type")}>
                    <select
                      value={benefit.benefit_type}
                      onChange={(event) =>
                        onBenefit({
                          ...benefit,
                          benefit_type: event.target
                            .value as BenefitPayload["benefit_type"],
                        })
                      }
                      className={controlClass}
                    >
                      <option value="PRODUCT">{t("Module")}</option>
                      <option value="SEAT">{t("Users")}</option>
                      <option value="STORAGE">{t("Storage")}</option>
                    </select>
                  </Field>
                  <Field label={t("Source")}>
                    <select
                      value={benefit.source_type}
                      onChange={(event) =>
                        onBenefit({
                          ...benefit,
                          source_type: event.target
                            .value as BenefitPayload["source_type"],
                        })
                      }
                      className={controlClass}
                    >
                      <option value="COURTESY">{t("Courtesy")}</option>
                      <option value="PROMOTION">{t("Promotion")}</option>
                      <option value="SUPPORT">{t("Support")}</option>
                      <option value="TEST">{t("Trial")}</option>
                    </select>
                  </Field>
                </div>
                {benefit.benefit_type === "PRODUCT" ? (
                  <Field label={t("Product code")}>
                    <input
                      required
                      value={benefit.product_code}
                      onChange={(event) =>
                        onBenefit({
                          ...benefit,
                          product_code: event.target.value,
                        })
                      }
                      className={controlClass}
                      placeholder="hr, process_tasks..."
                    />
                  </Field>
                ) : (
                  <Field label={t("Quantity")}>
                    <input
                      required
                      min={1}
                      type="number"
                      value={benefit.quantity}
                      onChange={(event) =>
                        onBenefit({
                          ...benefit,
                          quantity: Number(event.target.value),
                        })
                      }
                      className={controlClass}
                    />
                  </Field>
                )}
                <Field label={t("Reason")}>
                  <textarea
                    required
                    minLength={5}
                    value={benefit.reason}
                    onChange={(event) =>
                      onBenefit({ ...benefit, reason: event.target.value })
                    }
                    className={`${controlClass} min-h-20 resize-y py-2`}
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("Campaign")}>
                    <input
                      value={benefit.campaign_code}
                      onChange={(event) =>
                        onBenefit({
                          ...benefit,
                          campaign_code: event.target.value,
                        })
                      }
                      className={controlClass}
                    />
                  </Field>
                  <Field label={t("Valid until")}>
                    <input
                      type="datetime-local"
                      value={benefit.ends_at || ""}
                      onChange={(event) =>
                        onBenefit({ ...benefit, ends_at: event.target.value })
                      }
                      className={controlClass}
                    />
                  </Field>
                </div>
                <button
                  disabled={saving}
                  className="h-11 w-full rounded-xl bg-[#143675] text-sm font-medium text-white disabled:opacity-50"
                >
                  {saving ? t("Saving...") : t("Grant benefit")}
                </button>
              </form>
            </Panel>
          ) : null}
          <Panel
            title={t("Benefit history")}
            description={t("Active or revoked courtesies, promotions and support grants.")}
          >
            <div className="divide-y divide-slate-100">
              {company.benefits.map((item) => (
                <article key={item.reference} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">
                        {item.benefit_type === "PRODUCT"
                          ? item.product_code
                          : `${item.quantity} ${item.benefit_type === "SEAT" ? "usuario(s)" : "bloque(s)"}`}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {humanize(item.source_type)} ·{" "}
                        {item.campaign_code || t("No campaign")}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{item.reason}</p>
                  {item.status === "ACTIVE" && context?.can_manage_benefits ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onRevokeBenefit(item.reference)}
                      className="mt-3 text-xs font-medium text-red-600"
                    >
                      {t("Revoke benefit")}</button>
                  ) : null}
                </article>
              ))}
              {!company.benefits.length ? (
                <EmptyRow icon={Gift} text={t("This account has no benefits.")} />
              ) : null}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}

function ModuleAvailabilityModal({
  change,
  reason,
  error,
  saving,
  onReason,
  onCancel,
  onConfirm,
}: {
  change: NonNullable<ModuleAvailabilityChange>;
  reason: string;
  error: string;
  saving: boolean;
  onReason: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  const activating = change.active;
  const presetReason = moduleAvailabilityReasonOptions.includes(
    reason as (typeof moduleAvailabilityReasonOptions)[number],
  );
  const reasonSelection = presetReason ? reason : reason ? "OTHER" : "";
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/45 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="module-status-title"
    >
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
        <IndiceModalValidation messages={error ? [error] : []} />
        <span
          className={`grid h-11 w-11 place-items-center rounded-xl ${activating ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}
        >
          {activating ? (
            <Activity className="h-5 w-5" />
          ) : (
            <CircleAlert className="h-5 w-5" />
          )}
        </span>
        <h2
          id="module-status-title"
          className="mt-4 text-lg font-medium text-slate-900"
        >
          {activating
            ? t("Enable module in offer")
            : t("Remove module from offer")}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {activating ? (
            <>
              <strong className="font-medium text-slate-900">
                {change.module.name}
              </strong>{" "}
              {t("will be available again in products, trials and new accounts.")}</>
          ) : (
            <>
              <strong className="font-medium text-slate-900">
                {change.module.name}
              </strong>{" "}
              {t("will no longer be offered in products and new accounts. Existing data and assignments will be preserved for future reactivation.")}</>
          )}
        </p>
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${activating ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          {activating
            ? t("After enabling it, review Products and packages to decide how it will be sold.")
            : t("This change affects the overall offer. Review existing customers before confirming.")}
        </div>
        <Field label={t("Audit reason")}>
          <select
            autoFocus
            required
            value={reasonSelection}
            onChange={(event) => onReason(event.target.value)}
            className={`${controlClass} mt-4`}
          >
            <option value="">{t("Select a reason")}</option>
            {moduleAvailabilityReasonOptions.map((option) => (
              <option key={option} value={option}>
                {flowOptionLabel(option, locale)}
              </option>
            ))}
            <option value="OTHER">{t("Other reason")}</option>
          </select>
        </Field>
        {reasonSelection === "OTHER" ? (
          <Field label={t("Describe the reason")}>
            <textarea
              required
              minLength={5}
              value={reason === "OTHER" ? "" : reason}
              onChange={(event) => onReason(event.target.value)}
              className={`${controlClass} mt-4 min-h-24 resize-y py-2`}
            />
          </Field>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700"
          >
            {t("Cancel")}</button>
          <button
            type="button"
            disabled={saving || reason === "OTHER" || reason.trim().length < 3}
            onClick={onConfirm}
            className={`h-11 rounded-xl px-4 text-sm font-medium text-white disabled:opacity-50 ${activating ? "bg-emerald-600" : "bg-red-600"}`}
          >
            {saving
              ? t("Applying…")
              : activating
                ? t("Enable module")
                : t("Remove from offer")}
          </button>
        </div>
      </section>
    </div>
  );
}

function ConfirmModal({
  revocation,
  reason,
  error,
  saving,
  onReason,
  onCancel,
  onConfirm,
}: {
  revocation: NonNullable<Revocation>;
  reason: string;
  error: string;
  saving: boolean;
  onReason: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  const isProduct = revocation.kind === "benefit" && Boolean(revocation.label);
  const presetReason = revocationReasonOptions.includes(
    reason as (typeof revocationReasonOptions)[number],
  );
  const reasonSelection = presetReason ? reason : reason ? "OTHER" : "";
  const duplicateMessage =
    isProduct && (revocation.grantCount ?? 0) > 1
      ? t(" The {p0} active grants found will be consolidated and revoked.", { p0: revocation.grantCount })
      : "";
  return (
    <IndiceConfirmationDialog
      busy={saving}
      confirmDisabled={reason === "OTHER" || reason.trim().length < 3}
      cancelLabel={t("Cancel")}
      confirmLabel={
        saving ? t("Applying…") : isProduct ? t("Remove access") : t("Revoke")
      }
      description={
        isProduct
          ? t("The module will no longer be available for this account.{p0}", { p0: duplicateMessage })
          : t("The courtesy will no longer be available and the action will be recorded in the audit log.")
      }
      destructive
      icon={<CircleAlert className="h-5 w-5" />}
      itemName={revocation.label || revocation.reference}
      onCancel={onCancel}
      onConfirm={onConfirm}
      open
      title={
        isProduct
          ? t("Remove access to {p0}", { p0: revocation.label })
          : t("Confirm revocation")
      }
      tone="blue"
    >
      <IndiceModalValidation messages={error ? [error] : []} />
      <Field label={t("Audit reason")}>
        <select
          autoFocus
          required
          value={reasonSelection}
          onChange={(event) => onReason(event.target.value)}
          className={controlClass}
        >
          <option value="">{t("Select a reason")}</option>
          {revocationReasonOptions.map((option) => (
            <option key={option} value={option}>
              {flowOptionLabel(option, locale)}
            </option>
          ))}
          <option value="OTHER">{t("Other reason")}</option>
        </select>
      </Field>
      {reasonSelection === "OTHER" ? (
        <Field label={t("Describe the reason")}>
          <textarea
            required
            minLength={5}
            value={reason === "OTHER" ? "" : reason}
            onChange={(event) => onReason(event.target.value)}
            className={`${controlClass} min-h-24 resize-y py-2`}
          />
        </Field>
      ) : null}
    </IndiceConfirmationDialog>
  );
}

function PageIntro({
  eyebrow,
  title,
  description,
  action,
  icon: Icon = LayoutDashboard,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  icon?: typeof LayoutDashboard;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  return (
    <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-white via-blue-50/60 to-emerald-50/50 p-5 shadow-[0_18px_45px_-38px_rgba(37,99,235,0.65)]">
      <span
        className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-[#59C3A5]/10"
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-blue-100 bg-white text-[#2563EB] shadow-sm">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#177D66]">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              {title}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              {description}
            </p>
          </div>
        </div>
        {action}
      </div>
    </section>
  );
}
function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_45px_-38px_rgba(15,23,42,0.55)]">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="font-medium text-slate-900">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
  caption,
  accent,
  active = false,
  actionLabel,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  caption?: string;
  accent: "mint" | "blue" | "gold" | "coral";
  active?: boolean;
  actionLabel?: string;
  onClick?: () => void;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  const accents = {
    mint: "bg-[#e8f5f2] text-[#177D66] dark:bg-emerald-950/40 dark:text-emerald-300",
    blue: "bg-blue-50 text-[#143675] dark:bg-blue-950/45 dark:text-blue-300",
    gold: "bg-amber-50 text-amber-700 dark:bg-amber-950/35 dark:text-amber-300",
    coral: "bg-red-50 text-[#d84f49] dark:bg-red-950/35 dark:text-red-300",
  };
  const cardClassName = `w-full rounded-2xl border bg-white p-4 text-left shadow-[0_14px_35px_-32px_rgba(15,23,42,0.7)] transition dark:bg-slate-800 ${
    active
      ? "border-[#59C3A5] ring-2 ring-[#59C3A5]/20 dark:border-[#59C3A5]"
      : "border-slate-200 dark:border-slate-700"
  } ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:border-[#59C3A5] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/30" : ""}`;
  const content = (
    <>
      <div className="flex items-center gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${accents[accent]}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-0.5 truncate text-xl font-medium tracking-tight text-slate-950 dark:text-white">
            {value}
          </p>
          {caption ? (
            <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
              {caption}
            </p>
          ) : null}
        </div>
        {onClick ? (
          <span className={`ml-auto rounded-full px-2 py-1 text-[11px] font-medium ${active ? "bg-[#59C3A5]/20 text-[#176B5B] dark:bg-[#59C3A5]/15 dark:text-[#8FE0CA]" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300"}`}>
            {active ? "✓" : "→"}
          </span>
        ) : null}
      </div>
    </>
  );
  return onClick ? (
    <button
      type="button"
      aria-label={actionLabel || label}
      aria-pressed={active}
      onClick={onClick}
      className={cardClassName}
    >
      {content}
    </button>
  ) : (
    <article className={cardClassName}>{content}</article>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  const { t, locale } = usePlatformAdminTranslations();
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  const { t, locale } = usePlatformAdminTranslations();
  return (
    <label className="block space-y-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}
function MiniTag({ children }: { children: ReactNode }) {
  const { t, locale } = usePlatformAdminTranslations();
  return (
    <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
      {children}
    </span>
  );
}
function StatusBadge({
  status,
  subtle = false,
}: {
  status: string;
  subtle?: boolean;
}) {
  const { t, locale } = usePlatformAdminTranslations();
  const normalized = status.toLowerCase();
  const positive = [
    "active",
    "paid",
    "success",
    "trialing",
    "released",
  ].includes(normalized);
  const warning = [
    "open",
    "pending",
    "past_due",
    "trial",
    "draft",
    "grace",
  ].includes(normalized);
  const negative = [
    "failed",
    "unpaid",
    "canceled",
    "cancelled",
    "revoked",
    "inactive",
    "uncollectible",
    "void",
  ].includes(normalized);
  const informational = normalized === "demo";
  const tone = positive
    ? "bg-emerald-50 text-emerald-700"
    : warning
      ? "bg-amber-50 text-amber-700"
      : informational
        ? "bg-blue-50 text-blue-700"
      : negative
        ? "bg-red-50 text-red-700"
        : "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex max-w-36 items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${tone} ${subtle ? "bg-opacity-70" : ""}`}
      title={statusLabel(status, locale)}
    >
      {statusLabel(status, locale)}
    </span>
  );
}
function EmptyRow({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  const { t, locale } = usePlatformAdminTranslations();
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-5 py-10 text-center text-sm text-slate-500">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-400">
        <Icon className="h-5 w-5" />
      </span>
      {text}
    </div>
  );
}
function LoadingState() {
  const { t, locale } = usePlatformAdminTranslations();
  return (
    <div className="flex min-h-[45vh] items-center justify-center gap-3 text-sm text-slate-500">
      <LoaderCircle className="h-5 w-5 animate-spin text-[#177D66]" /> {t("Loading platform operations…")}</div>
  );
}
function PermissionState() {
  const { t, locale } = usePlatformAdminTranslations();
  return (
    <div className="grid min-h-[45vh] place-items-center">
      <div className="text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-slate-400" />
        <h2 className="mt-3 text-lg font-medium">{t("Read-only access")}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {t("Your role cannot manage benefits.")}</p>
      </div>
    </div>
  );
}

function formatMoney(value?: number | null, currency = "USD", locale = "en-CA") {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(value / 100);
}
function formatDate(value?: string | null, locale = "en-CA") {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}
function formatDateTime(value?: string | null, locale = "en-CA") {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}
function statusLabel(value?: string | null, locale = "en-CA") {
  const t = getPlatformAdminTranslator(locale);
  if (!value) return t("No status");
  const labels: Record<string, string> = {
    active: t("Active"),
    trial: t("Trial"),
    demo: t("Demo"),
    trialing: t("In trial"),
    paid: t("Paid"),
    open: t("Open"),
    past_due: t("Payment pending"),
    unpaid: t("Unpaid"),
    canceled: t("Cancelled"),
    cancelled: t("Cancelled"),
    revoked: t("Revoked"),
    success: t("Successful"),
    failed: t("Failed"),
    released: t("Published"),
    legacy: t("Legacy"),
    inactive: t("Inactive"),
    unknown: t("Unknown"),
    "sin movimientos": t("No activity"),
    pending: t("Pending"), draft: t("Draft"), grace: t("Grace period"),
    uncollectible: t("Uncollectible"), void: t("Voided"), payment_required: t("Payment pending"), deleted: t("Deleted"),
  };
  return labels[value.toLowerCase()] || t("Unknown");
}
function humanize(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}
function initials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "IN"
  );
}
function shortId(value?: string | null) {
  if (!value) return "—";
  return value.length > 22 ? `${value.slice(0, 10)}…${value.slice(-7)}` : value;
}
function toGigabytes(bytes: number) {
  return Number((bytes / 1024 ** 3).toFixed(1));
}
function moduleVisual(module: PlatformModule) {
  const slug =
    `${module.slug} ${module.route_key || ""} ${module.name}`.toLowerCase();
  const definitions: Array<[string[], string, string, string]> = [
    [
      ["config", "panel inicial", "dashboard"],
      "🏠",
      "from-blue-100 via-sky-50 to-transparent",
      "border-blue-200 dark:border-blue-900",
    ],
    [
      ["human", "resource", "recursos humanos"],
      "👥",
      "from-teal-100 via-emerald-50 to-transparent",
      "border-teal-200 dark:border-teal-900",
    ],
    [
      ["petty", "caja chica"],
      "💰",
      "from-emerald-100 via-green-50 to-transparent",
      "border-emerald-200 dark:border-emerald-900",
    ],
    [
      ["expense", "gastos"],
      "💸",
      "from-green-100 via-lime-50 to-transparent",
      "border-green-200 dark:border-green-900",
    ],
    [
      ["crm"],
      "🤝",
      "from-orange-100 via-amber-50 to-transparent",
      "border-orange-200 dark:border-orange-900",
    ],
    [
      ["point", "pos", "punto de venta"],
      "🛒",
      "from-rose-100 via-orange-50 to-transparent",
      "border-rose-200 dark:border-rose-900",
    ],
    [
      ["kpi", "indicadores"],
      "📊",
      "from-violet-100 via-purple-50 to-transparent",
      "border-violet-200 dark:border-violet-900",
    ],
    [
      ["process", "task", "procesos", "tareas"],
      "✅",
      "from-amber-100 via-yellow-50 to-transparent",
      "border-amber-200 dark:border-amber-900",
    ],
    [
      ["receiv", "cartera"],
      "📒",
      "from-cyan-100 via-sky-50 to-transparent",
      "border-cyan-200 dark:border-cyan-900",
    ],
    [
      ["inventory", "inventario", "warehouse", "almacén"],
      "📦",
      "from-orange-100 via-red-50 to-transparent",
      "border-orange-200 dark:border-orange-900",
    ],
    [
      ["sale", "ventas"],
      "💼",
      "from-rose-100 via-pink-50 to-transparent",
      "border-rose-200 dark:border-rose-900",
    ],
    [
      ["maintenance", "mantenimiento"],
      "🛠️",
      "from-slate-200 via-zinc-50 to-transparent",
      "border-slate-300 dark:border-slate-700",
    ],
    [
      ["minutas", "minutes", "control_minutas"],
      "📝",
      "from-indigo-100 via-blue-50 to-transparent",
      "border-indigo-200 dark:border-indigo-900",
    ],
    [
      ["cleaning", "limpieza"],
      "🧹",
      "from-cyan-100 via-teal-50 to-transparent",
      "border-cyan-200 dark:border-cyan-900",
    ],
    [
      ["lavander"],
      "🧺",
      "from-sky-100 via-blue-50 to-transparent",
      "border-sky-200 dark:border-sky-900",
    ],
    [
      ["transport"],
      "🚌",
      "from-yellow-100 via-amber-50 to-transparent",
      "border-yellow-200 dark:border-yellow-900",
    ],
    [
      ["vehicle", "vehículo", "vehiculo", "maquinaria"],
      "🚜",
      "from-orange-100 via-amber-50 to-transparent",
      "border-orange-200 dark:border-orange-900",
    ],
    [
      ["property", "inmueble"],
      "🏢",
      "from-blue-100 via-indigo-50 to-transparent",
      "border-blue-200 dark:border-blue-900",
    ],
    [
      ["form", "formulario"],
      "📋",
      "from-purple-100 via-fuchsia-50 to-transparent",
      "border-purple-200 dark:border-purple-900",
    ],
    [
      ["billing", "facturación", "facturacion"],
      "🧾",
      "from-emerald-100 via-teal-50 to-transparent",
      "border-emerald-200 dark:border-emerald-900",
    ],
    [
      ["mail", "correo"],
      "✉️",
      "from-blue-100 via-sky-50 to-transparent",
      "border-blue-200 dark:border-blue-900",
    ],
    [
      ["clima", "climate"],
      "🌤️",
      "from-yellow-100 via-sky-50 to-transparent",
      "border-yellow-200 dark:border-yellow-900",
    ],
    [
      ["affiliate", "afiliado"],
      "🔗",
      "from-fuchsia-100 via-pink-50 to-transparent",
      "border-fuchsia-200 dark:border-fuchsia-900",
    ],
  ];
  const match = definitions.find(([tokens]) =>
    tokens.some((token) => slug.includes(token)),
  );
  if (match) return { emoji: match[1], gradient: match[2], border: match[3] };
  if (module.category === "ai")
    return {
      emoji: "🤖",
      gradient: "from-violet-100 via-blue-50 to-transparent",
      border: "border-violet-200 dark:border-violet-900",
    };
  if (
    module.icon &&
    /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(module.icon)
  )
    return {
      emoji: module.icon,
      gradient: "from-slate-100 to-transparent",
      border: "border-slate-200 dark:border-slate-700",
    };
  return {
    emoji: "🧩",
    gradient: "from-slate-100 to-transparent",
    border: "border-slate-200 dark:border-slate-700",
  };
}
function environmentLabel(locale: string) {
  const t = getPlatformAdminTranslator(locale);
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1")
    return { label: t("Local"), className: "bg-blue-50 text-[#143675]" };
  if (hostname.includes("apptest"))
    return { label: t("Test"), className: "bg-amber-50 text-amber-700" };
  return { label: t("Production"), className: "bg-emerald-50 text-emerald-700" };
}
