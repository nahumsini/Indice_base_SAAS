export interface AdvisorKioskQueueItem {
  id: string;
  customerName: string;
  advisorName: string;
  itemCount: number;
  estimatedTotal: number;
  status: 'draft' | 'ready' | 'sentToCashier';
}

