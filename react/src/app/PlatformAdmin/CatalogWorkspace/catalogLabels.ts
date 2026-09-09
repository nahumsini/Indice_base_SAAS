import type { PlatformCatalogProduct, PlatformModule } from '../../api/platformAdmin';
import { getCatalogCopy, type CatalogCopy } from './translations';

const capabilityKeys: Record<string, keyof CatalogCopy> = {
  human_resources: 'humanResources', hr: 'humanResources', basic_hr: 'humanResources',
  expenses: 'expensesModule', petty_cash: 'pettyCashModule', crm: 'salesModule', sales: 'salesModule',
  pos: 'posModule', point_of_sale: 'posModule', processes: 'processTasks', process_tasks: 'processTasks',
  inventory: 'inventoryModule', maintenance: 'maintenanceModule', dashboard: 'homePanel', config_center: 'homePanel',
  receivables: 'receivablesModule', kpis: 'kpisModule', security: 'securityModule', billing: 'billingModule',
  control_minutas: 'minutesModule', cleaning: 'cleaningModule', lavanderia: 'laundryModule',
  transportacion: 'transportModule', vehiculos_maquinaria: 'vehiclesModule', inmuebles: 'propertiesModule',
  formularios: 'formsModule', facturacion: 'invoicingModule', correo: 'emailModule', clima_laboral: 'workClimateModule',
  affiliates: 'affiliatesModule', capacitacion: 'trainingModule', indice_analitica: 'analyticsModule',
  agente_ventas: 'salesAgentModule', coach: 'coachModule',
};
const productKeys: Record<string, keyof CatalogCopy> = {
  core_platform: 'corePlatform', module_hr: 'humanResources', module_process_tasks: 'processTasks',
  module_expenses: 'expensesPettyCash', module_sales_inventory: 'salesInventory', module_pos_inventory: 'posInventory',
  module_receivables: 'receivablesModule', module_additional_unit: 'additionalModule', extra_user: 'additionalUser',
  storage_block_5_gib: 'storage5GiB', storage_block_100_gib: 'storage100GiB',
};
// Only recognized seeded labels are translated. Administrator-authored text is never overwritten.
const nameAliases: Partial<Record<keyof CatalogCopy, string[]>> = {
  processTasks: ['Procesos y Tareas'], homePanel: ['Panel Inicial'], salesModule: ['CRM'],
  additionalModule: ['Modulo adicional'], analyticsModule: ['Indice Analitica'], coachModule: ['Coach'],
};
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
function seededLabel(key: keyof CatalogCopy | undefined, authored: string, languageCode: string): string {
  if (typeof key !== "string") return authored;
  const defaults = [getCatalogCopy('es-MX')[key], getCatalogCopy('en-CA')[key], ...(nameAliases[key] ?? [])];
  return defaults.some((value) => normalize(value) === normalize(authored)) ? getCatalogCopy(languageCode)[key] : authored;
}
export function catalogCapabilityLabel(code: string, languageCode: string): string {
  const key = capabilityKeys[code];
  return typeof key === "string" ? getCatalogCopy(languageCode)[key] : code;
}
export function catalogProductLabel(product: Pick<PlatformCatalogProduct, 'product_code' | 'display_name'>, languageCode: string): string {
  const key = productKeys[product.product_code] ?? capabilityKeys[product.product_code.replace(/^module_/, '')];
  return seededLabel(key, product.display_name, languageCode);
}
export function catalogModuleLabel(module: Pick<PlatformModule, 'slug' | 'name'>, languageCode: string): string {
  return seededLabel(capabilityKeys[module.slug], module.name, languageCode);
}
const descriptionKeys: Record<string, keyof CatalogCopy> = {
  human_resources: 'hrDescription', expenses: 'expensesDescription', crm: 'crmDescription', pos: 'posDescription',
  processes: 'processDescription', maintenance: 'maintenanceDescription', inventory: 'inventoryDescription', config_center: 'homeDescription',
  control_minutas: 'minutesDescription', cleaning: 'cleaningDescription', lavanderia: 'laundryDescription', transportacion: 'transportDescription',
  vehiculos_maquinaria: 'vehiclesDescription', inmuebles: 'propertiesDescription', formularios: 'formsDescription', facturacion: 'invoicingDescription',
  correo: 'emailDescription', clima_laboral: 'workClimateDescription', affiliates: 'affiliatesDescription',
};
export function catalogModuleDescription(module: Pick<PlatformModule, 'slug' | 'description'>, languageCode: string): string {
  return seededLabel(descriptionKeys[module.slug], module.description ?? '', languageCode);
}
export function catalogConfigurationLabel(code: string, languageCode: string | boolean): string {
  const keys: Record<string, keyof CatalogCopy> = {
    released: 'releasedStatus', planned: 'plannedStatus', pilot: 'pilotStatus', development: 'developmentStatus',
    draft: 'notPublished', retired: 'retiredStatus', disabled: 'disabled', tabs: 'tabsAccess', module: 'moduleAccess',
  };
  const key = keys[code.toLowerCase()];
  return typeof key === "string" ? getCatalogCopy(languageCode)[key] : code;
}
