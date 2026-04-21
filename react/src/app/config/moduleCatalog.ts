import type { BackendDashboardModule } from '../api/dashboard';
import type { PageId } from './navigation';

export type DashboardModuleCategory = 'basic' | 'complementary' | 'ai';
export type DashboardModuleColor =
  | 'blue'
  | 'yellow'
  | 'orange'
  | 'green'
  | 'gray'
  | 'purple'
  | 'red'
  | 'gold';

export interface DashboardModuleCard {
  id: string;
  slug: string;
  emoji: string;
  title: string;
  color: DashboardModuleColor;
  route: PageId;
  category: DashboardModuleCategory;
  locked?: boolean;
}

type Translator = Record<string, any>;

const moduleMetaBySlug: Record<
  string,
  {
    route: PageId;
    emoji: string;
    color: DashboardModuleColor;
    category: DashboardModuleCategory;
    title: (t: Translator, fallbackName: string) => string;
  }
> = {
  config_center: {
    route: 'home-panel',
    emoji: '📊',
    color: 'purple',
    category: 'basic',
    title: (t) => t.modules.panelInicial,
  },
  human_resources: {
    route: 'human-resources',
    emoji: '👥',
    color: 'blue',
    category: 'basic',
    title: (t) => t.modules.recursosHumanos,
  },
  expenses: {
    route: 'expenses',
    emoji: '💰',
    color: 'green',
    category: 'basic',
    title: (t) => t.modules.gastos,
  },
  petty_cash: {
    route: 'petty-cash',
    emoji: '💳',
    color: 'green',
    category: 'basic',
    title: (t) => t.modules.cajaChica,
  },
  pos: {
    route: 'point-of-sale',
    emoji: '🛒',
    color: 'orange',
    category: 'basic',
    title: (t) => t.modules.puntoVenta,
  },
  processes: {
    route: 'processes-tasks',
    emoji: '✅',
    color: 'yellow',
    category: 'basic',
    title: (t) => t.modules.procesosTareas,
  },
  crm: {
    route: 'sales',
    emoji: '💵',
    color: 'orange',
    category: 'basic',
    title: (t) => t.modules.ventas,
  },
  sales: {
    route: 'sales',
    emoji: '💵',
    color: 'orange',
    category: 'basic',
    title: (t) => t.modules.ventas,
  },
  kpis: {
    route: 'kpis',
    emoji: '📈',
    color: 'purple',
    category: 'basic',
    title: (t) => t.modules.kpis,
  },
  maintenance: {
    route: 'maintenance',
    emoji: '🔧',
    color: 'gray',
    category: 'complementary',
    title: (t) => t.modules.mantenimiento,
  },
  inventory: {
    route: 'inventory',
    emoji: '📦',
    color: 'gray',
    category: 'complementary',
    title: (t) => t.modules.inventarios,
  },
  control_minutas: {
    route: 'minutes-control',
    emoji: '📄',
    color: 'gray',
    category: 'complementary',
    title: (t) => t.modules.controlMinutas,
  },
  cleaning: {
    route: 'cleaning',
    emoji: '🧹',
    color: 'gray',
    category: 'complementary',
    title: (t) => t.modules.limpieza,
  },
  lavanderia: {
    route: 'laundry',
    emoji: '👕',
    color: 'gray',
    category: 'complementary',
    title: (t) => t.modules.lavanderia,
  },
  transportacion: {
    route: 'transportation',
    emoji: '🚚',
    color: 'gray',
    category: 'complementary',
    title: (t) => t.modules.transportacion,
  },
  vehiculos_maquinaria: {
    route: 'vehicles-machinery',
    emoji: '🚗',
    color: 'gray',
    category: 'complementary',
    title: (t) => t.modules.vehiculosMaquinaria,
  },
  inmuebles: {
    route: 'properties',
    emoji: '🏢',
    color: 'gray',
    category: 'complementary',
    title: (t) => t.modules.inmuebles,
  },
  formularios: {
    route: 'forms',
    emoji: '📋',
    color: 'gray',
    category: 'complementary',
    title: (t) => t.modules.formularios,
  },
  facturacion: {
    route: 'invoicing',
    emoji: '🧾',
    color: 'gray',
    category: 'complementary',
    title: (t) => t.modules.facturacion,
  },
  correo: {
    route: 'email',
    emoji: '📧',
    color: 'gray',
    category: 'complementary',
    title: (t) => t.modules.correoElectronico,
  },
  correo_electronico: {
    route: 'email',
    emoji: '📧',
    color: 'gray',
    category: 'complementary',
    title: (t) => t.modules.correoElectronico,
  },
  clima_laboral: {
    route: 'work-climate',
    emoji: '😊',
    color: 'gray',
    category: 'complementary',
    title: (t) => t.modules.climaLaboral,
  },
  agente_ventas: {
    route: 'sales-agent',
    emoji: '🤖',
    color: 'gold',
    category: 'ai',
    title: (t) => t.modules.indiceAgenteVentas,
  },
  indice_analitica: {
    route: 'analytics',
    emoji: '📊',
    color: 'gold',
    category: 'ai',
    title: (t) => t.modules.indiceAnalitica,
  },
  capacitacion: {
    route: 'training',
    emoji: '🎓',
    color: 'gold',
    category: 'ai',
    title: (t) => t.modules.capacitacion,
  },
  coach: {
    route: 'coach',
    emoji: '💬',
    color: 'gold',
    category: 'ai',
    title: (t) => t.modules.indiceCoach,
  },
};

