export type NodeType = 'warehouse' | 'branch' | 'vehicle' | 'technician' | 'transit' | 'production' | 'consignment';
export type NodeStatus = 'healthy' | 'attention' | 'critical' | 'in_transit' | 'production';
export type MovementType = 'entry' | 'exit' | 'transfer' | 'return' | 'adjustment' | 'loss' | 'production' | 'assignment';
export type TransferStatus = 'pending' | 'approved' | 'in_transit' | 'received' | 'cancelled';
export type AlertType = 'critical_stock' | 'excess_stock' | 'immobile_inventory' | 'differences' | 'delayed_transfer' | 'losses' | 'high_shrinkage';
export type AlertPriority = 'urgent' | 'high' | 'medium' | 'low';
export type AuditStatus = 'pending' | 'in_progress' | 'completed' | 'with_differences';

export interface LogisticsNode {
  id: string;
  name: string;
  type: NodeType;
  status: NodeStatus;
  responsible: string;
  location?: string;
  stockTotal: number;
  stockValue: number;
  movementsToday: number;
  alerts: number;
  capacity: number;
  capacityUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
}

export interface Movement {
  id: string;
  type: MovementType;
  folio: string;
  originNode?: string;
  originNodeName?: string;
  destinationNode?: string;
  destinationNodeName?: string;
  user: string;
  timestamp: Date;
  reason: string;
  products: MovementProduct[];
  evidence?: string;
  status: 'completed' | 'pending' | 'cancelled';
  notes?: string;
}

export interface MovementProduct {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
}

export interface Transfer {
  id: string;
  folio: string;
  originNodeId: string;
  originNodeName: string;
  destinationNodeId: string;
  destinationNodeName: string;
  responsible: string;
  transport?: string;
  status: TransferStatus;
  products: MovementProduct[];
  createdAt: Date;
  sentAt?: Date;
  eta?: Date;
  receivedAt?: Date;
  evidence?: string[];
  notes?: string;
}

export interface StockItem {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  totalStock: number;
  available: number;
  reserved: number;
  inTransit: number;
  unit: string;
  rotation: number;
  stockByNode: { nodeId: string; nodeName: string; quantity: number }[];
  alerts: string[];
  lastMovement?: Date;
}

export interface Alert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  description: string;
  nodeId?: string;
  nodeName?: string;
  productId?: string;
  productName?: string;
  value?: number;
  createdAt: Date;
  resolvedAt?: Date;
  responsible?: string;
  actionable: boolean;
  action?: string;
}

export interface Audit {
  id: string;
  folio: string;
  nodeId: string;
  nodeName: string;
  type: 'cycle_count' | 'full_audit' | 'spot_check';
  status: AuditStatus;
  responsible: string;
  scheduledDate: Date;
  completedDate?: Date;
  productsAudited: number;
  differencesFound: number;
  accuracy: number;
  adjustments: AuditAdjustment[];
  notes?: string;
  evidence?: string[];
}

export interface AuditAdjustment {
  productId: string;
  productName: string;
  sku: string;
  systemCount: number;
  physicalCount: number;
  difference: number;
  reason: string;
  approved: boolean;
  approvedBy?: string;
}

export interface TraceabilityEvent {
  id: string;
  type: MovementType;
  timestamp: Date;
  nodeId: string;
  nodeName: string;
  user: string;
  quantity: number;
  reason: string;
  evidence?: string;
}

export interface ProductTrace {
  productId: string;
  productName: string;
  sku: string;
  currentLocation: string;
  currentQuantity: number;
  events: TraceabilityEvent[];
}

export interface InventoryMetrics {
  accuracy: number;
  averageRotation: number;
  totalLosses: number;
  averageTransferTime: number;
  criticalStockItems: number;
  immobileInventoryItems: number;
  logisticsEfficiency: number;
  totalNodes: number;
  activeTransfers: number;
  movementsToday: number;
}

export interface Insight {
  id: string;
  type: 'warning' | 'critical' | 'success' | 'info';
  icon: string;
  message: string;
  actionable: boolean;
  action?: string;
  nodeId?: string;
}
