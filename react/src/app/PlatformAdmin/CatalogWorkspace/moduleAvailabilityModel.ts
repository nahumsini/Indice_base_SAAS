import { catalogConfigurationLabel, catalogModuleLabel, catalogModuleDescription } from "./catalogLabels";
import { catalogLocale, getCatalogCopy } from "./translations";
import type { PlatformCatalogProduct, PlatformModule } from "../../api/platformAdmin";

export type ModuleAvailabilityColumnId =
  | "module"
  | "category"
  | "use"
  | "products"
  | "status"
  | "configuration";

export type ModuleAvailabilitySortKey = ModuleAvailabilityColumnId;
export type ModuleAvailabilitySortDirection = "asc" | "desc";

export type ModuleCommercialState =
  | "core"
  | "ready"
  | "unassigned"
  | "unavailable";

export type ModuleAvailabilityRow = {
  module: PlatformModule;
  name: string;
  description: string;
  categoryLabel: string;
  useLabel: string;
  productCount: number;
  commercialState: ModuleCommercialState;
  configurationLabel: string;
};

export const defaultModuleAvailabilityColumnIds: ModuleAvailabilityColumnId[] = [
  "module",
  "category",
  "use",
  "products",
  "status",
  "configuration",
];

export const moduleAvailabilityDefaultWidths: Record<ModuleAvailabilityColumnId, number> = {
  module: 310,
  category: 150,
  use: 180,
  products: 145,
  status: 175,
  configuration: 215,
};

export const moduleAvailabilityMinimumWidths: Record<ModuleAvailabilityColumnId, number> = {
  module: 250,
  category: 130,
  use: 150,
  products: 125,
  status: 150,
  configuration: 180,
};

export const moduleAvailabilityMaximumWidths: Record<ModuleAvailabilityColumnId, number> = {
  module: 440,
  category: 260,
  use: 300,
  products: 220,
  status: 280,
  configuration: 360,
};

export const moduleAvailabilityActionsWidth = 112;
export const moduleAvailabilityColumnsStorageKey = "indice-platform-admin-module-columns-v1";

export function repairMojibake(value?: string | null) {
  if (!value) return "";
  if (!/[ÃÂ]/.test(value)) return value;

  try {
    const bytes = Uint8Array.from(Array.from(value), (character) => character.charCodeAt(0));
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return decoded.includes("�") ? value : decoded;
  } catch {
    return value;
  }
}

