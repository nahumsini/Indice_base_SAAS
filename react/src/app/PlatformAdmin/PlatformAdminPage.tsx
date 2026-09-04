import {
  useCallback,
  useEffect,
  useMemo,
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
import ConsultingAdminTab from "./ConsultingAdminTab";
import { CompaniesDirectoryTab } from "./UsersDirectoryTab";
import { CatalogProductCard } from "./Catalog";
import { CommercialOfferWorkspace, ModuleAvailabilityWorkspace } from "./CatalogWorkspace";
import {
  CustomersTable,
  CustomerColumnsModal,
  CustomerControlCenter,
  TrialExtensionModal,
  basicCommercialStatus,
  compareCustomerValues,
  getCustomerTableCopy,
  loadCustomerTableColumnIds,
  matchesCustomerStatusFilter,
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

const offerLabels: Record<string, string> = {
  basic_1: "Un módulo",
  basic_2: "Dos módulos",
  basic_3: "Tres módulos",
  basic_all: "Cuatro o más módulos",
  extra_seat: "Usuario adicional",
  storage_block: "Almacenamiento adicional",
};

export default function PlatformAdminPage() {
  const navigate = useNavigate();
  const { currentLanguage } = useLanguage();
  const english = currentLanguage.code.startsWith("en");
  const tabs = useMemo(
    () =>
      tabDefinitions.map((tab) => ({
        ...tab,
        label: english ? tab.en : tab.es,
      })),
    [english],
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
  const [companyDeletion, setCompanyDeletion] = useState<PlatformCompanySummary | null>(null);
  const [companyDeletionName, setCompanyDeletionName] = useState("");
  const [companyDeletionReason, setCompanyDeletionReason] = useState("");
  const [trialExtensionError, setTrialExtensionError] = useState("");
  const [courtesyAccessOpen, setCourtesyAccessOpen] = useState(false);
  const [revocation, setRevocation] = useState<Revocation>(null);
  const [revocationReason, setRevocationReason] = useState(
    "Fin de cortesía o promoción",
  );
  const [moduleChange, setModuleChange] =
    useState<ModuleAvailabilityChange>(null);
  const [moduleChangeReason, setModuleChangeReason] = useState(
    "Disponibilidad global administrada desde el panel root",
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [accountFeedback, setAccountFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [
        access,
        overviewData,
        billingData,
        catalogData,
        modulesData,
        auditData,
        courtesyData,
      ] = await Promise.all([
        platformAdminApi.getContext(),
        platformAdminApi.getOverview(),
        platformAdminApi.getBilling(),
        platformAdminApi.getCatalog(),
        platformAdminApi.getModules(),
        platformAdminApi.getAudit(),
        platformAdminApi.getCourtesyCodes(),
      ]);
      setContext(access);
      setOverview(overviewData);
      setBilling(billingData);
      setCatalog(catalogData);
      setModuleRegistry(modulesData);
      setAuditLog(auditData);
      setCourtesyCatalog(courtesyData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar la operación de plataforma.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (activeTab !== "customers" || loading) return;

    let cancelled = false;
    const refreshCustomerBilling = async () => {
      try {
        const overviewData = await platformAdminApi.getOverview();
        if (!cancelled) setOverview(overviewData);
      } catch {
        // Background synchronization must not replace usable data with an error screen.
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshCustomerBilling();
      }
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const intervalId = window.setInterval(refreshWhenVisible, 30_000);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.clearInterval(intervalId);
    };
  }, [activeTab, loading]);

  useEffect(() => {
    if (!loading && context?.can_manage_accounts && hasAccountCreationDraft()) {
      setCreateAccountOpen(true);
    }
  }, [context?.can_manage_accounts, loading]);

  const companies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (overview?.companies ?? []).filter((company) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          company.name,
          company.owner_email,
          company.distributor_company_name,
          String(company.id),
        ].some((value) => value?.toLowerCase().includes(normalizedQuery));
      const matchesStatus = matchesCustomerStatusFilter(company, statusFilter);
      const matchesUserType =
        userTypeFilter === "all" || company.user_type === userTypeFilter;
      return matchesQuery && matchesUserType && matchesStatus;
    });
  }, [overview, query, userTypeFilter, statusFilter]);

  const sortedCompanies = useMemo(() => {
    if (!customerSort.direction) return companies;
    const direction = customerSort.direction === "asc" ? 1 : -1;
    return [...companies].sort(
      (left, right) =>
        compareCustomerValues(left, right, customerSort.key) * direction,
    );
  }, [companies, customerSort]);

  const distributorAccounts = useMemo(
    () =>
      (overview?.companies ?? [])
        .filter((company) => company.user_type === "DISTRIBUTOR")
        .sort((left, right) => left.name.localeCompare(right.name)),
    [overview],
  );

  const pagedCompanies = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedCompanies.slice(start, start + pageSize);
  }, [sortedCompanies, page, pageSize]);

  const activeCatalogProducts = useMemo(() => {
    return selectActiveCatalogProducts(catalog);
  }, [catalog]);

  useEffect(() => {
    setPage(1);
  }, [query, userTypeFilter, statusFilter, pageSize, customerSort]);

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
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar la cuenta.",
      );
    }
  };

  const openCompanyUsers = async (company: PlatformCompanySummary) => {
    setError("");
    try {
      setUsersCompany(await platformAdminApi.getCompany(company.id));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar los usuarios de la cuenta.",
      );
    }
  };

  const refreshUsersCompany = async () => {
    if (!usersCompany) return;
    const [overviewData, companyData] = await Promise.all([
      platformAdminApi.getOverview(),
      platformAdminApi.getCompany(usersCompany.id),
    ]);
    setOverview(overviewData);
    setUsersCompany(companyData);
  };

  const refreshOverviewAndCompany = async () => {
    const overviewData = await platformAdminApi.getOverview();
    setOverview(overviewData);
    if (selected) setSelected(await platformAdminApi.getCompany(selected.id));
  };

  const confirmCompanyDeletion = async () => {
    if (!companyDeletion) return;
    setSaving(true);
    setError("");
    try {
      await platformAdminApi.deleteCompanyAccount(companyDeletion.id, companyDeletionName, companyDeletionReason);
      setOverview(await platformAdminApi.getOverview());
      setAccountFeedback({
        type: "success",
        message: english
          ? `${companyDeletion.name} was marked as deleted. Its history was preserved.`
          : `${companyDeletion.name} quedó como Eliminado. Su historial fue conservado.`,
      });
      setCompanyDeletion(null);
      setCompanyDeletionName("");
      setCompanyDeletionReason("");
    } catch (deletionError) {
      setError(deletionError instanceof Error ? deletionError.message : "No se pudo eliminar la cuenta.");
    } finally {
      setSaving(false);
    }
  };

  const createCompanyAccount = async (
    payload: PlatformAccountCreatePayload,
  ): Promise<PlatformAccountCreateResult> => {
    const created = await platformAdminApi.createCompanyAccount(payload);
    const [overviewData, courtesyData, auditData] = await Promise.all([
      platformAdminApi.getOverview(),
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
  ) => {
    if (!accountTypeEdit || saving) return;
    setSaving(true);
    setAccountTypeEditError("");
    try {
      await platformAdminApi.updateCompanyAccountType(
        accountTypeEdit.id,
        accountType,
      );
      const [overviewData, auditData] = await Promise.all([
        platformAdminApi.getOverview(),
        platformAdminApi.getAudit(),
      ]);
      setOverview(overviewData);
      setAuditLog(auditData);
      setAccountTypeEdit(null);
    } catch (saveError) {
      setAccountTypeEditError(
        saveError instanceof Error
          ? saveError.message
          : english
            ? "The user type could not be updated."
            : "No se pudo actualizar el tipo de usuario.",
      );
    } finally {
      setSaving(false);
    }
  };

  const updateCompanyDistributor = async (
    distributorCompanyId: number | null,
  ) => {
    if (!distributorAssignment || saving) return;
    setSaving(true);
    setDistributorAssignmentError("");
    try {
      await platformAdminApi.updateCompanyDistributor(
        distributorAssignment.id,
        distributorCompanyId,
      );
      const [overviewData, auditData] = await Promise.all([
        platformAdminApi.getOverview(),
        platformAdminApi.getAudit(),
      ]);
      setOverview(overviewData);
      setAuditLog(auditData);
      setDistributorAssignment(null);
    } catch (saveError) {
      setDistributorAssignmentError(
        saveError instanceof Error
          ? saveError.message
          : english
            ? "The distributor could not be assigned."
            : "No se pudo asignar el distribuidor.",
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
        platformAdminApi.getOverview(),
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
        saveError instanceof Error
          ? saveError.message
          : english
            ? "The trial could not be extended."
            : "No se pudo extender el periodo de prueba.",
      );
    } finally {
      setSaving(false);
    }
  };

  const grantProductAccess = async (productCode: string) => {
    if (!selected || saving) return;
    setSaving(true);
    setError("");
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
        reason: "Acceso de módulo administrado desde la cuenta Root.",
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
        message: `${productName} quedó habilitado y sincronizado con el acceso real de la cuenta.`,
      });
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "No se pudo habilitar el módulo.";
      setError(message);
      setAccountFeedback({ type: "error", message });
    } finally {
      setSaving(false);
    }
  };

  const previewCompanyProducts = async (productCodes: string[]) => {
    if (!selected) throw new Error("Selecciona una cuenta antes de revisar el cambio.");
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
        message: `El cambio de ${result.product_codes.length} módulo(s) quedó programado sin cargo inmediato. Se aplicará al acceso después del pago en la fecha de corte${result.effective_at ? ` (${new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(result.effective_at))})` : ""}.`,
      });
      return true;
    } catch (saveError) {
      const message = saveError instanceof Error
        ? saveError.message
        : "No se pudieron actualizar los módulos de la cuenta.";
      setError(message);
      setAccountFeedback({ type: "error", message });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updatePublicDemoAccess = async (enabled: boolean) => {
    if (!selected || saving) return;
    setSaving(true);
    setError("");
    setAccountFeedback(null);
    try {
      await platformAdminApi.updatePublicDemoAccess(selected.id, enabled);
      await refreshOverviewAndCompany();
      setAccountFeedback({
        type: "success",
        message: enabled
          ? "La empresa ya aparece en /demo y acepta sus credenciales existentes sin MFA únicamente por esa ruta."
          : "La empresa dejó de aceptar accesos desde /demo. El inicio de sesión normal no cambió.",
      });
    } catch (saveError) {
      const message = saveError instanceof Error
        ? saveError.message
        : "No se pudo actualizar el acceso demo público.";
      setError(message);
      setAccountFeedback({ type: "error", message });
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
          "El ajuste se aplicó correctamente y quedó registrado en auditoría.",
      });
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "No se pudo otorgar el beneficio.";
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
          "El acceso promocional quedó generado. Copia el código antes de cerrar.",
      });
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "No se pudo generar el acceso promocional.";
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
          message: `${revocation.label || "El acceso"} se retiró y la cuenta quedó sincronizada.`,
        });
      } else {
        await platformAdminApi.revokeCourtesyCode(
          revocation.reference,
          revocationReason.trim(),
        );
        setCourtesyCatalog(await platformAdminApi.getCourtesyCodes());
      }
      setRevocation(null);
      setRevocationReason("Fin de cortesía o promoción");
    } catch (revokeError) {
      const message =
        revokeError instanceof Error
          ? revokeError.message
          : "No se pudo completar la revocación.";
      setError(message);
      if (revocation.kind === "benefit")
        setAccountFeedback({ type: "error", message });
      setRevocation(null);
    } finally {
      setSaving(false);
    }
  };

  const confirmModuleAvailability = async () => {
    if (!moduleChange || saving || moduleChangeReason.trim().length < 3) return;
    setSaving(true);
    setError("");
    try {
      await platformAdminApi.updateModuleAvailability(
        moduleChange.module.id,
        moduleChange.active,
        moduleChangeReason.trim(),
      );
      setModuleRegistry(await platformAdminApi.getModules());
      setModuleChange(null);
      setModuleChangeReason(
        "Disponibilidad global administrada desde el panel root",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo cambiar la disponibilidad global del módulo.",
      );
    } finally {
      setSaving(false);
    }
  };

  const environment = environmentLabel();
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
                  {english
                    ? "Platform administration"
                    : "Administración de plataforma"}
                </h1>
                <span
                  className={`hidden rounded-full px-2 py-1 text-[11px] font-medium sm:inline-flex ${environment.className}`}
                >
                  {environment.label}
                </span>
              </div>
              <p className="hidden text-xs text-slate-500 dark:text-slate-400 md:block">
                {english
                  ? "Customers, catalog, access and commercial operations"
                  : "Clientes, catálogo, accesos y operación comercial"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadAll()}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              aria-label={english ? "Refresh data" : "Actualizar información"}
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
                {english ? "Back to ERP" : "Volver al ERP"}
              </span>
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-[1600px] px-4 py-2 lg:px-6">
          <IndiceWorkspaceNavigation<AdminTab>
            ariaLabel={
              english ? "Administration sections" : "Secciones de administración"
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
                companies={companies}
                pagedCompanies={pagedCompanies}
                query={query}
                userTypeFilter={userTypeFilter}
                statusFilter={statusFilter}
                sort={customerSort}
                page={page}
                pageSize={pageSize}
                canCreate={Boolean(context?.can_manage_accounts)}
                canEditTypes={Boolean(context?.can_manage_accounts)}
                canAssignDistributors={Boolean(context?.can_manage_accounts)}
                canExtendTrials={context?.role === "PLATFORM_ROOT"}
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
                onDelete={(company) => {
                  setCompanyDeletionName("");
                  setCompanyDeletionReason("");
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
              <BillingTab
                english={english}
                data={billing}
                onOpenCompany={openCompany}
              />
            ) : null}
            {activeTab === "catalog" ? (
              <CatalogAndModulesTab
                english={english}
                catalog={catalog}
                modules={moduleRegistry}
                canManage={Boolean(context?.can_manage_modules)}
                saving={saving}
                onCatalogChange={setCatalog}
                onModuleChange={setModuleChange}
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
          onRevokeBenefit={(reference, label, grantCount) =>
            setRevocation({ kind: "benefit", reference, label, grantCount })
          }
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
          eyebrow={english ? "Customers" : "Clientes"}
          title={english ? "Promotional access" : "Acceso promocional"}
          description={
            english
              ? "Create and manage auditable access codes without leaving the customer workflow."
              : "Genera y administra códigos auditables sin salir del flujo de clientes."
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
            onRevoke={(reference) =>
              setRevocation({ kind: "courtesy", reference })
            }
          />
        </IndiceModalFrame>
      ) : null}
      {revocation ? (
        <ConfirmModal
          revocation={revocation}
          reason={revocationReason}
          saving={saving}
          onReason={setRevocationReason}
          onCancel={() => setRevocation(null)}
          onConfirm={() => void confirmRevocation()}
        />
      ) : null}
      {moduleChange ? (
        <ModuleAvailabilityModal
          change={moduleChange}
          reason={moduleChangeReason}
          saving={saving}
          onReason={setModuleChangeReason}
          onCancel={() => setModuleChange(null)}
          onConfirm={() => void confirmModuleAvailability()}
        />
      ) : null}
      {companyDeletion ? (
        <IndiceConfirmationDialog
          busy={saving}
          confirmDisabled={companyDeletionName !== companyDeletion.name || companyDeletionReason.trim().length < 5}
          confirmLabel={saving ? (english ? "Deleting..." : "Eliminando...") : (english ? "Mark as deleted" : "Marcar como eliminado")}
          description={english
            ? "This is a soft deletion. The account and its history remain stored, but access is blocked. Active Stripe subscriptions must be cancelled first."
            : "Esta es una baja lógica. La cuenta y su historial permanecen guardados, pero se bloquea el acceso. Primero deben cancelarse las suscripciones activas de Stripe."}
          destructive
          icon={<Trash2 className="h-5 w-5" />}
          itemName={companyDeletion.name}
          onCancel={() => setCompanyDeletion(null)}
          onConfirm={() => void confirmCompanyDeletion()}
          open
          title={english ? "Delete account" : "Eliminar cuenta"}
          tone="coral"
        >
          <Field label={english ? "Deletion reason" : "Motivo de eliminación"}>
            <textarea autoFocus minLength={5} value={companyDeletionReason} onChange={(event) => setCompanyDeletionReason(event.target.value)} className={`${controlClass} min-h-24 resize-y py-2`} />
          </Field>
          <Field label={english ? `Type “${companyDeletion.name}” to confirm` : `Escribe “${companyDeletion.name}” para confirmar`}>
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
  onDelete,
}: {
  english: boolean;
  totals: PlatformOverview["totals"] | undefined;
  allCompanies: PlatformCompanySummary[];
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
  onDelete: (company: PlatformCompanySummary) => void;
}) {
  const pages = Math.max(1, Math.ceil(companies.length / pageSize));
  const copy = getCustomerTableCopy(english);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<CustomerTableColumnId[]>(
    loadCustomerTableColumnIds,
  );
  useEffect(() => {
    saveCustomerTableColumnIds(visibleColumns);
  }, [visibleColumns]);
  const demoAndTrialAccounts = allCompanies.filter((company) =>
    matchesCustomerStatusFilter(company, "temporary"),
  ).length;
  const pagination = (
    <DataTablePagination
      currentPage={page}
      totalPages={pages}
      pageSize={pageSize}
      pageSizeOptions={[10, 25, 50, 100, 200]}
      totalCount={companies.length}
      pageStart={companies.length ? (page - 1) * pageSize + 1 : 0}
      pageEnd={Math.min(page * pageSize, companies.length)}
      itemLabel={english ? "accounts" : "cuentas"}
      onPageChange={onPage}
      onPageSizeChange={onPageSize}
    />
  );

  return (
    <div className="space-y-5">
      <IndiceTitleBar
        tone="aqua"
        icon={<Building2 className="h-5 w-5" />}
        title={
          english
            ? "Customer control center"
            : "Centro de control de clientes"
        }
        subtitle={
          english
            ? "Control each customer's health, owner, access, billing and next action from one place."
            : "Controla la salud, responsable, acceso, facturación y siguiente acción de cada cliente desde un solo lugar."
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
                      {english ? "Promotional access" : "Acceso promocional"}
                    </DropdownMenuItem>
                  ) : null}
                  {canCreate ? (
                    <DropdownMenuItem onSelect={onQuickCreate} className="rounded-lg py-2.5">
                      <Sparkles className="h-4 w-4 text-[#177D66]" />
                      {english ? "Quick test account" : "Cuenta de prueba rápida"}
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
                {english ? "Add account" : "Agregar cuenta"}
              </button>
            ) : null}
          </div>
        }
      />
      <CustomerControlCenter
        english={english}
        companies={allCompanies}
        activeFilter={statusFilter}
        onFilter={onStatus}
        onOpenCompany={(company) => onOpenCompany(company)}
      />
      <IndiceFilterBar
        title={english ? "Customer portfolio" : "Cartera de clientes"}
        gridClassName="lg:grid-cols-[minmax(0,1fr)_220px_260px]"
      >
        <IndiceFilterSearch
          label={english ? "Search" : "Buscar"}
          placeholder={
            english ? "Company, email or ID" : "Empresa, correo o ID"
          }
          tone="aqua"
          value={query}
          onValueChange={onQuery}
          onClear={() => onQuery("")}
        />
        <IndiceFilterSelect
          label={english ? "Account type" : "Tipo de cuenta"}
          tone="aqua"
          value={userTypeFilter}
          onValueChange={onUserType}
          options={[
            { value: "all", label: english ? "All types" : "Todos los tipos" },
            { value: "ROOT", label: "Root" },
            { value: "SUPER_ADMIN", label: "Super Admin" },
            {
              value: "DISTRIBUTOR",
              label: english ? "Distributor" : "Distribuidor",
            },
          ]}
        />
        <IndiceFilterSelect
          label={english ? "Commercial status" : "Estado comercial"}
          tone="aqua"
          value={statusFilter}
          onValueChange={onStatus}
          options={[
            {
              value: "all",
              label: english ? "All statuses" : "Todos los estados",
            },
            { value: "active", label: english ? "Active" : "Activa" },
            {
              value: "temporary",
              label: english ? "Demo and trial" : "Demo y prueba",
            },
            { value: "trial", label: english ? "Trial" : "Prueba" },
            { value: "demo", label: "Demo" },
            {
              value: "inactive",
              label: english ? "Inactive" : "Inactiva",
            },
            {
              value: "attention",
              label: english ? "Needs attention" : "Requiere atención",
            },
            {
              value: "expiring",
              label: english ? "Trial ending in 7 days" : "Prueba vence en 7 días",
            },
            {
              value: "no_offer",
              label: english ? "No offer configured" : "Sin oferta configurada",
            },
            {
              value: "no_adoption",
              label: english ? "No active users" : "Sin usuarios activos",
            },
            { value: "deleted", label: english ? "Deleted" : "Eliminado" },
          ]}
        />
      </IndiceFilterBar>
      <section
        className="grid gap-3 md:grid-cols-3"
        aria-label={english ? "Customer KPIs" : "KPIs de clientes"}
      >
        <Metric
          icon={CircleDollarSign}
          label={english ? "Monthly projection" : "Proyección mensual"}
          value={formatMoney(
            totals?.projected_monthly_billing_cents,
            totals?.currency,
            english,
          )}
          caption={english ? "Stripe contracts + estimates" : "Contratos Stripe + estimaciones"}
          accent="gold"
        />
        <Metric
          icon={Building2}
          label={english ? "Active accounts" : "Cuentas activas"}
          value={String(totals?.active_customer_companies ?? 0)}
          caption={
            english
              ? `${totals?.customer_active_users ?? 0} total active users`
              : `${totals?.customer_active_users ?? 0} usuarios activos totales`
          }
          accent="mint"
          active={statusFilter === "active"}
          actionLabel={english ? "Filter active accounts" : "Filtrar cuentas activas"}
          onClick={() => onStatus(statusFilter === "active" ? "all" : "active")}
        />
        <Metric
          icon={Sparkles}
          label={english ? "Demo and trial" : "Demo y prueba"}
          value={String(demoAndTrialAccounts)}
          caption={english ? "Temporary access" : "Acceso temporal"}
          accent="blue"
          active={statusFilter === "temporary"}
          actionLabel={english ? "Filter demo and trial accounts" : "Filtrar cuentas demo y prueba"}
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
        onEditType={onEditType}
        onAssignDistributor={onAssignDistributor}
        onExtendTrial={onExtendTrial}
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
  onOpenCompany,
}: {
  english: boolean;
  data: PlatformBilling | null;
  onOpenCompany: (company: number) => void;
}) {
  const [sort, setSort] = useState<{
    key: BillingSortKey;
    direction: SortDirection;
  }>({ key: "period", direction: "desc" });
  const totals = data?.totals;
  const invoices = useMemo(() => {
    const rows = data?.invoices ?? [];
    if (!sort.direction) return rows;
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort(
      (left, right) => compareInvoiceValues(left, right, sort.key) * direction,
    );
  }, [data?.invoices, sort]);
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
  return (
    <div className="space-y-5">
      <IndiceTitleBar
        tone="blue"
        icon={<CreditCard className="h-5 w-5" />}
        eyebrow={english ? "Billing" : "Facturación"}
        title={english ? "Payments and documents" : "Cobros y documentos"}
        subtitle={
          english
            ? "Stripe remains the payment authority; this view shows synchronized operational status."
            : "Stripe conserva la autoridad de pago; aquí consultas el estado operativo sincronizado."
        }
      />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={CircleDollarSign}
          label={english ? "Total collected" : "Total cobrado"}
          value={formatMoney(totals?.paid_cents, totals?.currency, english)}
          accent="mint"
        />
        <Metric
          icon={FileClock}
          label={english ? "Open balance" : "Saldo abierto"}
          value={formatMoney(totals?.open_cents, totals?.currency, english)}
          accent="gold"
        />
        <Metric
          icon={CircleAlert}
          label={
            english
              ? "Documents requiring attention"
              : "Documentos con atención"
          }
          value={String(totals?.failed ?? 0)}
          accent="coral"
        />
        <Metric
          icon={CreditCard}
          label={english ? "Synchronized invoices" : "Facturas sincronizadas"}
          value={String(totals?.invoices ?? 0)}
          accent="blue"
        />
      </section>
      <Panel
        title={english ? "Billing history" : "Historial de facturación"}
        description={
          english
            ? "Collected and pending amounts with official Stripe links."
            : "Importes cobrados, pendientes y enlaces oficiales de Stripe."
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                {(
                  [
                    ["customer", english ? "Customer" : "Cliente"],
                    ["invoice", english ? "Invoice" : "Factura"],
                    ["status", english ? "Status" : "Estado"],
                    ["amount", english ? "Amount" : "Importe"],
                    ["paid", english ? "Paid" : "Pagado"],
                    ["period", english ? "Period" : "Periodo"],
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
                  {english ? "Documents" : "Documentos"}
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
                        english
                          ? "No invoices have been synchronized in this environment yet."
                          : "Aún no hay facturas sincronizadas en este entorno."
                      }
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
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
              {invoice.owner_email || "Sin correo propietario"}
            </p>
          </button>
        ) : (
          "Sin asociar"
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
        {formatMoney(invoice.amount_due_cents, invoice.currency)}
      </td>
      <td className={tableCellClass}>
        {formatMoney(invoice.amount_paid_cents, invoice.currency)}
      </td>
      <td className={tableCellClass}>
        <p>{formatDate(invoice.period_starts_at)}</p>
        <p className="text-xs text-slate-500">
          a {formatDate(invoice.period_ends_at)}
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
              aria-label="Abrir factura"
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
              aria-label="Descargar PDF"
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
        title={`${label} · ${activeDirection ?? "sort"}`}
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

function compareInvoiceValues(
  left: PlatformInvoice,
  right: PlatformInvoice,
  key: BillingSortKey,
) {
  const text = (a: string | null | undefined, b: string | null | undefined) =>
    (a || "").localeCompare(b || "", undefined, {
      numeric: true,
      sensitivity: "base",
    });
  const number = (a: number | null | undefined, b: number | null | undefined) =>
    (a ?? 0) - (b ?? 0);
  const date = (value: string | null | undefined) =>
    value ? new Date(value).getTime() || 0 : 0;
  switch (key) {
    case "customer":
      return text(
        left.company_name || left.owner_email,
        right.company_name || right.owner_email,
      );
    case "invoice":
      return text(left.invoice_id, right.invoice_id);
    case "status":
      return text(left.status, right.status);
    case "amount":
      return number(left.amount_due_cents, right.amount_due_cents);
    case "paid":
      return number(left.amount_paid_cents, right.amount_paid_cents);
    case "period":
      return number(
        date(left.period_ends_at || left.updated_at),
        date(right.period_ends_at || right.updated_at),
      );
  }
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

const humanizeCatalogCode = (value: string) => {
  const normalized = value
    .replace(/^(addon|base|plan|price)_/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  return normalized
    ? normalized.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase())
    : "Producto";
};

const catalogPriceTypeLabel = (value: string, english: boolean) => {
  if (value === "ADDON") return english ? "Add-on" : "Complemento";
  if (["BASE", "PACKAGE", "PLAN"].includes(value)) {
    return english ? "Package" : "Paquete";
  }
  return humanizeCatalogCode(value);
};

function catalogPriceBusinessName(
  price: PlatformCatalogPrice,
  products: PlatformCatalogProduct[],
) {
  const product = products.find(
    (candidate) =>
      candidate.id === price.catalog_product_id ||
      candidate.product_code === price.billable_code,
  );
  return (
    product?.display_name ||
    offerLabels[price.billable_code] ||
    humanizeCatalogCode(price.billable_code)
  );
}

function buildCatalogPriceGroups(
  prices: PlatformCatalogPrice[],
  products: PlatformCatalogProduct[],
) {
  const grouped = new Map<string, CatalogPriceGroup>();
  prices.forEach((price) => {
    const key = `${price.billable_code}:${price.price_type}:${price.currency}`;
    const current = grouped.get(key) || {
      key,
      name: catalogPriceBusinessName(price, products),
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
  saving,
  onCatalogChange,
  onModuleChange,
}: {
  english: boolean;
  catalog: PlatformCatalog | null;
  modules: PlatformModules | null;
  canManage: boolean;
  saving: boolean;
  onCatalogChange: (data: PlatformCatalog) => void;
  onModuleChange: (change: ModuleAvailabilityChange) => void;
}) {
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
  const [catalogValidation, setCatalogValidation] =
    useState<PlatformCatalogValidation | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const draftVersion = catalog?.versions.find(
    (version) => version.status === "DRAFT",
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
        message: english
          ? `${result.products_created} products and ${result.prices_created} prices were added to the commercial catalog.`
          : `${result.products_created} producto(s) y ${result.prices_created} precio(s) se incorporaron al catálogo comercial.`,
      });
    } catch (syncError) {
      setSyncFeedback({
        type: "error",
        message:
          syncError instanceof Error
            ? syncError.message
            : english
              ? "The commercial catalog could not be updated."
              : "No se pudo actualizar el catálogo comercial.",
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
        message: english
          ? `${draft.version_code} is ready for controlled changes.`
          : `${draft.version_code} está lista para cambios controlados.`,
      });
    } catch (workflowError) {
      setSyncFeedback({
        type: "error",
        message:
          workflowError instanceof Error
            ? workflowError.message
            : english
              ? "The working version could not be prepared."
              : "No se pudo preparar la versión de trabajo.",
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
          ? english
            ? `The offer is complete and remotely verified in Stripe ${validation.stripe_mode}.`
            : `La oferta está completa y verificada remotamente en Stripe ${validation.stripe_mode}.`
          : english
            ? `${validation.blockers.length} item(s) must be completed before publishing.`
            : `Falta completar ${validation.blockers.length} pendiente(s) antes de publicar.`,
      });
    } catch (workflowError) {
      setSyncFeedback({
        type: "error",
        message:
          workflowError instanceof Error
            ? workflowError.message
            : english
              ? "The offer could not be validated."
              : "No se pudo validar la oferta.",
      });
    } finally {
      setCatalogWorkflowBusy(false);
    }
  };

  const publishCatalogDraft = async () => {
    if (!draftVersion || !catalogValidation?.ready || catalogWorkflowBusy) return;
    setCatalogWorkflowBusy(true);
    setSyncFeedback(null);
    try {
      const published = await platformAdminApi.publishCatalogDraft(
        draftVersion.id,
      );
      onCatalogChange(await platformAdminApi.getCatalog());
      setCatalogValidation(null);
      setSyncFeedback({
        type: "success",
        message: english
          ? `${published.version_code} is now the active offer. Existing customers keep their agreed version.`
          : `${published.version_code} ya es la oferta activa. Los clientes existentes conservan la versión acordada.`,
      });
    } catch (workflowError) {
      setSyncFeedback({
        type: "error",
        message:
          workflowError instanceof Error
            ? workflowError.message
            : english
              ? "The offer could not be published."
              : "No se pudo publicar la oferta.",
      });
    } finally {
      setCatalogWorkflowBusy(false);
    }
  };

  const workspaceTabs = [
    {
      id: "offer" as const,
      label: english ? "Commercial offer" : "Oferta comercial",
      description: english ? "Modules, packages, prices and promotions" : "Módulos, paquetes, precios y promociones",
      icon: PackageCheck,
    },
    {
      id: "modules" as const,
      label: english ? "Technical availability" : "Disponibilidad técnica",
      description: english ? "Advanced system control" : "Control avanzado del sistema",
      icon: Boxes,
    },
  ];

  return (
    <div className="space-y-5">
      <IndiceTitleBar
        tone="aqua"
        icon={<Boxes className="h-5 w-5" />}
        title={english ? "Catalog and modules" : "Catálogo y módulos"}
        subtitle={
          english
            ? "Decide what Indice offers, group it into products and define the amount customers will pay."
            : "Decide qué ofrece Índice, agrúpalo en productos y define el importe que pagarán los clientes."
        }
        actions={
          <button
            type="button"
            disabled={syncing}
            onClick={() => void synchronizeComplementaries()}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#59C3A5]/35 bg-white px-4 text-sm font-medium text-[#176B5B] shadow-sm transition hover:bg-[#59C3A5]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/25 disabled:opacity-60 dark:bg-slate-900 dark:text-[#8FE0CA]"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {english ? "Sync add-ons" : "Sincronizar complementos"}
          </button>
        }
      />

      {syncFeedback ? (
        <div role={syncFeedback.type === "success" ? "status" : "alert"} className={`rounded-xl border px-4 py-3 text-sm font-medium ${syncFeedback.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {syncFeedback.message}
        </div>
      ) : null}

      <IndiceWorkspaceNavigation<CatalogWorkspaceView>
        ariaLabel={english ? "Catalog workflow" : "Flujo de catálogo"}
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
                    ? english
                      ? "You have unpublished changes"
                      : "Tienes cambios sin publicar"
                    : english
                      ? "Active offer"
                      : "Oferta activa"}
                </h2>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
                  {english ? "Test mode" : "Modo de prueba"}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {draftVersion
                  ? english
                    ? "Customers will keep seeing the current offer until you publish these changes."
                    : "Los clientes seguirán viendo la oferta actual hasta que publiques estos cambios."
                  : english
                    ? "Customers and Billing use this offer."
                    : "Clientes y Facturación utilizan esta oferta."}
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
                {english ? "Prepare changes" : "Preparar cambios"}
              </button>
            </div>
          ) : null}
        </div>
        {catalogValidation && !catalogValidation.ready ? (
          <div className="border-t border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-xs font-semibold text-amber-900">
              {english ? "Complete before publishing:" : "Completa antes de publicar:"}
            </p>
            <ul className="mt-2 grid gap-1 text-xs text-amber-800 md:grid-cols-2">
              {catalogValidation.blockers.map((blocker, index) => (
                <li key={`${blocker.code}-${blocker.product_code}-${index}`} className="flex gap-2">
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{blocker.message}</span>
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
              {english ? "Unpublished changes" : "Cambios sin publicar"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {english ? "Validate the offer before publishing it." : "Valida la oferta antes de publicarla."}
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
              {english ? "Validate offer" : "Validar oferta"}
            </button>
            <button
              type="button"
              disabled={!canManage || catalogWorkflowBusy || !catalogValidation?.ready}
              onClick={() => void publishCatalogDraft()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white hover:bg-[#126653] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              <BadgeCheck className="h-4 w-4" />
              {english ? "Publish offer" : "Publicar oferta"}
            </button>
          </div>
        </div>
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
    () => buildCatalogPriceGroups(versionPrices, products),
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
      concept: english ? "Item" : "Concepto",
      monthly: english ? "Monthly" : "Mensual",
      status: english ? "Sales status" : "Estado de venta",
      type: english ? "Type" : "Tipo",
      yearly: english ? "Annual" : "Anual",
    }),
    [english],
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
        resizeLabel: english
          ? `Resize ${priceColumnLabels[columnId]} column`
          : `Ajustar columna ${priceColumnLabels[columnId]}`,
      })),
    [english, priceColumnLabels, priceColumnWidths],
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
        message: english
          ? "The change was saved in the working version. Validate and publish it when the offer is complete."
          : "El cambio se guardó en la versión de trabajo. Valídala y publícala cuando la oferta esté completa.",
      });
    } catch (saveError) {
      setCatalogFeedback({
        type: "error",
        message:
          saveError instanceof Error
            ? saveError.message
            : english
              ? "The catalog could not be updated."
              : "No se pudo actualizar el catálogo.",
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
                {english ? "Products customers can select" : "Productos que puede elegir el cliente"}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {english
                  ? "Review packages and add-ons, and complete any product still missing a price."
                  : "Revisa paquetes y complementos, y completa los productos que aún no tienen precio."}
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
              {english ? "New package" : "Nuevo paquete"}
            </button>
          </div>
          <section
            aria-label={english ? "Product indicators" : "Indicadores de productos"}
            className="mb-4 grid gap-3 md:grid-cols-3"
          >
            <Metric
              icon={PackageCheck}
              label={english ? "Active products" : "Productos activos"}
              value={String(productSummary.activeProducts)}
              accent="mint"
            />
            <Metric
              icon={CircleAlert}
              label={english ? "Products missing prices" : "Productos sin precio"}
              value={String(productSummary.productsWithoutRates)}
              accent="gold"
            />
            <Metric
              icon={Boxes}
              label={english ? "Linked capabilities" : "Capacidades vinculadas"}
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
              title={english ? "Products and packages" : "Productos y paquetes"}
            >
              <EmptyRow
                icon={PackageCheck}
                text={
                  english
                    ? "No products in this version."
                    : "No hay productos en esta versión."
                }
              />
            </Panel>
          )}
        </section>
      ) : (
        <div className="space-y-4">
          <IndiceFilterBar
            title={
              english ? "Filters" : "Filtros"
            }
            subtitle={
              english
                ? "Find a product and focus on what is ready to sell."
                : "Encuentra un producto y enfócate en lo que está listo para vender."
            }
            summary={
              english
                ? `${prices.length} matching products`
                : `${prices.length} productos coinciden`
            }
            gridClassName="md:grid-cols-3"
          >
            <IndiceFilterSearch
              label={english ? "Search" : "Buscar"}
              placeholder={
                english
                  ? "Product or offer"
                  : "Producto u oferta"
              }
              tone="aqua"
              value={priceQuery}
              onValueChange={setPriceQuery}
              onClear={() => setPriceQuery("")}
            />
            <IndiceFilterSelect
              label={english ? "Type" : "Tipo"}
              tone="aqua"
              value={priceTypeFilter}
              onValueChange={setPriceTypeFilter}
              options={[
                {
                  value: "all",
                  label: english ? "All types" : "Todos los tipos",
                },
                ...Array.from(
                  new Set(versionPrices.map((price) => price.price_type)),
                ).map((value) => ({
                  value,
                  label: catalogPriceTypeLabel(value, english),
                })),
              ]}
            />
            <IndiceFilterSelect
              label={english ? "Sales status" : "Estado de venta"}
              tone="aqua"
              value={priceStatusFilter}
              onValueChange={setPriceStatusFilter}
              options={[
                {
                  value: "all",
                  label: english ? "All" : "Todos",
                },
                {
                  value: "ready",
                  label: english ? "Ready to sell" : "Listos para vender",
                },
                {
                  value: "review",
                  label: english ? "Require attention" : "Requieren atención",
                },
                {
                  value: "inactive",
                  label: english ? "Inactive" : "Inactivos",
                },
              ]}
            />
          </IndiceFilterBar>
          <section
            aria-label={english ? "Commercial price status" : "Estado de precios comerciales"}
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <CatalogStatusMetric
              active={priceStatusFilter === "all"}
              icon={CircleDollarSign}
              label={english ? "Commercial products" : "Productos comerciales"}
              value={priceStatusCounts.all}
              tone="aqua"
              onClick={() => setPriceStatusFilter("all")}
            />
            <CatalogStatusMetric
              active={priceStatusFilter === "review"}
              icon={CircleAlert}
              label={english ? "Require attention" : "Requieren atención"}
              value={priceStatusCounts.review}
              tone="warning"
              onClick={() => setPriceStatusFilter("review")}
            />
            <CatalogStatusMetric
              active={priceStatusFilter === "ready"}
              icon={BadgeCheck}
              label={english ? "Ready to sell" : "Listos para vender"}
              value={priceStatusCounts.ready}
              tone="success"
              onClick={() => setPriceStatusFilter("ready")}
            />
            <CatalogStatusMetric
              active={priceStatusFilter === "inactive"}
              icon={Activity}
              label={english ? "Inactive" : "Inactivos"}
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
                itemLabel={english ? "products" : "productos"}
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
                  label: english ? "Actions" : "Acciones",
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
                          english
                            ? "No products match the selected filters."
                            : "No hay productos que coincidan con los filtros."
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
        {english
          ? "Price changes apply to new sales. Existing customers and previous invoices keep the conditions already agreed."
          : "Los cambios de precio se aplican a nuevas ventas. Los clientes actuales y las facturas anteriores conservan las condiciones ya acordadas."}
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
  return (
    <TableRow className="border-slate-100 hover:bg-[#59C3A5]/5 dark:border-slate-800 dark:hover:bg-[#59C3A5]/10">
      <TableCell className={`${tableCellClass} h-[72px] dark:text-slate-300`}>
        <p className="font-medium text-slate-900 dark:text-white">
          {group.name}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{group.currency}</p>
      </TableCell>
      <TableCell className={`${tableCellClass} h-[72px] dark:text-slate-300`}>
        {catalogPriceTypeLabel(group.priceType, english)}
      </TableCell>
      <CatalogPriceVariantCell price={group.monthly} english={english} />
      <CatalogPriceVariantCell price={group.yearly} english={english} />
      <TableCell className={`${tableCellClass} h-[72px] dark:text-slate-300`}>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${group.status === "inactive" ? "bg-slate-200 text-slate-600" : group.status === "ready" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}
        >
          {group.status === "inactive"
            ? english
              ? "Inactive"
              : "Inactivo"
            : group.status === "ready"
              ? english
                ? "Ready to sell"
                : "Listo para vender"
              : english
                ? "Needs review"
                : "Requiere revisión"}
        </span>
      </TableCell>
      <TableCell className={`${tableCellClass} h-[72px] text-right dark:text-slate-300`}>
        <IndiceTableActionGroup>
          {group.monthly ? (
            <button
              type="button"
              onClick={() => onEdit(group.monthly!)}
              aria-label={english ? "Edit monthly price" : "Editar precio mensual"}
              title={english ? "Edit monthly price" : "Editar precio mensual"}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#59C3A5]/40 bg-white px-2.5 text-xs font-medium text-[#176B5B] transition hover:bg-[#59C3A5]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/25 dark:bg-slate-900 dark:text-[#8FE0CA]"
            >
              <PencilLine className="h-3.5 w-3.5" />
              {english ? "Monthly" : "Mensual"}
            </button>
          ) : null}
          {group.yearly ? (
            <button
              type="button"
              onClick={() => onEdit(group.yearly!)}
              aria-label={english ? "Edit annual price" : "Editar precio anual"}
              title={english ? "Edit annual price" : "Editar precio anual"}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#59C3A5]/40 bg-white px-2.5 text-xs font-medium text-[#176B5B] transition hover:bg-[#59C3A5]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/25 dark:bg-slate-900 dark:text-[#8FE0CA]"
            >
              <PencilLine className="h-3.5 w-3.5" />
              {english ? "Annual" : "Anual"}
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
  if (!price) {
    return (
      <TableCell className={`${tableCellClass} h-[72px] dark:text-slate-300`}>
        <span className="text-sm text-slate-400">
          {english ? "Not configured" : "No configurado"}
        </span>
      </TableCell>
    );
  }
  const inactive = isInactiveCatalogPrice(price);
  const ready = isReadyCatalogPrice(price);
  return (
    <TableCell className={`${tableCellClass} h-[72px] dark:text-slate-300`}>
      <p className="font-medium text-slate-900 dark:text-white">
        {formatMoney(price.unit_amount_cents, price.currency, english)}
      </p>
      <p
        className={`mt-0.5 text-[11px] font-medium ${inactive ? "text-slate-400" : ready ? "text-emerald-700" : "text-amber-700"}`}
      >
        {inactive
          ? english
            ? "Inactive"
            : "Inactivo"
          : ready
            ? english
              ? "Ready"
              : "Listo"
            : price.unit_amount_cents == null
              ? english
                ? "Missing amount"
                : "Falta importe"
              : english
                ? "Billing connection pending"
                : "Falta conexión de cobro"}
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
      eyebrow={english ? "Commercial catalog" : "Catálogo comercial"}
      title={
        product
          ? product.id <= 0
            ? english ? "Create package" : "Crear paquete"
            : english ? "Configure product" : "Configurar producto"
          : english
            ? "Configure price"
            : "Configurar precio"
      }
      description={
        english
          ? "The saved information becomes available to customer configuration flows."
          : "La información guardada queda disponible en los flujos de configuración de clientes."
      }
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="h-11 rounded-xl border border-white/40 bg-white px-4 text-sm font-medium text-slate-700"
          >
            {english ? "Cancel" : "Cancelar"}
          </button>
          <button
            type="submit"
            disabled={saving}
            form="catalog-edit-form"
            className="h-11 rounded-xl bg-white px-5 text-sm font-medium text-[#177D66] shadow-sm transition hover:bg-[#59C3A5]/10 disabled:cursor-wait disabled:bg-white/45 disabled:text-white/80"
          >
            {saving
              ? english ? "Saving…" : "Guardando…"
              : english ? "Save changes" : "Guardar cambios"}
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
            ? english
              ? "Mark the product as available now. Missing prices or Stripe links will be checked before the offer is published."
              : "Marca el producto como disponible. Las tarifas o conexiones de Stripe pendientes se validarán antes de publicar la oferta."
            : english
              ? "A price is ready to bill when it has an amount and is connected to its Stripe price."
              : "Un precio queda listo para cobrar cuando tiene importe y está conectado con su precio de Stripe."}
        </div>
        {product ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={english ? "Display name" : "Nombre visible"}>
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
            <Field label={english ? "Display order" : "Orden de visualización"}>
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
                {english ? "Included modules" : "Módulos incluidos"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {english
                  ? "These are the modules customers receive when selecting this product."
                  : "Son los módulos que recibe el cliente cuando selecciona este producto."}
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
                  <span className="text-xs text-slate-500">{english ? "No assignable modules available." : "No hay módulos asignables disponibles."}</span>
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
              {english ? "Available for customers" : "Disponible para clientes"}
            </label>
          </div>
        ) : price ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">{english ? "Product" : "Producto"}</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {offerLabels[price.billable_code] || price.billable_code}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{english ? "Type" : "Tipo"}</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {price.price_type === "ADDON"
                    ? english ? "Add-on" : "Complemento"
                    : english ? "Package" : "Paquete"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{english ? "Frequency" : "Periodicidad"}</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {price.billing_interval === "YEAR"
                    ? english ? "Annual" : "Anual"
                    : english ? "Monthly" : "Mensual"}
                </p>
              </div>
            </div>
            <Field label={`${english ? "Amount" : "Importe"} (${price.currency})`}>
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
            <Field label={english ? "Billing readiness" : "Preparación para cobro"}>
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
                <option value="ACTIVE">{english ? "Available to bill" : "Disponible para cobrar"}</option>
                <option value="READY">{english ? "Ready for review" : "Listo para revisión"}</option>
                <option value="DRAFT">{english ? "Draft" : "Borrador"}</option>
                <option value="ARCHIVED">{english ? "Inactive" : "Inactivo"}</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label={english ? "Stripe billing reference" : "Referencia de cobro de Stripe"}>
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
                {english
                  ? "Paste the Price ID created in Stripe to enable automatic billing."
                  : "Pega el Price ID creado en Stripe para habilitar el cobro automático."}
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
              {english ? "Available modules" : "Módulos disponibles"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {english
                ? "Choose which Indice functions can be included in products, trials and customer accounts."
                : "Elige qué funciones de Índice pueden incluirse en productos, pruebas y cuentas de clientes."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#e8f5f2] px-3 py-1.5 text-xs font-medium text-[#177D66]">
              <Activity className="h-4 w-4" />
              {(data?.modules ?? []).filter((module) => module.is_active).length} {english ? "active" : "activos"}
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
          eyebrow={english ? "Commercial availability" : "Disponibilidad comercial"}
          title={english ? "Indice modules" : "Módulos de Índice"}
          subtitle={
            english
              ? "Enable the functions that may be offered to customers and safely remove those no longer available."
              : "Habilita las funciones que pueden ofrecerse a clientes y retira de forma segura las que ya no estén disponibles."
          }
        />
      )}
      {!canManage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {english
            ? "You can review availability, but you do not have permission to change the commercial offer."
            : "Puedes consultar la disponibilidad, pero no tienes permiso para cambiar la oferta comercial."}
        </div>
      ) : null}
      {workOrderError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {workOrderError}
        </div>
      ) : null}
      {workOrdersLoading ? (
        <p className="text-sm text-slate-500">{english ? "Loading module requests…" : "Cargando solicitudes de módulos…"}</p>
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
                      {english ? "Initial language" : "Idioma inicial"}: {operationalLocaleLabels[order.sourceLocale] || order.sourceLocale}
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
  const labels: Record<string, string> = {
    basic: english ? "Base modules" : "Módulos base",
    complementary: english ? "Add-on modules" : "Módulos complementarios",
    ai: english ? "Artificial intelligence" : "Inteligencia artificial",
  };
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-medium text-slate-900 dark:text-white">
            {labels[category] || category}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {modules.length} {english ? "registered modules" : "módulo(s) registrados"}
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {modules.map((module) => {
          const protectedCore = module.is_core;
          const visual = moduleVisual(module);
          const moduleDescription =
            module.description || "Descripción operativa pendiente.";
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
                    ? english
                      ? "Available"
                      : "Disponible"
                    : english
                      ? "Unavailable"
                      : "No disponible"}
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
                      ? english
                        ? "Customer assignable"
                        : "Asignable a clientes"
                      : english
                        ? "Internal use"
                        : "Uso interno"}
                  </MiniTag>
                  {module.is_core ? <MiniTag>{english ? "Indice essential" : "Esencial de Índice"}</MiniTag> : null}
                </div>
              </div>
              <div className="relative mt-2 flex items-center justify-between gap-2 border-t border-slate-200/70 pt-2 text-xs dark:border-slate-700">
                <span className="min-w-0 truncate text-slate-500">
                  {module.is_active
                    ? english
                      ? "Visible in products and accounts"
                      : "Visible en productos y cuentas"
                    : english
                      ? "Hidden from new selections"
                      : "Oculto en nuevas selecciones"}
                </span>
              </div>
              <button
                type="button"
                disabled={!canManage || saving || protectedCore}
                title={
                  protectedCore
                    ? english
                      ? "The Indice essentials are required and cannot be removed."
                      : "El núcleo de Índice es obligatorio y no puede retirarse."
                    : undefined
                }
                onClick={() => onChange({ module, active: !module.is_active })}
                className={`relative mt-2 h-9 w-full rounded-lg border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${protectedCore ? "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800" : module.is_active ? "border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-900 dark:bg-slate-900" : "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"}`}
              >
                {protectedCore
                  ? english
                    ? "Required"
                    : "Obligatorio"
                  : module.is_active
                    ? english
                      ? "Remove from offer"
                      : "Retirar de la oferta"
                    : english
                      ? "Enable for offer"
                      : "Habilitar para la oferta"}
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
          Nuevo acceso
        </button>
        <button
          type="button"
          onClick={() => setView("history")}
          className={`h-10 rounded-lg px-4 text-sm font-semibold ${view === "history" ? "bg-[#2563EB] text-white" : "text-slate-600"}`}
        >
          Códigos emitidos ({catalog?.codes.length ?? 0})
        </button>
      </div>
      {feedback ? (
        <IndiceModalValidation
          messages={[feedback.message]}
          tone={feedback.kind}
          title={
            feedback.kind === "success"
              ? "Acceso generado"
              : "No se pudo generar"
          }
        />
      ) : null}
      <section className="grid gap-5">
        {view === "create" ? (
          <Panel
            title="Nuevo acceso promocional"
            description="El código claro se muestra una sola vez después de generarlo."
          >
            <form onSubmit={onSubmit} className="space-y-4 p-5">
              {createdCode ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-medium text-emerald-800">
                    Código generado. Cópialo ahora.
                  </p>
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
                      Copiar
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nombre interno">
                  <input
                    required
                    value={value.label}
                    onChange={(event) =>
                      onChange({ ...value, label: event.target.value })
                    }
                    className={controlClass}
                    placeholder="Cliente piloto agosto"
                  />
                </Field>
                <Field label="Correo autorizado">
                  <input
                    type="email"
                    value={value.allowed_email || ""}
                    onChange={(event) =>
                      onChange({ ...value, allowed_email: event.target.value })
                    }
                    className={controlClass}
                    placeholder="Opcional, recomendado"
                  />
                </Field>
              </div>
              <fieldset className="rounded-2xl border border-slate-200 p-4">
                <legend className="px-1 text-sm font-medium text-slate-700">
                  Módulos incluidos
                </legend>
                <p className="mb-3 text-xs text-slate-500">
                  Sin selección concede todos los módulos básicos.
                </p>
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
                <Field label="Usuarios extra">
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
                <Field label="Usos máximos">
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
                <Field label="Días de acceso">
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
                        {days} días
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Tipo de acceso">
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
                  <option value="TIMED">Acceso con vigencia</option>
                  <option value="PERMANENT">Acceso permanente</option>
                </select>
              </Field>
              <Field label="Motivo auditable">
                <select
                  required
                  value={reasonSelection}
                  onChange={(event) =>
                    onChange({ ...value, reason: event.target.value })
                  }
                  className={controlClass}
                >
                  <option value="">Selecciona un motivo</option>
                  {accessReasonOptions.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                  <option value="OTHER">Otro motivo</option>
                </select>
              </Field>
              {reasonSelection === "OTHER" ? (
                <Field label="Describe el motivo">
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
              <Field label="Campaña">
                <input
                  value={value.campaign_code || ""}
                  onChange={(event) =>
                    onChange({ ...value, campaign_code: event.target.value })
                  }
                  className={controlClass}
                  placeholder="Opcional"
                />
              </Field>
              <button
                disabled={saving}
                className="h-11 w-full rounded-xl bg-[#177D66] text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Generando..." : "Generar código seguro"}
              </button>
            </form>
          </Panel>
        ) : (
          <Panel
            title="Códigos emitidos"
            description="Vigencia, redenciones y restricción de correo."
          >
            <div className="max-h-[760px] divide-y divide-slate-100 overflow-y-auto">
              {catalog?.codes.map((item) => (
                <article key={item.reference} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.label}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.allowed_email || "Sin correo restringido"}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {item.all_basic_products
                      ? "Todos los módulos básicos"
                      : item.product_codes.join(", ")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <MiniTag>
                      {item.redemption_count}/{item.max_redemptions} usos
                    </MiniTag>
                    <MiniTag>
                      {item.permanent
                        ? "Permanente"
                        : `${item.access_days} días`}
                    </MiniTag>
                    <MiniTag>
                      {item.included_extra_seats} usuarios extra
                    </MiniTag>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">{item.reason}</p>
                  {item.status === "ACTIVE" ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => onRevoke(item.reference)}
                      className="mt-3 text-xs font-medium text-red-600"
                    >
                      Revocar código
                    </button>
                  ) : null}
                </article>
              ))}
              {!catalog?.codes.length ? (
                <EmptyRow icon={KeyRound} text="Aún no hay códigos emitidos." />
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
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle de ${company.name}`}
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
                  {company.owner_email || "Propietario pendiente"} · Company #
                  {company.id}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SmallMetric
              label="Plan"
              value={
                offerLabels[company.offer_code || ""] ||
                company.offer_code ||
                "Sin plan"
              }
            />
            <SmallMetric
              label="Estado de acceso"
              value={humanize(
                company.access_mode || company.lifecycle_state || "legacy",
              )}
            />
            <SmallMetric
              label="Usuarios"
              value={`${company.seat_usage.active ?? 0} / ${(company.seat_usage.included ?? 0) + (company.seat_usage.purchased_extra ?? 0) + (company.seat_usage.courtesy_extra ?? 0)}`}
            />
            <SmallMetric
              label="Próxima renovación"
              value={formatDate(
                company.billing_status === "trialing"
                  ? company.trial_ends_at
                  : company.current_period_ends_at,
              )}
            />
          </section>
          <Panel
            title="Productos contratados"
            description="Selección asociada a la suscripción más reciente."
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
                  Esta cuenta todavía no tiene productos de catálogo asociados.
                </p>
              ) : null}
            </div>
          </Panel>
          <section className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="Usuarios de la cuenta"
              description={`${company.members.length} membresía(s) registradas.`}
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
              title="Facturas recientes"
              description="Últimos documentos asociados a la compañía."
            >
              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                {company.invoices.map((invoice) => (
                  <div
                    key={invoice.invoice_id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {formatMoney(
                          invoice.amount_due_cents,
                          invoice.currency,
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(invoice.period_ends_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={invoice.status || "unknown"} />
                      {invoice.hosted_invoice_url ? (
                        <a
                          href={invoice.hosted_invoice_url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Abrir factura"
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
                    text="Sin facturas sincronizadas."
                  />
                ) : null}
              </div>
            </Panel>
          </section>
          {company.storage_usage?.metered ? (
            <Panel
              title="Almacenamiento"
              description="Uso medido y capacidad asignada a la cuenta."
            >
              <div className="grid grid-cols-3 gap-3 p-5">
                <SmallMetric
                  label="Usado"
                  value={`${toGigabytes(company.storage_usage.used_bytes + company.storage_usage.reserved_bytes)} GB`}
                />
                <SmallMetric
                  label="Límite"
                  value={`${toGigabytes(company.storage_usage.limit_bytes)} GB`}
                />
                <SmallMetric
                  label="Bloques extra"
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
              title="Otorgar beneficio"
              description="Separado de la suscripción y registrado en auditoría."
            >
              <form onSubmit={onSubmitBenefit} className="space-y-3 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Tipo">
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
                      <option value="PRODUCT">Módulo</option>
                      <option value="SEAT">Usuarios</option>
                      <option value="STORAGE">Almacenamiento</option>
                    </select>
                  </Field>
                  <Field label="Origen">
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
                      <option value="COURTESY">Cortesía</option>
                      <option value="PROMOTION">Promoción</option>
                      <option value="SUPPORT">Soporte</option>
                      <option value="TEST">Prueba</option>
                    </select>
                  </Field>
                </div>
                {benefit.benefit_type === "PRODUCT" ? (
                  <Field label="Código de producto">
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
                  <Field label="Cantidad">
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
                <Field label="Motivo">
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
                  <Field label="Campaña">
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
                  <Field label="Vigencia hasta">
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
                  {saving ? "Guardando..." : "Otorgar beneficio"}
                </button>
              </form>
            </Panel>
          ) : null}
          <Panel
            title="Historial de beneficios"
            description="Cortesías, promociones y apoyos activos o revocados."
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
                        {item.campaign_code || "Sin campaña"}
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
                      Revocar beneficio
                    </button>
                  ) : null}
                </article>
              ))}
              {!company.benefits.length ? (
                <EmptyRow icon={Gift} text="Esta cuenta no tiene beneficios." />
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
  saving,
  onReason,
  onCancel,
  onConfirm,
}: {
  change: NonNullable<ModuleAvailabilityChange>;
  reason: string;
  saving: boolean;
  onReason: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
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
            ? "Habilitar módulo en la oferta"
            : "Retirar módulo de la oferta"}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {activating ? (
            <>
              <strong className="font-medium text-slate-900">
                {change.module.name}
              </strong>{" "}
              volverá a estar disponible en productos, pruebas y nuevas cuentas.
            </>
          ) : (
            <>
              <strong className="font-medium text-slate-900">
                {change.module.name}
              </strong>{" "}
              dejará de ofrecerse en productos y nuevas cuentas. Los datos y
              asignaciones existentes se conservarán para una futura reactivación.
            </>
          )}
        </p>
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${activating ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}
        >
          {activating
            ? "Después de habilitarlo, revisa Productos y paquetes para decidir cómo se venderá."
            : "Este cambio afecta la oferta general. Revisa los clientes actuales antes de confirmar."}
        </div>
        <Field label="Motivo de auditoría">
          <select
            autoFocus
            required
            value={reasonSelection}
            onChange={(event) => onReason(event.target.value)}
            className={`${controlClass} mt-4`}
          >
            <option value="">Selecciona un motivo</option>
            {moduleAvailabilityReasonOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            <option value="OTHER">Otro motivo</option>
          </select>
        </Field>
        {reasonSelection === "OTHER" ? (
          <Field label="Describe el motivo">
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
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving || reason === "OTHER" || reason.trim().length < 3}
            onClick={onConfirm}
            className={`h-11 rounded-xl px-4 text-sm font-medium text-white disabled:opacity-50 ${activating ? "bg-emerald-600" : "bg-red-600"}`}
          >
            {saving
              ? "Aplicando..."
              : activating
                ? "Habilitar módulo"
                : "Retirar de la oferta"}
          </button>
        </div>
      </section>
    </div>
  );
}

function ConfirmModal({
  revocation,
  reason,
  saving,
  onReason,
  onCancel,
  onConfirm,
}: {
  revocation: NonNullable<Revocation>;
  reason: string;
  saving: boolean;
  onReason: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isProduct = revocation.kind === "benefit" && Boolean(revocation.label);
  const presetReason = revocationReasonOptions.includes(
    reason as (typeof revocationReasonOptions)[number],
  );
  const reasonSelection = presetReason ? reason : reason ? "OTHER" : "";
  const duplicateMessage =
    isProduct && (revocation.grantCount ?? 0) > 1
      ? ` Se consolidarán y revocarán las ${revocation.grantCount} concesiones activas encontradas.`
      : "";
  return (
    <IndiceConfirmationDialog
      busy={saving}
      confirmDisabled={reason === "OTHER" || reason.trim().length < 3}
      confirmLabel={
        saving ? "Aplicando..." : isProduct ? "Quitar acceso" : "Revocar"
      }
      description={
        isProduct
          ? `El módulo dejará de estar disponible para esta cuenta.${duplicateMessage}`
          : "La cortesía dejará de estar disponible y la acción quedará registrada en auditoría."
      }
      destructive
      icon={<CircleAlert className="h-5 w-5" />}
      itemName={revocation.label || revocation.reference}
      onCancel={onCancel}
      onConfirm={onConfirm}
      open
      title={
        isProduct
          ? `Quitar acceso a ${revocation.label}`
          : "Confirmar revocación"
      }
      tone="blue"
    >
      <Field label="Motivo de auditoría">
        <select
          autoFocus
          required
          value={reasonSelection}
          onChange={(event) => onReason(event.target.value)}
          className={controlClass}
        >
          <option value="">Selecciona un motivo</option>
          {revocationReasonOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
          <option value="OTHER">Otro motivo</option>
        </select>
      </Field>
      {reasonSelection === "OTHER" ? (
        <Field label="Describe el motivo">
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
  return (
    <label className="block space-y-1.5 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}
function MiniTag({ children }: { children: ReactNode }) {
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
      title={status}
    >
      {statusLabel(status)}
    </span>
  );
}
function EmptyRow({ icon: Icon, text }: { icon: typeof Users; text: string }) {
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
  return (
    <div className="flex min-h-[45vh] items-center justify-center gap-3 text-sm text-slate-500">
      <LoaderCircle className="h-5 w-5 animate-spin text-[#177D66]" /> Cargando
      operación de plataforma...
    </div>
  );
}
function PermissionState() {
  return (
    <div className="grid min-h-[45vh] place-items-center">
      <div className="text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-slate-400" />
        <h2 className="mt-3 text-lg font-medium">Acceso de consulta</h2>
        <p className="mt-1 text-sm text-slate-500">
          Tu rol no permite administrar beneficios.
        </p>
      </div>
    </div>
  );
}

function formatMoney(value?: number | null, currency = "USD", english = false) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat(english ? "en-CA" : "es-MX", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);
}
function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}
function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}
function statusLabel(value?: string | null) {
  if (!value) return "Sin estado";
  const labels: Record<string, string> = {
    active: "Activa",
    trial: "Prueba",
    demo: "Demo",
    trialing: "En prueba",
    paid: "Pagada",
    open: "Abierta",
    past_due: "Pago pendiente",
    unpaid: "Sin pagar",
    canceled: "Cancelada",
    cancelled: "Cancelada",
    revoked: "Revocada",
    success: "Correcto",
    failed: "Fallido",
    released: "Publicado",
    legacy: "Legacy",
    inactive: "Inactivo",
    unknown: "Desconocido",
    "sin movimientos": "Sin movimientos",
  };
  return labels[value.toLowerCase()] || humanize(value);
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
function environmentLabel() {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1")
    return { label: "Local", className: "bg-blue-50 text-[#143675]" };
  if (hostname.includes("apptest"))
    return { label: "Pruebas", className: "bg-amber-50 text-amber-700" };
  return { label: "Producción", className: "bg-emerald-50 text-emerald-700" };
}
