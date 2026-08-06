import type { MaterialActivity, MaterialRecord } from './types';

export const materialRecords: MaterialRecord[] = [
  { id: 'mat-001', code: 'AL-6061', name: 'Aluminum sheet 6061', category: 'Metals', unit: 'kg', onHand: 1240, reserved: 320, minimum: 500, unitCost: 4.85, currency: 'USD', location: 'Raw materials A-01', originCountry: 'CA', certificateStatus: 'VALID' },
  { id: 'mat-002', code: 'ST-304', name: 'Stainless steel coil 304', category: 'Metals', unit: 'kg', onHand: 420, reserved: 180, minimum: 450, unitCost: 3.92, currency: 'USD', location: 'Raw materials A-02', originCountry: 'MX', certificateStatus: 'EXPIRING' },
  { id: 'mat-003', code: 'RS-110', name: 'Industrial resin', category: 'Polymers', unit: 'l', onHand: 980, reserved: 0, minimum: 300, unitCost: 67.5, currency: 'MXN', location: 'Chemical storage C-04', originCountry: 'US', certificateStatus: 'MISSING' },
];

export const materialActivities: MaterialActivity[] = [
  { id: 'rcp-001', reference: 'REC-000184', provider: 'Northline Metals', status: 'COMPLETED', date: '2026-08-04', itemCount: 3, currency: 'USD', total: 6480 },
  { id: 'req-001', reference: 'REQ-000071', provider: 'Production lot PL-104', status: 'PENDING', date: '2026-08-05', itemCount: 5, currency: 'USD', total: 0 },
  { id: 'ful-001', reference: 'FUL-000039', provider: 'Production lot PL-103', status: 'PARTIAL', date: '2026-08-05', itemCount: 2, currency: 'MXN', total: 12500 },
];
