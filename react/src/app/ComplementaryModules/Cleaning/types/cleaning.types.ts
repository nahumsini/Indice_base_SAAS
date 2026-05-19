export type OrderStatus = 'scheduled' | 'on_route' | 'in_progress' | 'inspection' | 'completed' | 'delayed' | 'cancelled';
export type OrderPriority = 'normal' | 'urgent' | 'maintenance';
export type ServiceType = 'per_area' | 'per_hour' | 'deep_cleaning' | 'maintenance' | 'special';
export type AreaType = 'office' | 'bathroom' | 'kitchen' | 'common_area' | 'warehouse' | 'parking' | 'exterior';
export type IncidentType = 'damage' | 'missing_item' | 'complaint' | 'delay' | 'equipment_failure';
export type IncidentStatus = 'open' | 'review' | 'resolved' | 'compensated';

export interface CleaningOrder {
  id: string;
  folio: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  location: string;
  status: OrderStatus;
  priority: OrderPriority;
  serviceType: ServiceType;
  areas: CleaningArea[];
  teamId?: string;
  teamName?: string;
  teamSize: number;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration: number;
  actualDuration?: number;
  total: number;
  paid: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  specialNotes?: string;
  checklist: ChecklistItem[];
  photos: Photo[];
  timeline: TimelineEvent[];
  hasIncident: boolean;
}

export interface CleaningArea {
  id: string;
  type: AreaType;
  name: string;
  size: number;
  unit: 'm²' | 'units';
  tasks: string[];
  completed: boolean;
  inspectionScore?: number;
}

export interface ChecklistItem {
  id: string;
  task: string;
  area: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: Date;
  notes?: string;
}

export interface Photo {
  id: string;
  url: string;
  type: 'before' | 'after' | 'incident' | 'evidence';
  area?: string;
  timestamp: Date;
  uploadedBy: string;
}

export interface TimelineEvent {
  id: string;
  stage: OrderStatus;
  timestamp: Date;
  user: string;
  notes?: string;
  duration?: number;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  totalOrders: number;
  activeOrders: number;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'occasional';
  favoriteServices: string[];
  averageSpending: number;
  totalSpent: number;
  satisfactionScore: number;
  incidents: number;
  createdAt: Date;
  lastVisit?: Date;
  contractType?: 'one_time' | 'recurring';
}

export interface Team {
  id: string;
  name: string;
  supervisor: string;
  members: TeamMember[];
  status: 'available' | 'assigned' | 'off_duty';
  currentOrder?: string;
  todayOrders: number;
  efficiency: number;
  satisfactionScore: number;
  shift: 'morning' | 'afternoon' | 'night';
}

export interface TeamMember {
  id: string;
  name: string;
  role: 'supervisor' | 'cleaner' | 'specialist';
  phone: string;
  certifications?: string[];
}

export interface Incident {
  id: string;
  folio: string;
  orderId: string;
  orderFolio: string;
  clientName: string;
  type: IncidentType;
  status: IncidentStatus;
  title: string;
  description: string;
  responsible?: string;
  photos: string[];
  reportedAt: Date;
  resolvedAt?: Date;
  solution?: string;
  compensation?: number;
  notes?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'cleaning_product' | 'disinfectant' | 'equipment' | 'consumable' | 'tool';
  stock: number;
  unit: string;
  minStock: number;
  costPerUnit: number;
  lastRestocked?: Date;
  alert: boolean;
}

export interface CleaningMetrics {
  ordersToday: number;
  areasCompleted: number;
  teamsActive: number;
  productivity: number;
  delayedOrders: number;
  incidents: number;
  revenue: number;
  averageTime: number;
  satisfactionScore: number;
  inspectionPassRate: number;
}

export interface Insight {
  id: string;
  type: 'warning' | 'critical' | 'success' | 'info';
  icon: string;
  message: string;
  actionable: boolean;
  action?: string;
  orderId?: string;
}
