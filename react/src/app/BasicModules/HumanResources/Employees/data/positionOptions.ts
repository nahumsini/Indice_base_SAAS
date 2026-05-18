import { getJobOptionLocale, type JobOptionLocale } from './departmentOptions';

export type JobPositionId =
  | 'owner'
  | 'director'
  | 'general_manager'
  | 'administrator'
  | 'office_coordinator'
  | 'executive_assistant'
  | 'operations_supervisor'
  | 'shift_lead'
  | 'coordinator'
  | 'operator'
  | 'technician'
  | 'field_technician'
  | 'assistant'
  | 'sales_representative'
  | 'sales_associate'
  | 'cashier'
  | 'store_supervisor'
  | 'account_executive'
  | 'customer_support_agent'
  | 'receptionist'
  | 'front_desk'
  | 'customer_service_supervisor'
  | 'accountant'
  | 'finance_assistant'
  | 'payroll_specialist'
  | 'treasury_analyst'
  | 'hr_coordinator'
  | 'recruiter'
  | 'hr_assistant'
  | 'warehouse_associate'
  | 'inventory_coordinator'
  | 'delivery_driver'
  | 'logistics_supervisor'
  | 'buyer'
  | 'purchasing_assistant'
  | 'marketing_coordinator'
  | 'social_media_manager'
  | 'designer'
  | 'it_support'
  | 'systems_administrator'
  | 'production_operator'
  | 'quality_assistant'
  | 'line_supervisor'
  | 'cook'
  | 'chef'
  | 'server'
  | 'bartender'
  | 'barista'
  | 'maintenance_technician'
  | 'maintenance_assistant'
  | 'security_guard'
  | 'cleaner'
  | 'room_attendant'
  | 'driver'
  | 'construction_worker'
  | 'site_supervisor'
  | 'nurse'
  | 'medical_assistant'
  | 'legal_assistant';

interface JobPositionOption {
  id: JobPositionId;
  labels: Record<JobOptionLocale, string>;
}

