import { findDepartmentIdByLabel, type JobDepartmentId } from './departmentOptions';
import { getAllPositionLabels, getPositionLabels, type JobPositionId } from './positionOptions';

export const departmentPositionMap: Record<JobDepartmentId, readonly JobPositionId[]> = {
  operations: [
    'operations_supervisor',
    'shift_lead',
    'coordinator',
    'operator',
    'technician',
    'assistant',
  ],
  administration: [
    'administrator',
    'office_coordinator',
    'executive_assistant',
    'assistant',
    'receptionist',
  ],
  sales: [
    'sales_representative',
    'sales_associate',
    'cashier',
    'store_supervisor',
    'account_executive',
  ],
  customer_service: [
    'customer_support_agent',
    'receptionist',
    'front_desk',
    'customer_service_supervisor',
  ],
  finance: [
    'accountant',
    'finance_assistant',
    'payroll_specialist',
    'treasury_analyst',
  ],
  human_resources: [
    'hr_coordinator',
    'recruiter',
    'hr_assistant',
    'payroll_specialist',
  ],
  marketing: [
    'marketing_coordinator',
    'social_media_manager',
    'designer',
    'account_executive',
  ],
  logistics: [
    'warehouse_associate',
    'inventory_coordinator',
    'delivery_driver',
    'driver',
    'logistics_supervisor',
  ],
  purchasing: [
    'buyer',
    'purchasing_assistant',
    'inventory_coordinator',
    'assistant',
  ],
  it: [
    'it_support',
    'systems_administrator',
    'technician',
  ],
  management: [
    'owner',
    'director',
    'general_manager',
    'administrator',
    'operations_supervisor',
  ],
  production: [
    'production_operator',
    'line_supervisor',
    'quality_assistant',
    'operator',
    'assistant',
  ],
  kitchen: [
    'chef',
    'cook',
    'server',
    'bartender',
    'barista',
    'assistant',
  ],
  maintenance: [
    'maintenance_technician',
    'maintenance_assistant',
    'technician',
    'operations_supervisor',
  ],
  security: [
    'security_guard',
    'shift_lead',
    'operations_supervisor',
  ],
  cleaning: [
    'cleaner',
    'room_attendant',
    'shift_lead',
    'assistant',
  ],
  field_operations: [
    'field_technician',
    'driver',
    'technician',
    'site_supervisor',
    'assistant',
  ],
  construction: [
    'site_supervisor',
    'construction_worker',
    'field_technician',
    'technician',
    'assistant',
  ],
  medical: [
    'nurse',
    'medical_assistant',
    'receptionist',
    'administrator',
  ],
  legal: [
    'legal_assistant',
    'administrator',
    'assistant',
  ],
};

export const getSuggestedPositionsByDepartment = (department: string, locale?: string) => {
  const departmentId = findDepartmentIdByLabel(department);
  if (!departmentId) {
    return getAllPositionLabels(locale);
  }

  return getPositionLabels(departmentPositionMap[departmentId], locale);
};
