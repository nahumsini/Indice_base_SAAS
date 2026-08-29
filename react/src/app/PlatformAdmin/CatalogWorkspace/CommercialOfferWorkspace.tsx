import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  BadgePercent,
  Boxes,
  Eye,
  Gift,
  PackageCheck,
  Pencil,
  Plus,
  UserPlus,
  X,
} from "lucide-react";
import type {
  PlatformCatalog,
  PlatformCatalogProduct,
  PlatformCatalogPromotion,
  PlatformModule,
} from "../../api/platformAdmin";
import {
  IndiceFilterBar,
  IndiceFilterSearch,
  IndiceFilterSelect,
} from "../../components/frontend-os";
import { IndiceModalFrame } from "../../components/indice-modal";
import {
  getIndiceTableMinimumWidth,
  IndiceOperationalTable,
  IndiceTableActionGroup,
  IndiceTableColGroup,
  IndiceTableHeaderRow,
  IndiceTableShell,
  type IndiceTableColumnDefinition,
} from "../../components/table/IndiceTableEngine";
import { TableBody, TableCell, TableRow } from "../../components/ui/table";
import { usePersistentColumnWidths } from "../../hooks/usePersistentColumnWidths";
import { useLanguage } from "../../shared/context";
import { CommercialOfferDetail } from "./CommercialOfferDetail";

type OfferFilter = "ALL" | "MODULE" | "PACKAGE" | "SEAT" | "PROMOTION";
type AvailabilityFilter = "ALL" | "ACTIVE" | "INACTIVE";
type ConfigurationFilter = "ALL" | "READY" | "CONFIGURATION_PENDING" | "STRIPE_PENDING";
type OfferColumnId = "offer" | "type" | "monthly" | "annual" | "configuration" | "availability";
type Selection =
  | { type: "product"; id: number }
  | { type: "promotion"; id: number }
  | { type: "new-package" }
  | { type: "new-promotion" };

export type CommercialOfferEditorSection = "details" | "pricing" | "availability";

const offerColumnDefaults: Record<OfferColumnId, number> = {
  offer: 280,
  type: 150,
  monthly: 130,
  annual: 130,
  configuration: 180,
  availability: 150,
};

const offerColumnMinimums: Record<OfferColumnId, number> = {
  offer: 240,
  type: 150,
  monthly: 130,
  annual: 130,
  configuration: 180,
  availability: 150,
};

const offerColumnMaximums: Record<OfferColumnId, number> = {
  offer: 440,
  type: 260,
  monthly: 220,
  annual: 220,
  configuration: 280,
  availability: 240,
};

const offerActionsWidth = 168;