export function buildDefaultModuleCatalog(t: Translator): DashboardModuleCard[] {
  const modules = new Map<string, DashboardModuleCard>();

  for (const [slug, meta] of Object.entries(moduleMetaBySlug)) {
    if (modules.has(meta.route)) {
      continue;
    }

    modules.set(meta.route, {
      id: meta.route,
      slug,
      emoji: meta.emoji,
      title: meta.title(t, slug),
      color: meta.color,
      route: meta.route,
      category: meta.category,
    });
  }

  return Array.from(modules.values());
}

export function mapBackendModuleToCard(
  module: BackendDashboardModule,
  t: Translator,
): DashboardModuleCard | null {
  const meta = moduleMetaBySlug[module.slug];
  if (!meta) {
    return null;
  }

  return {
    id: meta.route,
    slug: module.slug,
    emoji: meta.emoji,
    title: meta.title(t, module.name),
    color: meta.color,
    route: meta.route,
    category: normalizeCategory(module.category, meta.category),
    locked: Boolean(module.locked),
  };
}

export function routeForBackendSlug(slug: string): PageId | null {
  return moduleMetaBySlug[slug]?.route ?? null;
}

export function backendSlugForRoute(route: PageId): string | null {
  const entry = Object.entries(moduleMetaBySlug).find(([, meta]) => meta.route === route);
  return entry?.[0] ?? null;
}

export function mergeDashboardModules(
  apiModules: DashboardModuleCard[],
  fallbackModules: DashboardModuleCard[],
): DashboardModuleCard[] {
  const merged = new Map<string, DashboardModuleCard>();
  const fallbackOrder = new Map(
    fallbackModules.map((module, index) => [module.id, index] as const),
  );

  for (const module of apiModules) {
    merged.set(module.id, module);
  }

  for (const fallback of fallbackModules) {
    if (!merged.has(fallback.id)) {
      merged.set(fallback.id, fallback);
    }
  }

  return Array.from(merged.values()).sort((left, right) => {
    const leftOrder = fallbackOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = fallbackOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.title.localeCompare(right.title);
  });
}

function normalizeCategory(
  rawCategory: string | undefined,
  fallbackCategory: DashboardModuleCategory,
): DashboardModuleCategory {
  if (rawCategory === 'basic' || rawCategory === 'ai' || rawCategory === 'complementary') {
    return rawCategory;
  }

  return fallbackCategory;
}