export const positionOptions: readonly JobPositionOption[] = [
  { id: 'owner', labels: { en: 'Owner', es: 'Propietario' } },
  { id: 'director', labels: { en: 'Director', es: 'Director' } },
  { id: 'general_manager', labels: { en: 'General Manager', es: 'Gerente general' } },
  { id: 'administrator', labels: { en: 'Administrator', es: 'Administrador' } },
  { id: 'office_coordinator', labels: { en: 'Office Coordinator', es: 'Coordinador de oficina' } },
  { id: 'executive_assistant', labels: { en: 'Executive Assistant', es: 'Asistente ejecutivo' } },
  { id: 'operations_supervisor', labels: { en: 'Operations Supervisor', es: 'Supervisor de operaciones' } },
  { id: 'shift_lead', labels: { en: 'Shift Lead', es: 'Líder de turno' } },
  { id: 'coordinator', labels: { en: 'Coordinator', es: 'Coordinador' } },
  { id: 'operator', labels: { en: 'Operator', es: 'Operador' } },
  { id: 'technician', labels: { en: 'Technician', es: 'Técnico' } },
  { id: 'field_technician', labels: { en: 'Field Technician', es: 'Técnico de campo' } },
  { id: 'assistant', labels: { en: 'Assistant', es: 'Auxiliar' } },
  { id: 'sales_representative', labels: { en: 'Sales Representative', es: 'Representante de ventas' } },
  { id: 'sales_associate', labels: { en: 'Sales Associate', es: 'Asesor de ventas' } },
  { id: 'cashier', labels: { en: 'Cashier', es: 'Cajero' } },
  { id: 'store_supervisor', labels: { en: 'Store Supervisor', es: 'Supervisor de tienda' } },
  { id: 'account_executive', labels: { en: 'Account Executive', es: 'Ejecutivo de cuenta' } },
  { id: 'customer_support_agent', labels: { en: 'Customer Support Agent', es: 'Agente de soporte al cliente' } },
  { id: 'receptionist', labels: { en: 'Receptionist', es: 'Recepcionista' } },
  { id: 'front_desk', labels: { en: 'Front Desk', es: 'Mostrador' } },
  { id: 'customer_service_supervisor', labels: { en: 'Customer Service Supervisor', es: 'Supervisor de servicio al cliente' } },
  { id: 'accountant', labels: { en: 'Accountant', es: 'Contador' } },
  { id: 'finance_assistant', labels: { en: 'Finance Assistant', es: 'Auxiliar financiero' } },
  { id: 'payroll_specialist', labels: { en: 'Payroll Specialist', es: 'Especialista de nómina' } },
  { id: 'treasury_analyst', labels: { en: 'Treasury Analyst', es: 'Analista de tesorería' } },
  { id: 'hr_coordinator', labels: { en: 'HR Coordinator', es: 'Coordinador de RH' } },
  { id: 'recruiter', labels: { en: 'Recruiter', es: 'Reclutador' } },
  { id: 'hr_assistant', labels: { en: 'HR Assistant', es: 'Auxiliar de RH' } },
  { id: 'warehouse_associate', labels: { en: 'Warehouse Associate', es: 'Almacenista' } },
  { id: 'inventory_coordinator', labels: { en: 'Inventory Coordinator', es: 'Coordinador de inventario' } },
  { id: 'delivery_driver', labels: { en: 'Delivery Driver', es: 'Repartidor' } },
  { id: 'logistics_supervisor', labels: { en: 'Logistics Supervisor', es: 'Supervisor de logística' } },
  { id: 'buyer', labels: { en: 'Buyer', es: 'Comprador' } },
  { id: 'purchasing_assistant', labels: { en: 'Purchasing Assistant', es: 'Auxiliar de compras' } },
  { id: 'marketing_coordinator', labels: { en: 'Marketing Coordinator', es: 'Coordinador de marketing' } },
  { id: 'social_media_manager', labels: { en: 'Social Media Manager', es: 'Responsable de redes sociales' } },
  { id: 'designer', labels: { en: 'Designer', es: 'Diseñador' } },
  { id: 'it_support', labels: { en: 'IT Support', es: 'Soporte técnico' } },
  { id: 'systems_administrator', labels: { en: 'Systems Administrator', es: 'Administrador de sistemas' } },
  { id: 'production_operator', labels: { en: 'Production Operator', es: 'Operador de producción' } },
  { id: 'quality_assistant', labels: { en: 'Quality Assistant', es: 'Auxiliar de calidad' } },
  { id: 'line_supervisor', labels: { en: 'Line Supervisor', es: 'Supervisor de línea' } },
  { id: 'cook', labels: { en: 'Cook', es: 'Cocinero' } },
  { id: 'chef', labels: { en: 'Chef', es: 'Chef' } },
  { id: 'server', labels: { en: 'Server', es: 'Mesero' } },
  { id: 'bartender', labels: { en: 'Bartender', es: 'Bartender' } },
  { id: 'barista', labels: { en: 'Barista', es: 'Barista' } },
  { id: 'maintenance_technician', labels: { en: 'Maintenance Technician', es: 'Técnico de mantenimiento' } },
  { id: 'maintenance_assistant', labels: { en: 'Maintenance Assistant', es: 'Auxiliar de mantenimiento' } },
  { id: 'security_guard', labels: { en: 'Security Guard', es: 'Guardia de seguridad' } },
  { id: 'cleaner', labels: { en: 'Cleaner', es: 'Personal de limpieza' } },
  { id: 'room_attendant', labels: { en: 'Room Attendant', es: 'Camarista' } },
  { id: 'driver', labels: { en: 'Driver', es: 'Chofer' } },
  { id: 'construction_worker', labels: { en: 'Construction Worker', es: 'Trabajador de construcción' } },
  { id: 'site_supervisor', labels: { en: 'Site Supervisor', es: 'Supervisor de obra' } },
  { id: 'nurse', labels: { en: 'Nurse', es: 'Enfermero' } },
  { id: 'medical_assistant', labels: { en: 'Medical Assistant', es: 'Auxiliar médico' } },
  { id: 'legal_assistant', labels: { en: 'Legal Assistant', es: 'Auxiliar legal' } },
] as const;

export const getPositionLabels = (positionIds: readonly JobPositionId[], locale?: string) => {
  const optionLocale = getJobOptionLocale(locale);
  const positionMap = new Map(positionOptions.map((position) => [position.id, position]));

  return positionIds
    .map((positionId) => positionMap.get(positionId)?.labels[optionLocale])
    .filter((position): position is string => Boolean(position));
};

export const getAllPositionLabels = (locale?: string) => {
  const optionLocale = getJobOptionLocale(locale);
  return positionOptions.map((position) => position.labels[optionLocale]);
};