const money = (cents?: number | null, english = false) =>
  cents == null
    ? (english ? "Price pending" : "Precio pendiente")
    : new Intl.NumberFormat(english ? "en-CA" : "es-MX", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(cents / 100);

const kindLabel = (kind?: string, english = false) => {
  if (kind === "PACKAGE") return english ? "Package" : "Paquete";
  if (kind === "SEAT") return english ? "Quantity product" : "Por cantidad";
  return english ? "Individual module" : "Módulo individual";
};

export function CommercialOfferWorkspace({
  catalog,
  modules,
  canManage,
  onChange,
}: {
  catalog: PlatformCatalog | null;
  modules: PlatformModule[];
  canManage: boolean;
  onChange: (catalog: PlatformCatalog) => void;
}) {
  const { currentLanguage } = useLanguage();
  const english = currentLanguage.code.startsWith("en");
  const [filter, setFilter] = useState<OfferFilter>("ALL");
  const [availability, setAvailability] = useState<AvailabilityFilter>("ALL");
  const [configuration, setConfiguration] = useState<ConfigurationFilter>("ALL");
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [editorSection, setEditorSection] = useState<CommercialOfferEditorSection>("details");
  const workingVersion =
    catalog?.versions.find((version) => version.status === "DRAFT") ||
    catalog?.versions.find((version) => version.status === "ACTIVE") ||
    catalog?.versions[0];
  const editable = workingVersion?.status === "DRAFT" && canManage;
  const products = useMemo(
    () =>
      (catalog?.products ?? []).filter(
        (product) =>
          product.catalog_version_id === workingVersion?.id &&
          product.commercial_kind !== "CORE" &&
          product.product_type.toUpperCase() !== "CORE",
      ),
    [catalog?.products, workingVersion?.id],
  );
  const promotions = useMemo(
    () =>
      (catalog?.promotions ?? []).filter(
        (promotion) => promotion.catalog_version_id === workingVersion?.id,
      ),
    [catalog?.promotions, workingVersion?.id],
  );

  const priceFor = (product: PlatformCatalogProduct, interval: "MONTH" | "YEAR") =>
    catalog?.prices.find(
      (price) =>
        price.catalog_version_id === workingVersion?.id &&
        price.catalog_product_id === product.id &&
        price.billing_interval === interval,
    );

  const productConfiguration = (product: PlatformCatalogProduct): Exclude<ConfigurationFilter, "ALL"> => {
    const monthly = priceFor(product, "MONTH");
    const annual = priceFor(product, "YEAR");
    if (monthly?.unit_amount_cents == null || annual?.unit_amount_cents == null) {
      return "CONFIGURATION_PENDING";
    }
    if (
      !monthly.external_price_id?.trim() || !annual.external_price_id?.trim()
      || monthly.stripe_sync_status !== "READY" || annual.stripe_sync_status !== "READY"
      || product.stripe_sync_status !== "READY"
    ) {
      return "STRIPE_PENDING";
    }
    return "READY";
  };

  const promotionConfiguration = (promotion: PlatformCatalogPromotion): Exclude<ConfigurationFilter, "ALL"> => {
    const hasDiscount = promotion.discount_type === "PERCENT"
      ? (promotion.percent_basis_points ?? 0) > 0
      : (promotion.amount_off_cents ?? 0) > 0;
    if (!hasDiscount) return "CONFIGURATION_PENDING";
    if (!promotion.external_promotion_code_id?.trim() || promotion.stripe_sync_status !== "READY") return "STRIPE_PENDING";
    return "READY";
  };

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const queryProducts = products.filter((product) =>
    !normalizedQuery || [product.display_name, product.product_code, product.description]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase().includes(normalizedQuery)),
  );
  const queryPromotions = promotions.filter((promotion) =>
    !normalizedQuery || [promotion.display_name, promotion.promotion_code, promotion.description]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase().includes(normalizedQuery)),
  );
  const visibleProducts = queryProducts.filter((product) => {
    const matchesKind = filter === "ALL" || filter === product.commercial_kind;
    const matchesAvailability = availability === "ALL" || (availability === "ACTIVE" ? product.active : !product.active);
    const matchesConfiguration = configuration === "ALL" || configuration === productConfiguration(product);
    return matchesKind && matchesAvailability && matchesConfiguration;
  });
  const visiblePromotions = queryPromotions.filter((promotion) => {
    const matchesKind = filter === "ALL" || filter === "PROMOTION";
    const matchesAvailability = availability === "ALL" || (availability === "ACTIVE" ? promotion.active : !promotion.active);
    const matchesConfiguration = configuration === "ALL" || configuration === promotionConfiguration(promotion);
    return matchesKind && matchesAvailability && matchesConfiguration;
  });
  const allQueryItems = [...queryProducts, ...queryPromotions];
  const counts = {
    total: allQueryItems.length,
    active: allQueryItems.filter((item) => item.active).length,
    inactive: allQueryItems.filter((item) => !item.active).length,
    modules: queryProducts.filter((product) => product.commercial_kind === "MODULE").length,
    packages: queryProducts.filter((product) => product.commercial_kind === "PACKAGE").length,
    seats: queryProducts.filter((product) => product.commercial_kind === "SEAT").length,
    promotions: queryPromotions.length,
    ready:
      queryProducts.filter((product) => productConfiguration(product) === "READY").length +
      queryPromotions.filter((promotion) => promotionConfiguration(promotion) === "READY").length,
    configurationPending:
      queryProducts.filter((product) => productConfiguration(product) === "CONFIGURATION_PENDING").length +
      queryPromotions.filter((promotion) => promotionConfiguration(promotion) === "CONFIGURATION_PENDING").length,
    stripePending:
      queryProducts.filter((product) => productConfiguration(product) === "STRIPE_PENDING").length +
      queryPromotions.filter((promotion) => promotionConfiguration(promotion) === "STRIPE_PENDING").length,
  };
  const hasActiveFilters = Boolean(query || filter !== "ALL" || availability !== "ALL" || configuration !== "ALL");
  const clearFilters = () => {
    setQuery("");
    setFilter("ALL");
    setAvailability("ALL");
    setConfiguration("ALL");
  };

  const selectedProduct =
    selection?.type === "product"
      ? products.find((product) => product.id === selection.id) ?? null
      : null;
  const selectedPromotion =
    selection?.type === "promotion"
      ? promotions.find((promotion) => promotion.id === selection.id) ?? null
      : null;
  const isCreatingOffer = selection?.type === "new-package" || selection?.type === "new-promotion";
  const isPromotionSelection = selection?.type === "promotion" || selection?.type === "new-promotion";
  const selectedOfferName = selectedProduct?.display_name || selectedPromotion?.display_name || "";
  const editorTitle = isCreatingOffer
    ? selection?.type === "new-package"
      ? (english ? "New package" : "Nuevo paquete")
      : (english ? "New promotion" : "Nueva promoción")
    : editorSection === "pricing"
      ? isPromotionSelection
        ? `${english ? "Configure discount" : "Configurar descuento"} · ${selectedOfferName}`
        : `${english ? "Configure prices" : "Configurar precios"} · ${selectedOfferName}`
      : editorSection === "availability"
        ? `${english ? "Manage availability" : "Administrar disponibilidad"} · ${selectedOfferName}`
        : `${english ? "Edit information" : "Editar información"} · ${selectedOfferName}`;
  const editorDescription = isCreatingOffer
    ? (english ? "Define the commercial item and save it in the offer draft." : "Define el elemento comercial y guárdalo en el borrador de la oferta.")
    : editorSection === "pricing"
      ? isPromotionSelection
        ? (english ? "Define the discount and test its effect before saving." : "Define el descuento y prueba su efecto antes de guardarlo.")
        : (english ? "Set monthly and annual prices with a guided calculator." : "Define los precios mensual y anual con una calculadora guiada.")
      : editorSection === "availability"
        ? (english ? "Control whether customers can see and buy this item." : "Controla si los clientes pueden ver y comprar este elemento.")
        : (english ? "Edit its commercial identity and package composition." : "Edita su identidad comercial y la composición del paquete.");
  const editorIcon = isCreatingOffer || editorSection === "details"
    ? isPromotionSelection ? <Gift className="h-5 w-5" /> : <Pencil className="h-5 w-5" />
    : editorSection === "pricing"
      ? isPromotionSelection ? <BadgePercent className="h-5 w-5" /> : <BadgeDollarSign className="h-5 w-5" />
      : <Eye className="h-5 w-5" />;

  const monthlyPrice = (product: PlatformCatalogProduct) => priceFor(product, "MONTH");
  const annualPrice = (product: PlatformCatalogProduct) => priceFor(product, "YEAR");
  const labels: Record<OfferColumnId, string> = {
    offer: english ? "Commercial item" : "Producto comercial",
    type: english ? "Type" : "Tipo",
    monthly: english ? "Monthly price" : "Precio mensual",
    annual: english ? "Annual price" : "Precio anual",
    configuration: english ? "Configuration" : "Configuración",
    availability: english ? "Availability" : "Disponibilidad",
  };
  const { columnWidths, resizeColumn } = usePersistentColumnWidths<OfferColumnId>({
    defaults: offerColumnDefaults,
    headerLabels: labels,
    maxWidths: offerColumnMaximums,
    minWidths: offerColumnMinimums,
    storageKey: "indice.platform.catalog.offer-table-widths.v2",
  });
  const columns: Array<IndiceTableColumnDefinition<OfferColumnId>> = (
    Object.keys(offerColumnDefaults) as OfferColumnId[]
  ).map((id) => ({
    id,
    label: labels[id],
    width: columnWidths[id],
    defaultWidth: offerColumnDefaults[id],
    contentMinimumWidth: offerColumnMinimums[id],
    maxWidth: offerColumnMaximums[id],
    resizeLabel: english ? `Resize ${labels[id]} column` : `Ajustar columna ${labels[id]}`,
  }));
  const tableMinimumWidth = getIndiceTableMinimumWidth({ columns, actionsWidth: offerActionsWidth });

  const openEditor = (target: Selection, section: CommercialOfferEditorSection = "details") => {
    setEditorSection(section);
    setSelection(target);
  };

  const configurationLabel = (value: Exclude<ConfigurationFilter, "ALL">) => ({
    READY: english ? "Ready to publish" : "Listo para publicar",
    CONFIGURATION_PENDING: english ? "Configuration pending" : "Configuración pendiente",
    STRIPE_PENDING: english ? "Stripe pending" : "Stripe pendiente",
  })[value];

  const configurationClassName = (value: Exclude<ConfigurationFilter, "ALL">) => ({
    READY: "bg-emerald-50 text-emerald-700",
    CONFIGURATION_PENDING: "bg-amber-50 text-amber-800",
    STRIPE_PENDING: "bg-blue-50 text-blue-700",
  })[value];

  const promotionDiscount = (promotion: PlatformCatalogPromotion) => {
    if (promotion.discount_type === "FIXED") return money(promotion.amount_off_cents, english);
    return `${((promotion.percent_basis_points ?? 0) / 100).toLocaleString(english ? "en-CA" : "es-MX")}%`;
  };

  const actionButtonClassName = "grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-[#59C3A5] hover:bg-[#E9F8F3] hover:text-[#177D66] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#59C3A5]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";

  const renderActions = (target: Selection, name: string, promotion = false) => (
    <IndiceTableActionGroup>
      <button
        type="button"
        className={actionButtonClassName}
        aria-label={`${english ? "Edit" : "Editar"}: ${name}`}
        title={english ? "Edit information" : "Editar información"}
        onClick={() => openEditor(target, "details")}
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={actionButtonClassName}
        aria-label={`${promotion ? (english ? "Configure discount" : "Configurar descuento") : (english ? "Configure prices" : "Configurar precios")}: ${name}`}
        title={promotion ? (english ? "Configure discount" : "Configurar descuento") : (english ? "Configure prices" : "Configurar precios")}
        onClick={() => openEditor(target, "pricing")}
      >
        {promotion ? <BadgePercent className="h-4 w-4" /> : <BadgeDollarSign className="h-4 w-4" />}
      </button>
      <button
        type="button"
        className={actionButtonClassName}
        aria-label={`${english ? "Manage availability" : "Administrar disponibilidad"}: ${name}`}
        title={english ? "Manage availability" : "Administrar disponibilidad"}
        onClick={() => openEditor(target, "availability")}
      >
        <Eye className="h-4 w-4" />
      </button>
    </IndiceTableActionGroup>
  );

  return (
    <div className="space-y-4">
      <IndiceFilterBar
        title={english ? "Filters" : "Filtros"}
        subtitle={english ? "Find and review the products customers can buy." : "Encuentra y revisa los productos que pueden comprar los clientes."}
        gridClassName="lg:grid-cols-5"
        summary={(
          <div className="flex items-center gap-3">
            <span>{visibleProducts.length + visiblePromotions.length} / {products.length + promotions.length}</span>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:border-[#59C3A5] hover:text-[#177D66] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
                {english ? "Clear filters" : "Limpiar filtros"}
              </button>
            ) : null}
          </div>
        )}
      >
        <IndiceFilterSearch
          className="lg:col-span-2"
          label={english ? "Search" : "Buscar"}
          placeholder={english ? "Name, code or description" : "Nombre, código o descripción"}
          tone="aqua"
          value={query}
          onValueChange={setQuery}
          onClear={() => setQuery("")}
        />
        <IndiceFilterSelect
          label={english ? "Product type" : "Tipo de producto"}
          tone="aqua"
          value={filter}
          onValueChange={(value) => setFilter(value as OfferFilter)}
          options={[
            { value: "ALL", label: `${english ? "All products" : "Todos los productos"} (${counts.total})` },
            { value: "MODULE", label: `${english ? "Modules" : "Módulos"} (${counts.modules})` },
            { value: "PACKAGE", label: `${english ? "Packages" : "Paquetes"} (${counts.packages})` },
            { value: "SEAT", label: `${english ? "Users" : "Usuarios"} (${counts.seats})` },
            { value: "PROMOTION", label: `${english ? "Promotions" : "Promociones"} (${counts.promotions})` },
          ]}
        />
        <IndiceFilterSelect
          label={english ? "Availability" : "Disponibilidad"}
          tone="aqua"
          value={availability}
          onValueChange={(value) => setAvailability(value as AvailabilityFilter)}
          options={[
            { value: "ALL", label: `${english ? "All statuses" : "Todos los estados"} (${counts.total})` },
            { value: "ACTIVE", label: `${english ? "Available to customers" : "Disponibles para clientes"} (${counts.active})` },
            { value: "INACTIVE", label: `${english ? "Unavailable" : "No disponibles"} (${counts.inactive})` },
          ]}
        />
        <IndiceFilterSelect
          label={english ? "Configuration" : "Configuración"}
          tone="aqua"
          value={configuration}
          onValueChange={(value) => setConfiguration(value as ConfigurationFilter)}
          options={[
            { value: "ALL", label: english ? "All configurations" : "Todas las configuraciones" },
            { value: "READY", label: `${english ? "Ready to publish" : "Listos para publicar"} (${counts.ready})` },
            { value: "CONFIGURATION_PENDING", label: `${english ? "Configuration pending" : "Configuración pendiente"} (${counts.configurationPending})` },
            { value: "STRIPE_PENDING", label: `${english ? "Stripe pending" : "Stripe pendiente"} (${counts.stripePending})` },
          ]}
        />
      </IndiceFilterBar>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#177D66]">{english ? "Commercial offer" : "Oferta comercial"}</p>
          <h2 className="mt-1 text-lg font-medium text-slate-950 dark:text-white">{english ? "What customers can buy" : "Lo que puede comprar el cliente"}</h2>
          <p className="mt-1 text-sm text-slate-500">{english ? "Review the offer and use the row actions to configure each item." : "Revisa la oferta y usa las acciones de cada fila para configurar cada elemento."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={!editable} onClick={() => openEditor({ type: "new-package" })} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white hover:bg-[#126553] disabled:opacity-40"><Plus className="h-4 w-4" />{english ? "Package" : "Paquete"}</button>
          <button type="button" disabled={!editable} onClick={() => openEditor({ type: "new-promotion" })} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#59C3A5] bg-white px-4 text-sm font-medium text-[#177D66] hover:bg-[#E9F8F3] disabled:opacity-40 dark:bg-slate-900"><Gift className="h-4 w-4" />{english ? "Promotion" : "Promoción"}</button>
        </div>
      </section>

      <IndiceTableShell>
        <IndiceOperationalTable minimumWidth={tableMinimumWidth}>
          <IndiceTableColGroup columns={columns} actionsWidth={offerActionsWidth} />
          <IndiceTableHeaderRow
            actions={{
              label: english ? "Actions" : "Acciones",
              width: offerActionsWidth,
              className: "sticky right-0 z-20 border-l border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900",
            }}
            columns={columns}
            onResize={resizeColumn}
            tone="aqua"
          />
          <TableBody>
            {visibleProducts.map((product) => {
              const configurationState = productConfiguration(product);
              const Icon = product.commercial_kind === "PACKAGE" ? PackageCheck : product.commercial_kind === "SEAT" ? UserPlus : Boxes;
              const target: Selection = { type: "product", id: product.id };
              return (
                <TableRow key={`product-${product.id}`} className="group border-slate-100 hover:bg-[#59C3A5]/5 dark:border-slate-800 dark:hover:bg-[#59C3A5]/10">
                  <TableCell className="h-[76px] px-4 py-3" style={{ width: columnWidths.offer }}>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E9F8F3] text-[#177D66]"><Icon className="h-4 w-4" /></span>
                      <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-950 dark:text-white">{product.display_name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{product.product_code}</p></div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200" style={{ width: columnWidths.type }}>{kindLabel(product.commercial_kind, english)}</TableCell>
                  <TableCell className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white" style={{ width: columnWidths.monthly }}>{money(monthlyPrice(product)?.unit_amount_cents, english)}</TableCell>
                  <TableCell className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white" style={{ width: columnWidths.annual }}>{money(annualPrice(product)?.unit_amount_cents, english)}</TableCell>
                  <TableCell className="px-4 py-3" style={{ width: columnWidths.configuration }}><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${configurationClassName(configurationState)}`}>{configurationLabel(configurationState)}</span></TableCell>
                  <TableCell className="px-4 py-3" style={{ width: columnWidths.availability }}><span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${product.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}><span className={`h-2 w-2 rounded-full ${product.active ? "bg-emerald-500" : "bg-slate-400"}`} />{product.active ? (english ? "Available" : "Disponible") : (english ? "Unavailable" : "No disponible")}</span></TableCell>
                  <TableCell className="sticky right-0 z-10 border-l border-slate-100 bg-white px-4 py-3 text-right group-hover:bg-[#F7FCFA] dark:border-slate-800 dark:bg-slate-900" style={{ width: offerActionsWidth }}>{renderActions(target, product.display_name)}</TableCell>
                </TableRow>
              );
            })}
            {visiblePromotions.map((promotion) => {
              const configurationState = promotionConfiguration(promotion);
              const target: Selection = { type: "promotion", id: promotion.id };
              return (
                <TableRow key={`promotion-${promotion.id}`} className="group border-slate-100 hover:bg-[#59C3A5]/5 dark:border-slate-800 dark:hover:bg-[#59C3A5]/10">
                  <TableCell className="h-[76px] px-4 py-3" style={{ width: columnWidths.offer }}><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><Gift className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-950 dark:text-white">{promotion.display_name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{promotion.promotion_code}</p></div></div></TableCell>
                  <TableCell className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200" style={{ width: columnWidths.type }}>{english ? "Promotion" : "Promoción"}</TableCell>
                  <TableCell className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white" style={{ width: columnWidths.monthly }}>{promotionDiscount(promotion)}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-slate-400" style={{ width: columnWidths.annual }}>—</TableCell>
                  <TableCell className="px-4 py-3" style={{ width: columnWidths.configuration }}><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${configurationClassName(configurationState)}`}>{configurationLabel(configurationState)}</span></TableCell>
                  <TableCell className="px-4 py-3" style={{ width: columnWidths.availability }}><span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${promotion.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}><span className={`h-2 w-2 rounded-full ${promotion.active ? "bg-emerald-500" : "bg-slate-400"}`} />{promotion.active ? (english ? "Available" : "Disponible") : (english ? "Unavailable" : "No disponible")}</span></TableCell>
                  <TableCell className="sticky right-0 z-10 border-l border-slate-100 bg-white px-4 py-3 text-right group-hover:bg-[#F7FCFA] dark:border-slate-800 dark:bg-slate-900" style={{ width: offerActionsWidth }}>{renderActions(target, promotion.display_name, true)}</TableCell>
                </TableRow>
              );
            })}
            {visibleProducts.length + visiblePromotions.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length + 1} className="px-6 py-14 text-center"><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{english ? "No offers match these filters." : "Ninguna oferta coincide con estos filtros."}</p><button type="button" onClick={clearFilters} className="mt-3 text-xs font-medium text-[#177D66] hover:underline">{english ? "Clear filters" : "Limpiar filtros"}</button></TableCell></TableRow>
            ) : null}
          </TableBody>
        </IndiceOperationalTable>
      </IndiceTableShell>

      <IndiceModalFrame
        bodyClassName="p-0"
        description={editorDescription}
        eyebrow={english ? "Commercial offer" : "Oferta comercial"}
        icon={editorIcon}
        modalType="standard-form"
        onOpenChange={(open) => { if (!open) setSelection(null); }}
        open={selection !== null}
        title={editorTitle}
        tone="aqua"
      >
        <CommercialOfferDetail
          catalog={catalog}
          editable={editable}
          focusSection={editorSection}
          modules={modules}
          product={selectedProduct}
          promotion={selectedPromotion}
          mode={selection?.type ?? "empty"}
          workingVersionId={workingVersion?.id ?? null}
          stripeMode={catalog?.stripe_environment?.mode ?? "TEST"}
          liveSyncEnabled={catalog?.stripe_environment?.catalog_live_sync_enabled ?? false}
          onClose={() => setSelection(null)}
          onSaved={onChange}
          onSelect={(next) => setSelection(next)}
          english={english}
        />
      </IndiceModalFrame>
    </div>
  );
}

export type CommercialOfferSelectionTarget = Selection;
