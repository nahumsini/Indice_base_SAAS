export type VehicleType = 'truck' | 'car' | 'van' | 'excavator' | 'forklift' | 'crane' | 'loader' | 'tractor' | 'trailer';
export type VehicleStatus = 'available' | 'in_operation' | 'maintenance' | 'out_of_service' | 'reserved' | 'no_operator';
export type FuelType = 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'gas';
export type ServiceType = 'preventive' | 'corrective' | 'inspection' | 'tire_change' | 'oil_change' | 'general';
export type ServiceStatus = 'scheduled' | 'in_progress' | 'completed' | 'overdue';
export type ReportStatus = 'new' | 'review' | 'approved' | 'repair' | 'closed';
export type ReportPriority = 'low' | 'medium' | 'high' | 'critical';
export type ReportType = 'failure' | 'accident' | 'damage' | 'delay' | 'fine' | 'incident';
export type DocumentType = 'insurance' | 'license' | 'permit' | 'verification' | 'contract' | 'invoice';

export interface Vehicle {
  id: string;
  name: string;
  type: VehicleType;
  status: VehicleStatus;
  operator?: string;
  operatorId?: string;
  location: string;
  fuel: number; // percentage
  hours?: number;
  kilometers?: number;
  brand: string;
  model: string;
  year: number;
  plates?: string;
  vin?: string;
  fuelType: FuelType;
  capacity?: string;
  branch: string;
  photo?: string;
  nextService?: Date;
  alerts: number;
  incidents: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  vehicleId: string;
  vehicleName: string;
  type: ServiceType;
  status: ServiceStatus;
  scheduledDate: Date;
  completedDate?: Date;
  description: string;
  workshop?: string;
  technician?: string;
  cost?: number;
  parts: ServicePart[];
  notes?: string;
  nextServiceKm?: number;
  nextServiceDate?: Date;
  createdAt: Date;
}

export interface ServicePart {
  id: string;
  name: string;
  quantity: number;
  cost: number;
}

export interface OperationalReport {
  id: string;
  folio: string;
  vehicleId: string;
  vehicleName: string;
  operatorId: string;
  operatorName: string;
  type: ReportType;
  priority: ReportPriority;
  status: ReportStatus;
  title: string;
  description: string;
  location: string;
  date: Date;
  photos: string[];
  comments: ReportComment[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface ReportComment {
  id: string;
  author: string;
  text: string;
  timestamp: Date;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  vehicleName: string;
  operatorId: string;
  operatorName: string;
  liters: number;
  cost: number;
  pricePerLiter: number;
  odometer: number;
  station?: string;
  date: Date;
  receipt?: string;
}

export interface Expense {
  id: string;
  vehicleId: string;
  vehicleName: string;
  type: 'fuel' | 'maintenance' | 'toll' | 'fine' | 'parking' | 'other';
  amount: number;
  description: string;
  date: Date;
  receipt?: string;
}

export interface Checklist {
  id: string;
  vehicleId: string;
  vehicleName: string;
  operatorId: string;
  operatorName: string;
  type: 'pickup' | 'return';
  date: Date;
  odometer: number;
  fuelLevel: number;
  items: ChecklistItem[];
  photos: string[];
  signature?: string;
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  category: string;
  item: string;
  status: 'ok' | 'damaged' | 'missing' | 'needs_attention';
  notes?: string;
}

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  vehicleName: string;
  type: DocumentType;
  name: string;
  number?: string;
  issueDate: Date;
  expiryDate: Date;
  file?: string;
  provider?: string;
  cost?: number;
  alerts: boolean;
  daysUntilExpiry: number;
}

export interface GPSData {
  vehicleId: string;
  vehicleName: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: Date;
  ignition: boolean;
  fuel: number;
}

export interface Activity {
  id: string;
  vehicleId: string;
  type: 'service' | 'report' | 'assignment' | 'checklist' | 'repair' | 'fuel' | 'expense';
  title: string;
  description: string;
  user: string;
  timestamp: Date;
  metadata?: any;
}

export interface VehicleMetrics {
  totalVehicles: number;
  available: number;
  inOperation: number;
  maintenance: number;
  outOfService: number;
  averageAvailability: number;
  totalCostThisMonth: number;
  pendingServices: number;
  criticalReports: number;
  averageFuelEfficiency: number;
  mostProductiveVehicle: string;
  mostExpensiveVehicle: string;
}

export interface Insight {
  id: string;
  type: 'warning' | 'critical' | 'success' | 'info';
  icon: string;
  message: string;
  actionable: boolean;
  action?: string;
  vehicleId?: string;
}
