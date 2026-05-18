export type JobOptionLocale = 'en' | 'es';

export type JobDepartmentId =
  | 'operations'
  | 'administration'
  | 'sales'
  | 'customer_service'
  | 'finance'
  | 'human_resources'
  | 'marketing'
  | 'logistics'
  | 'purchasing'
  | 'it'
  | 'management'
  | 'production'
  | 'kitchen'
  | 'maintenance'
  | 'security'
  | 'cleaning'
  | 'field_operations'
  | 'construction'
  | 'medical'
  | 'legal';

interface JobDepartmentOption {
  id: JobDepartmentId;
  labels: Record<JobOptionLocale, string>;
}

export const getJobOptionLocale = (locale?: string): JobOptionLocale =>
  locale?.toLowerCase().startsWith('es') ? 'es' : 'en';

const normalizeJobOptionLabel = (value: string) =>
  value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

export const departmentOptions: readonly JobDepartmentOption[] = [
  { id: 'operations', labels: { en: 'Operations', es: 'Operaciones' } },
  { id: 'administration', labels: { en: 'Administration', es: 'Administración' } },
  { id: 'sales', labels: { en: 'Sales', es: 'Ventas' } },
  { id: 'customer_service', labels: { en: 'Customer Service', es: 'Servicio al cliente' } },
  { id: 'finance', labels: { en: 'Finance', es: 'Finanzas' } },
  { id: 'human_resources', labels: { en: 'Human Resources', es: 'Recursos Humanos' } },
  { id: 'marketing', labels: { en: 'Marketing', es: 'Marketing' } },
  { id: 'logistics', labels: { en: 'Logistics', es: 'Logística' } },
  { id: 'purchasing', labels: { en: 'Purchasing', es: 'Compras' } },
  { id: 'it', labels: { en: 'IT', es: 'Sistemas' } },
  { id: 'management', labels: { en: 'Management', es: 'Dirección' } },
  { id: 'production', labels: { en: 'Production', es: 'Producción' } },
  { id: 'kitchen', labels: { en: 'Kitchen', es: 'Cocina' } },
  { id: 'maintenance', labels: { en: 'Maintenance', es: 'Mantenimiento' } },
  { id: 'security', labels: { en: 'Security', es: 'Seguridad' } },
  { id: 'cleaning', labels: { en: 'Cleaning', es: 'Limpieza' } },
  { id: 'field_operations', labels: { en: 'Field Operations', es: 'Operaciones de campo' } },
  { id: 'construction', labels: { en: 'Construction', es: 'Construcción' } },
  { id: 'medical', labels: { en: 'Medical', es: 'Médico' } },
  { id: 'legal', labels: { en: 'Legal', es: 'Legal' } },
] as const;

export const getDepartmentOptionLabels = (locale?: string) => {
  const optionLocale = getJobOptionLocale(locale);
  return departmentOptions.map((department) => department.labels[optionLocale]);
};

export const findDepartmentIdByLabel = (label: string): JobDepartmentId | null => {
  const normalizedLabel = normalizeJobOptionLabel(label);
  if (!normalizedLabel) {
    return null;
  }

  const match = departmentOptions.find((department) =>
    Object.values(department.labels).some((departmentLabel) =>
      normalizeJobOptionLabel(departmentLabel) === normalizedLabel,
    ),
  );

  return match?.id ?? null;
};
