const canonicalPageIds = [
  'dashboard',
  'home-panel',
  'human-resources',
  'processes-tasks',
  'expenses',
  'petty-cash',
  'point-of-sale',
  'sales',
  'kpis',
  'maintenance',
  'inventory',
  'minutes-control',
  'cleaning',
  'laundry',
  'transportation',
  'vehicles-machinery',
  'properties',
  'forms',
  'invoicing',
  'email',
  'work-climate',
  'sales-agent',
  'analytics',
  'training',
  'coach',
] as const;

export type PageId = (typeof canonicalPageIds)[number];

export const legacyPageAliases: Record<string, PageId> = {
  'panel-inicial': 'home-panel',
  config_center: 'home-panel',
  'recursos-humanos': 'human-resources',
  human_resources: 'human-resources',
  'procesos-tareas': 'processes-tasks',
  processes: 'processes-tasks',
  gastos: 'expenses',
  expenses: 'expenses',
  'caja-chica': 'petty-cash',
  petty_cash: 'petty-cash',
  'punto-venta': 'point-of-sale',
  pos: 'point-of-sale',
  ventas: 'sales',
  crm: 'sales',
  mantenimiento: 'maintenance',
  maintenance: 'maintenance',
  inventarios: 'inventory',
  inventory: 'inventory',
  'control-minutas': 'minutes-control',
  control_minutas: 'minutes-control',
  limpieza: 'cleaning',
  cleaning: 'cleaning',
  lavanderia: 'laundry',
  transportacion: 'transportation',
  'vehiculos-maquinaria': 'vehicles-machinery',
  vehiculos_maquinaria: 'vehicles-machinery',
  inmuebles: 'properties',
  formularios: 'forms',
  facturacion: 'invoicing',
  'correo-electronico': 'email',
  correo: 'email',
  'clima-laboral': 'work-climate',
  clima_laboral: 'work-climate',
  'indice-agente-ventas': 'sales-agent',
  'agente-ventas': 'sales-agent',
  agente_ventas: 'sales-agent',
  'indice-analitica': 'analytics',
  analitica: 'analytics',
  indice_analitica: 'analytics',
  capacitacion: 'training',
  'indice-coach': 'coach',
  coach: 'coach',
  kpis: 'kpis',
};

export const moduleRoutes: Record<string, PageId> = {
  panelInicial: 'home-panel',
  recursosHumanos: 'human-resources',
  procesosTareas: 'processes-tasks',
  gastos: 'expenses',
  cajaChica: 'petty-cash',
  puntoVenta: 'point-of-sale',
  ventas: 'sales',
  kpis: 'kpis',
  mantenimiento: 'maintenance',
  inventarios: 'inventory',
  controlMinutas: 'minutes-control',
  limpieza: 'cleaning',
  lavanderia: 'laundry',
  transportacion: 'transportation',
  vehiculosMaquinaria: 'vehicles-machinery',
  inmuebles: 'properties',
  formularios: 'forms',
  facturacion: 'invoicing',
  correoElectronico: 'email',
  climaLaboral: 'work-climate',
  indiceAgenteVentas: 'sales-agent',
  indiceAnalitica: 'analytics',
  capacitacion: 'training',
  indiceCoach: 'coach',
};

export function isPageId(page?: string): page is PageId {
  return Boolean(page && canonicalPageIds.includes(page as PageId));
}

export function resolvePageId(page?: string): PageId | null {
  if (isPageId(page)) {
    return page;
  }

  if (!page) {
    return null;
  }

  return legacyPageAliases[page] ?? null;
}

export function getPagePath(page: PageId, subPath?: string) {
  const normalizedSubPath = subPath?.replace(/^\/+|\/+$/g, '');

  return normalizedSubPath ? `/${page}/${normalizedSubPath}` : `/${page}`;
}
