import type { InventoryBusiness, InventoryBusinessUnit } from '../types/inventoryTypes';

export const inventoryBusinessUnits: InventoryBusinessUnit[] = [
  { id: 'bu-corporate', name: 'Corporate office', code: 'CORP', city: 'Monterrey', country: 'Mexico' },
  { id: 'bu-cancun', name: 'Cancun', code: 'CUN', city: 'Cancun', country: 'Mexico' },
  { id: 'bu-monterrey', name: 'Monterrey', code: 'MTY', city: 'Monterrey', country: 'Mexico' },
  { id: 'bu-toronto', name: 'Toronto', code: 'TOR', city: 'Toronto', country: 'Canada' },
];

export const inventoryBusinesses: InventoryBusiness[] = [
  {
    id: 'biz-cancun-hq',
    name: 'Cancun headquarters',
    code: 'CUN-HQ',
    businessUnitId: 'bu-cancun',
    businessUnitName: 'Cancun',
    city: 'Cancun',
    country: 'Mexico',
  },
  {
    id: 'biz-zona-hotelera',
    name: 'Zona Hotelera Operations',
    code: 'ZHO',
    businessUnitId: 'bu-cancun',
    businessUnitName: 'Cancun',
    city: 'Cancun',
    country: 'Mexico',
  },
  {
    id: 'biz-vergel',
    name: 'Vergel Heroes',
    code: 'VERGEL',
    businessUnitId: 'bu-monterrey',
    businessUnitName: 'Monterrey',
    city: 'Monterrey',
    country: 'Mexico',
  },
  {
    id: 'biz-linda-vista',
    name: 'Linda Vista',
    code: 'LINDA',
    businessUnitId: 'bu-monterrey',
    businessUnitName: 'Monterrey',
    city: 'Monterrey',
    country: 'Mexico',
  },
  {
    id: 'biz-toronto-corporate',
    name: 'Toronto Corporate Office',
    code: 'TOR-CORP',
    businessUnitId: 'bu-toronto',
    businessUnitName: 'Toronto',
    city: 'Toronto',
    country: 'Canada',
  },
];
