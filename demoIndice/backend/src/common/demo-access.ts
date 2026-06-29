export type DemoModuleCategory = 'basic' | 'complementary' | 'ai';

export const demoModules: Array<{
  slug: string;
  name: string;
  category: DemoModuleCategory;
  favorite?: boolean;
}> = [
  { slug: 'config_center', name: 'Home Panel', category: 'basic', favorite: true },
  { slug: 'human_resources', name: 'Human Resources', category: 'basic', favorite: true },
  { slug: 'processes', name: 'Processes and tasks', category: 'basic', favorite: true },
  { slug: 'sales', name: 'Sales', category: 'basic', favorite: true },
  { slug: 'pos', name: 'Point of Sale', category: 'basic', favorite: true },
  { slug: 'expenses', name: 'Expenses', category: 'basic', favorite: true },
  { slug: 'petty_cash', name: 'Petty Cash', category: 'basic', favorite: true },
  { slug: 'kpis', name: 'KPIs', category: 'basic', favorite: true },
  { slug: 'maintenance', name: 'Maintenance', category: 'complementary' },
  { slug: 'inventory', name: 'Inventory', category: 'complementary' },
  { slug: 'control_minutas', name: 'Minutes Control', category: 'complementary' },
  { slug: 'cleaning', name: 'Cleaning', category: 'complementary' },
  { slug: 'lavanderia', name: 'Laundry', category: 'complementary' },
  { slug: 'transportacion', name: 'Transportation', category: 'complementary' },
  { slug: 'vehiculos_maquinaria', name: 'Vehicles and Machinery', category: 'complementary' },
  { slug: 'inmuebles', name: 'Properties', category: 'complementary' },
  { slug: 'formularios', name: 'Forms', category: 'complementary' },
  { slug: 'facturacion', name: 'Invoicing', category: 'complementary' },
  { slug: 'correo', name: 'Email', category: 'complementary' },
  { slug: 'clima_laboral', name: 'Work Climate', category: 'complementary' },
  { slug: 'affiliates', name: 'Affiliates', category: 'complementary' },
  { slug: 'agente_ventas', name: 'Sales Agent', category: 'ai' },
  { slug: 'indice_analitica', name: 'Indice Analytics', category: 'ai' },
  { slug: 'capacitacion', name: 'Training', category: 'ai' },
  { slug: 'coach', name: 'Coach', category: 'ai' },
];

export const demoModuleSlugs = demoModules.map((module) => module.slug);

export const demoTabPermissionKeys = [
  'config_center.profile',
  'config_center.business-structure',
  'config_center.business-profile',
  'config_center.personal-performance',
  'config_center.users',
  'human_resources.dashboard',
  'human_resources.employees',
  'human_resources.attendance',
  'human_resources.payroll',
  'human_resources.performance',
  'human_resources.kpis',
  'human_resources.permissions',
];

export function normalizeDemoRole(role: string) {
  return role === 'demo_admin' ? 'superadmin' : role;
}
