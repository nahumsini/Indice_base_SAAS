import type { SalesBusinessOption, SalesBusinessUnitOption } from '../types/salesTypes';

export const salesBusinessUnitOptions: SalesBusinessUnitOption[] = [
  { id: 'sales-unit-corporate', name: 'Corporate sales', code: 'CORP-SALES' },
  { id: 'sales-unit-north', name: 'North region', code: 'NORTH' },
  { id: 'sales-unit-canada', name: 'Canada operations', code: 'CAN-OPS' },
];

export const salesBusinessOptions: SalesBusinessOption[] = [
  {
    id: 'sales-business-corporate',
    name: 'Corporate commercial desk',
    code: 'CORP-DESK',
    businessUnitId: 'sales-unit-corporate',
    businessUnitName: 'Corporate sales',
  },
  {
    id: 'sales-business-retail',
    name: 'Retail execution',
    code: 'RETAIL',
    businessUnitId: 'sales-unit-north',
    businessUnitName: 'North region',
  },
  {
    id: 'sales-business-services',
    name: 'Services delivery',
    code: 'SERVICES',
    businessUnitId: 'sales-unit-canada',
    businessUnitName: 'Canada operations',
  },
];