function normalizeCapability(value?: string | null) {
  return repairMojibake(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function moduleCapabilityKeys(module: PlatformModule) {
  const keys = [module.slug, module.route_key, module.name]
    .map(normalizeCapability)
    .filter((value) => value.length >= 3);
  return new Set(keys);
}

export function productIncludesModule(product: PlatformCatalogProduct, module: PlatformModule) {
  const keys = moduleCapabilityKeys(module);
  return product.capabilities.some((capability) => {
    const normalized = normalizeCapability(capability).replace(/^module_/, "");
    return Array.from(keys).some(
      (key) => normalized === key || normalized.endsWith(`_${key}`) || key.endsWith(`_${normalized}`),
    );
  });
}

export function getModuleCategoryLabel(category: string, languageCode: string | boolean = "en-CA") {
  const copy = getCatalogCopy(languageCode);
  const known: Record<string, string> = { basic: copy.baseCategory, complementary: copy.addOn, ai: copy.aiCategory };
  if (known[category]) return known[category];
  const repaired = repairMojibake(category).replace(/_/g, " ");
  return repaired.charAt(0).toUpperCase() + repaired.slice(1);
}

export function getModuleCommercialState(module: PlatformModule, productCount: number): ModuleCommercialState {
  if (module.is_core) return "core";
  if (!module.is_active) return "unavailable";
  return productCount > 0 ? "ready" : "unassigned";
}

export function buildModuleAvailabilityRows(
  modules: PlatformModule[],
  products: PlatformCatalogProduct[],
  languageCode: string | boolean = "en-CA",
): ModuleAvailabilityRow[] {
  return modules.map((module) => {
    const productCount = products.filter((product) => product.active && productIncludesModule(product, module)).length;
    const accessModel = repairMojibake(module.access_model || "");
    const lifecycle = repairMojibake(module.lifecycle_status || "");

    return {
      module,
      name: catalogModuleLabel({ ...module, name: repairMojibake(module.name) }, catalogLocale(languageCode)),
      description: catalogModuleDescription({ ...module, description: repairMojibake(module.description) }, catalogLocale(languageCode)) || (getCatalogCopy(languageCode).operationalDescriptionPending),
      categoryLabel: getModuleCategoryLabel(module.category, languageCode),
      useLabel: module.assignment_enabled
        ? getCatalogCopy(languageCode).customerAssignable
        : getCatalogCopy(languageCode).internalUse,
      productCount,
      commercialState: getModuleCommercialState(module, productCount),
      configurationLabel: [lifecycle, accessModel].filter(Boolean).map((value) => catalogConfigurationLabel(value, languageCode)).join(" · ") || (getCatalogCopy(languageCode).noConfiguration),
    };
  });
}

export function moduleAvailabilityColumnLabels(languageCode: string | boolean = "en-CA"): Record<ModuleAvailabilityColumnId, string> {
  return {
    module: getCatalogCopy(languageCode).module,
    category: getCatalogCopy(languageCode).category,
    use: getCatalogCopy(languageCode).operationalUse,
    products: getCatalogCopy(languageCode).products4,
    status: getCatalogCopy(languageCode).commercialStatus,
    configuration: getCatalogCopy(languageCode).configuration,
  };
}

export function normalizeModuleAvailabilityColumnIds(value: unknown): ModuleAvailabilityColumnId[] {
  if (!Array.isArray(value)) return [...defaultModuleAvailabilityColumnIds];
  const valid = new Set<ModuleAvailabilityColumnId>(defaultModuleAvailabilityColumnIds);
  const unique = value.filter(
    (columnId, index): columnId is ModuleAvailabilityColumnId =>
      typeof columnId === "string" &&
      valid.has(columnId as ModuleAvailabilityColumnId) &&
      value.indexOf(columnId) === index,
  );
  return unique.includes("module") ? unique : ["module", ...unique];
}

export function loadModuleAvailabilityColumnIds() {
  if (typeof window === "undefined") return [...defaultModuleAvailabilityColumnIds];
  try {
    const stored = window.localStorage.getItem(moduleAvailabilityColumnsStorageKey);
    return stored
      ? normalizeModuleAvailabilityColumnIds(JSON.parse(stored))
      : [...defaultModuleAvailabilityColumnIds];
  } catch {
    return [...defaultModuleAvailabilityColumnIds];
  }
}

export function saveModuleAvailabilityColumnIds(columnIds: ModuleAvailabilityColumnId[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    moduleAvailabilityColumnsStorageKey,
    JSON.stringify(normalizeModuleAvailabilityColumnIds(columnIds)),
  );
}

export function getModuleVisual(module: PlatformModule) {
  const value = normalizeCapability(`${module.slug} ${module.route_key || ""} ${module.name}`);
  const configuredIcon = repairMojibake(module.icon).trim();
  const emojiIcon = configuredIcon && /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(configuredIcon)
    ? configuredIcon
    : "";
  const definitions: Array<[string[], string, string, string]> = [
    [["config", "panel_inicial", "dashboard"], "🏠", "border-blue-200", "bg-blue-50"],
    [["human", "resource", "recursos_humanos"], "👥", "border-teal-200", "bg-teal-50"],
    [["petty", "caja_chica"], "💰", "border-emerald-200", "bg-emerald-50"],
    [["expense", "gastos"], "💸", "border-green-200", "bg-green-50"],
    [["crm"], "🤝", "border-orange-200", "bg-orange-50"],
    [["point", "pos", "punto_de_venta"], "🛒", "border-rose-200", "bg-rose-50"],
    [["kpi", "indicadores"], "📊", "border-violet-200", "bg-violet-50"],
    [["process", "task", "procesos", "tareas"], "✅", "border-amber-200", "bg-amber-50"],
    [["receiv", "cartera"], "📒", "border-cyan-200", "bg-cyan-50"],
    [["inventory", "inventario"], "📦", "border-cyan-200", "bg-cyan-50"],
    [["sale", "venta"], "💼", "border-rose-200", "bg-rose-50"],
    [["maintenance", "mantenimiento"], "🔧", "border-slate-300", "bg-slate-50"],
    [["minutas", "minutes", "control_minutas"], "📝", "border-indigo-200", "bg-indigo-50"],
    [["cleaning", "limpieza"], "🧹", "border-cyan-200", "bg-cyan-50"],
    [["lavander"], "🧺", "border-sky-200", "bg-sky-50"],
    [["transport"], "🚌", "border-yellow-200", "bg-yellow-50"],
    [["vehicle", "vehiculo", "maquinaria"], "🚜", "border-orange-200", "bg-orange-50"],
    [["property", "inmueble"], "🏢", "border-blue-200", "bg-blue-50"],
    [["form", "formulario"], "📋", "border-purple-200", "bg-purple-50"],
    [["billing", "facturacion"], "🧾", "border-emerald-200", "bg-emerald-50"],
    [["mail", "correo"], "✉️", "border-blue-200", "bg-blue-50"],
    [["clima", "climate"], "🌤️", "border-yellow-200", "bg-yellow-50"],
    [["affiliate", "afiliado"], "🔗", "border-fuchsia-200", "bg-fuchsia-50"],
  ];
  const match = definitions.find(([terms]) => terms.some((term) => value.includes(term)));
  if (match) {
    return { emoji: emojiIcon || match[1], border: match[2], background: match[3] };
  }
  if (module.category === "ai") {
    return { emoji: emojiIcon || "🤖", border: "border-violet-200", background: "bg-violet-50" };
  }
  return { emoji: emojiIcon || "🧩", border: "border-blue-200", background: "bg-blue-50" };
}
