export type MaterialTabId = 'materials' | 'receipts' | 'providers' | 'requests' | 'fulfillments' | 'movements' | 'kpis';

export type MaterialRecord = {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  onHand: number;
  reserved: number;
  minimum: number;
  unitCost: number;
  currency: string;
  location: string;
  originCountry: string;
  certificateStatus: 'VALID' | 'EXPIRING' | 'MISSING';
};

export type MaterialActivity = {
  id: string;
  reference: string;
  provider: string;
  status: 'DRAFT' | 'PENDING' | 'PARTIAL' | 'COMPLETED';
  date: string;
  itemCount: number;
  currency: string;
  total: number;
};
