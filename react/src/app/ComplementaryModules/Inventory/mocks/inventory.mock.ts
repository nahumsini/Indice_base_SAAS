import type {
  LogisticsNode,
  Movement,
  Transfer,
  StockItem,
  Alert,
  Audit,
  ProductTrace,
  InventoryMetrics,
  Insight,
} from '../types/inventory.types';

// Mock Logistics Nodes
export const mockNodes: LogisticsNode[] = [
  {
    id: 'n1',
    name: 'Almacén Central',
    type: 'warehouse',
    status: 'healthy',
    responsible: 'Carlos Ruiz',
    location: 'Guadalajara, Jal.',
    stockTotal: 15420,
    stockValue: 3245680,
    movementsToday: 127,
    alerts: 0,
    capacity: 25000,
    capacityUsed: 15420,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2026-05-10T08:30:00'),
  },
  {
    id: 'n2',
    name: 'Sucursal Norte',
    type: 'branch',
    status: 'attention',
    responsible: 'Laura Martínez',
    location: 'Monterrey, N.L.',
    stockTotal: 8760,
    stockValue: 1876540,
    movementsToday: 84,
    alerts: 3,
    capacity: 8000,
    capacityUsed: 8760,
    createdAt: new Date('2024-03-15'),
    updatedAt: new Date('2026-05-10T09:15:00'),
  },
  {
    id: 'n3',
    name: 'Sucursal Sur',
    type: 'branch',
    status: 'healthy',
    responsible: 'Roberto Sánchez',
    location: 'CDMX',
    stockTotal: 6234,
    stockValue: 1456789,
    movementsToday: 56,
    alerts: 1,
    capacity: 10000,
    capacityUsed: 6234,
    createdAt: new Date('2024-05-20'),
    updatedAt: new Date('2026-05-10T07:45:00'),
  },
  {
    id: 'n4',
    name: 'Vehículo 12',
    type: 'vehicle',
    status: 'in_transit',
    responsible: 'Pedro Gómez',
    location: 'En ruta GDL → MTY',
    stockTotal: 450,
    stockValue: 89650,
    movementsToday: 2,
    alerts: 0,
    capacity: 500,
    capacityUsed: 450,
    createdAt: new Date('2025-01-05'),
    updatedAt: new Date('2026-05-10T06:00:00'),
  },
  {
    id: 'n5',
    name: 'Técnico Carlos',
    type: 'technician',
    status: 'healthy',
    responsible: 'Carlos Hernández',
    location: 'Zona Norte GDL',
    stockTotal: 78,
    stockValue: 45320,
    movementsToday: 12,
    alerts: 0,
    capacity: 100,
    capacityUsed: 78,
    createdAt: new Date('2025-08-12'),
    updatedAt: new Date('2026-05-10T10:20:00'),
  },
  {
    id: 'n6',
    name: 'Producción',
    type: 'production',
    status: 'production',
    responsible: 'Ana López',
    location: 'Planta Guadalajara',
    stockTotal: 2340,
    stockValue: 567890,
    movementsToday: 45,
    alerts: 0,
    capacity: 5000,
    capacityUsed: 2340,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2026-05-10T08:00:00'),
  },
  {
    id: 'n7',
    name: 'Consignación Cliente A',
    type: 'consignment',
    status: 'critical',
    responsible: 'Diana Torres',
    location: 'Cliente Corporativo',
    stockTotal: 123,
    stockValue: 78900,
    movementsToday: 3,
    alerts: 2,
    capacity: 500,
    capacityUsed: 123,
    createdAt: new Date('2025-11-10'),
    updatedAt: new Date('2026-05-10T09:30:00'),
  },
];

const legacyMockLocations = mockNodes.map((node, index) => ({
  id: node.id,
  code: `LOC-${String(index + 1).padStart(3, '0')}`,
  name: node.name,
  type: node.type === 'warehouse'
    ? 'almacen_central'
    : node.type === 'branch'
      ? 'sucursal'
      : node.type === 'vehicle'
        ? 'unidad_movil'
        : node.type === 'transit'
          ? 'transito'
          : 'bodega',
  isActive: node.status !== 'critical',
  address: node.location,
  capacity: node.capacity,
  occupation: node.capacityUsed,
  totalStock: node.stockTotal,
  movements: node.movementsToday,
  manager: node.responsible,
  phone: index % 2 === 0 ? '+52 33 0000 0000' : undefined,
}));

// Mock Movements
export const mockMovements: Movement[] = [
  {
    id: 'm1',
    type: 'transfer',
    folio: 'TRF-2026-001234',
    originNode: 'n1',
    originNodeName: 'Almacén Central',
    destinationNode: 'n2',
    destinationNodeName: 'Sucursal Norte',
    user: 'Carlos Ruiz',
    timestamp: new Date('2026-05-10T08:30:00'),
    reason: 'Reabastecimiento programado',
    products: [
      { productId: 'p1', productName: 'Cable Cat6 305m', sku: 'CAB-CAT6-305', quantity: 25, unit: 'pz' },
      { productId: 'p2', productName: 'Switch 24 puertos', sku: 'SW-24P-GIG', quantity: 5, unit: 'pz' },
    ],
    status: 'completed',
  },
  {
    id: 'm2',
    type: 'entry',
    folio: 'ENT-2026-005678',
    destinationNode: 'n1',
    destinationNodeName: 'Almacén Central',
    user: 'Laura Martínez',
    timestamp: new Date('2026-05-10T07:15:00'),
    reason: 'Compra proveedor XYZ',
    products: [
      { productId: 'p3', productName: 'Router WiFi 6', sku: 'ROU-WF6-AC', quantity: 50, unit: 'pz' },
    ],
    status: 'completed',
    evidence: 'doc-001.pdf',
  },
  {
    id: 'm3',
    type: 'exit',
    folio: 'SAL-2026-009876',
    originNode: 'n3',
    originNodeName: 'Sucursal Sur',
    user: 'Roberto Sánchez',
    timestamp: new Date('2026-05-10T06:45:00'),
    reason: 'Venta cliente final',
    products: [
      { productId: 'p4', productName: 'Access Point', sku: 'AP-DUAL-300', quantity: 3, unit: 'pz' },
    ],
    status: 'completed',
  },
  {
    id: 'm4',
    type: 'adjustment',
    folio: 'AJU-2026-002345',
    destinationNode: 'n2',
    destinationNodeName: 'Sucursal Norte',
    user: 'Laura Martínez',
    timestamp: new Date('2026-05-09T16:20:00'),
    reason: 'Ajuste por auditoría',
    products: [
      { productId: 'p5', productName: 'Patch Panel 24p', sku: 'PP-24P-CAT6', quantity: -2, unit: 'pz' },
    ],
    status: 'completed',
    notes: 'Diferencia encontrada en conteo físico',
  },
  {
    id: 'm5',
    type: 'return',
    folio: 'DEV-2026-007654',
    originNode: 'n3',
    originNodeName: 'Sucursal Sur',
    destinationNode: 'n1',
    destinationNodeName: 'Almacén Central',
    user: 'Roberto Sánchez',
    timestamp: new Date('2026-05-09T14:00:00'),
    reason: 'Devolución por defecto',
    products: [
      { productId: 'p2', productName: 'Switch 24 puertos', sku: 'SW-24P-GIG', quantity: 1, unit: 'pz' },
    ],
    status: 'completed',
  },
  {
    id: 'm6',
    type: 'assignment',
    folio: 'ASG-2026-003456',
    originNode: 'n1',
    originNodeName: 'Almacén Central',
    destinationNode: 'n5',
    destinationNodeName: 'Técnico Carlos',
    user: 'Carlos Hernández',
    timestamp: new Date('2026-05-10T10:20:00'),
    reason: 'Asignación para instalación',
    products: [
      { productId: 'p1', productName: 'Cable Cat6 305m', sku: 'CAB-CAT6-305', quantity: 2, unit: 'pz' },
      { productId: 'p4', productName: 'Access Point', sku: 'AP-DUAL-300', quantity: 4, unit: 'pz' },
    ],
    status: 'completed',
  },
];

// Mock Transfers
export const mockTransfers: Transfer[] = [
  {
    id: 't1',
    folio: 'TRF-2026-001234',
    originNodeId: 'n1',
    originNodeName: 'Almacén Central',
    destinationNodeId: 'n2',
    destinationNodeName: 'Sucursal Norte',
    responsible: 'Carlos Ruiz',
    transport: 'Vehículo 12',
    status: 'in_transit',
    products: [
      { productId: 'p1', productName: 'Cable Cat6 305m', sku: 'CAB-CAT6-305', quantity: 25, unit: 'pz' },
      { productId: 'p2', productName: 'Switch 24 puertos', sku: 'SW-24P-GIG', quantity: 5, unit: 'pz' },
    ],
    createdAt: new Date('2026-05-09T14:30:00'),
    sentAt: new Date('2026-05-10T06:00:00'),
    eta: new Date('2026-05-10T18:00:00'),
  },
  {
    id: 't2',
    folio: 'TRF-2026-001235',
    originNodeId: 'n1',
    originNodeName: 'Almacén Central',
    destinationNodeId: 'n3',
    destinationNodeName: 'Sucursal Sur',
    responsible: 'Laura Martínez',
    status: 'approved',
    products: [
      { productId: 'p3', productName: 'Router WiFi 6', sku: 'ROU-WF6-AC', quantity: 15, unit: 'pz' },
    ],
    createdAt: new Date('2026-05-10T08:00:00'),
    eta: new Date('2026-05-11T10:00:00'),
  },
  {
    id: 't3',
    folio: 'TRF-2026-001230',
    originNodeId: 'n2',
    originNodeName: 'Sucursal Norte',
    destinationNodeId: 'n1',
    destinationNodeName: 'Almacén Central',
    responsible: 'Roberto Sánchez',
    transport: 'Mensajería Express',
    status: 'received',
    products: [
      { productId: 'p5', productName: 'Patch Panel 24p', sku: 'PP-24P-CAT6', quantity: 3, unit: 'pz' },
    ],
    createdAt: new Date('2026-05-08T10:00:00'),
    sentAt: new Date('2026-05-08T14:00:00'),
    receivedAt: new Date('2026-05-09T11:00:00'),
  },
  {
    id: 't4',
    folio: 'TRF-2026-001228',
    originNodeId: 'n1',
    originNodeName: 'Almacén Central',
    destinationNodeId: 'n2',
    destinationNodeName: 'Sucursal Norte',
    responsible: 'Carlos Ruiz',
    status: 'pending',
    products: [
      { productId: 'p4', productName: 'Access Point', sku: 'AP-DUAL-300', quantity: 10, unit: 'pz' },
    ],
    createdAt: new Date('2026-05-07T09:00:00'),
    notes: 'Esperando aprobación de gerencia',
  },
];

// Mock Stock Items
export const mockStockItems: StockItem[] = [
  {
    productId: 'p1',
    productName: 'Cable Cat6 305m',
    sku: 'CAB-CAT6-305',
    category: 'Cableado',
    totalStock: 487,
    available: 432,
    reserved: 30,
    inTransit: 25,
    unit: 'pz',
    rotation: 8.5,
    stockByNode: [
      { nodeId: 'n1', nodeName: 'Almacén Central', quantity: 312 },
      { nodeId: 'n2', nodeName: 'Sucursal Norte', quantity: 98 },
      { nodeId: 'n3', nodeName: 'Sucursal Sur', quantity: 52 },
      { nodeId: 'n4', nodeName: 'Vehículo 12', quantity: 25 },
    ],
    alerts: [],
    lastMovement: new Date('2026-05-10T08:30:00'),
  },
  {
    productId: 'p2',
    productName: 'Switch 24 puertos',
    sku: 'SW-24P-GIG',
    category: 'Networking',
    totalStock: 124,
    available: 114,
    reserved: 5,
    inTransit: 5,
    unit: 'pz',
    rotation: 6.2,
    stockByNode: [
      { nodeId: 'n1', nodeName: 'Almacén Central', quantity: 78 },
      { nodeId: 'n2', nodeName: 'Sucursal Norte', quantity: 35 },
      { nodeId: 'n3', nodeName: 'Sucursal Sur', quantity: 6 },
      { nodeId: 'n4', nodeName: 'Vehículo 12', quantity: 5 },
    ],
    alerts: [],
    lastMovement: new Date('2026-05-10T08:30:00'),
  },
  {
    productId: 'p3',
    productName: 'Router WiFi 6',
    sku: 'ROU-WF6-AC',
    category: 'Networking',
    totalStock: 89,
    available: 74,
    reserved: 15,
    inTransit: 0,
    unit: 'pz',
    rotation: 12.3,
    stockByNode: [
      { nodeId: 'n1', nodeName: 'Almacén Central', quantity: 65 },
      { nodeId: 'n2', nodeName: 'Sucursal Norte', quantity: 18 },
      { nodeId: 'n3', nodeName: 'Sucursal Sur', quantity: 6 },
    ],
    alerts: [],
    lastMovement: new Date('2026-05-10T07:15:00'),
  },
  {
    productId: 'p4',
    productName: 'Access Point',
    sku: 'AP-DUAL-300',
    category: 'Networking',
    totalStock: 23,
    available: 13,
    reserved: 10,
    inTransit: 0,
    unit: 'pz',
    rotation: 15.7,
    stockByNode: [
      { nodeId: 'n1', nodeName: 'Almacén Central', quantity: 12 },
      { nodeId: 'n2', nodeName: 'Sucursal Norte', quantity: 8 },
      { nodeId: 'n5', nodeName: 'Técnico Carlos', quantity: 3 },
    ],
    alerts: ['Stock crítico'],
    lastMovement: new Date('2026-05-10T10:20:00'),
  },
  {
    productId: 'p5',
    productName: 'Patch Panel 24p',
    sku: 'PP-24P-CAT6',
    category: 'Cableado',
    totalStock: 156,
    available: 156,
    reserved: 0,
    inTransit: 0,
    unit: 'pz',
    rotation: 2.1,
    stockByNode: [
      { nodeId: 'n1', nodeName: 'Almacén Central', quantity: 98 },
      { nodeId: 'n2', nodeName: 'Sucursal Norte', quantity: 42 },
      { nodeId: 'n3', nodeName: 'Sucursal Sur', quantity: 16 },
    ],
    alerts: ['Inventario inmóvil'],
    lastMovement: new Date('2026-05-09T16:20:00'),
  },
];

const legacyMockInventoryLocations = mockStockItems.flatMap((item) =>
  item.stockByNode.map((stockNode) => {
    const reserved = stockNode.nodeId === item.stockByNode[0]?.nodeId ? item.reserved : 0;
    const inTransit = stockNode.nodeId === item.stockByNode[0]?.nodeId ? item.inTransit : 0;
    const minStock = item.alerts.length > 0 ? 50 : 20;
    const maxStock = Math.max(100, stockNode.quantity * 2);
    const available = Math.max(0, stockNode.quantity - reserved);
    const status = stockNode.quantity <= minStock / 2
      ? 'critico'
      : stockNode.quantity <= minStock
        ? 'bajo'
        : stockNode.quantity >= maxStock
          ? 'exceso'
          : 'normal';

    return {
      id: `${item.productId}-${stockNode.nodeId}`,
      productId: item.productId,
      productName: item.productName,
      productSku: item.sku,
      locationId: stockNode.nodeId,
      locationName: stockNode.nodeName,
      stock: stockNode.quantity,
      reserved,
      inTransit,
      available,
      minStock,
      maxStock,
      status,
    };
  }),
);

// Mock Alerts
export const mockAlerts: Alert[] = [
  {
    id: 'a1',
    type: 'critical_stock',
    priority: 'urgent',
    title: 'Stock crítico en Access Point',
    description: 'Solo quedan 23 unidades disponibles, por debajo del mínimo de 50',
    productId: 'p4',
    productName: 'Access Point',
    value: 23,
    createdAt: new Date('2026-05-10T09:00:00'),
    actionable: true,
    action: 'Generar orden de compra',
  },
  {
    id: 'a2',
    type: 'excess_stock',
    priority: 'medium',
    title: 'Sucursal Norte cerca de capacidad máxima',
    description: 'Capacidad al 109.5% - Se recomienda redistribuir inventario',
    nodeId: 'n2',
    nodeName: 'Sucursal Norte',
    value: 109.5,
    createdAt: new Date('2026-05-10T08:00:00'),
    actionable: true,
    action: 'Programar transferencia',
  },
  {
    id: 'a3',
    type: 'delayed_transfer',
    priority: 'high',
    title: 'Transferencia TRF-2026-001228 pendiente hace 3 días',
    description: 'Transferencia creada el 07/05 aún no ha sido aprobada',
    value: 3,
    createdAt: new Date('2026-05-10T07:30:00'),
    actionable: true,
    action: 'Revisar aprobación',
  },
  {
    id: 'a4',
    type: 'immobile_inventory',
    priority: 'low',
    title: '12 productos sin movimiento en 60 días',
    description: 'Se detectaron productos con baja rotación que ocupan espacio',
    value: 12,
    createdAt: new Date('2026-05-09T10:00:00'),
    actionable: true,
    action: 'Ver reporte',
  },
  {
    id: 'a5',
    type: 'differences',
    priority: 'high',
    title: 'Diferencias encontradas en auditoría',
    description: 'Auditoría AUD-2026-045 detectó diferencias en 8 productos',
    nodeId: 'n2',
    nodeName: 'Sucursal Norte',
    value: 8,
    createdAt: new Date('2026-05-09T16:45:00'),
    actionable: true,
    action: 'Revisar ajustes',
  },
];

export const mockIncidents = mockAlerts.map((alert, index) => ({
  id: alert.id,
  folio: `INC-2026-${String(index + 41).padStart(3, '0')}`,
  title: alert.title,
  description: alert.description,
  priority: alert.priority === 'urgent'
    ? 'critica'
    : alert.priority === 'high'
      ? 'alta'
      : alert.priority === 'medium'
        ? 'media'
        : 'baja',
  status: alert.resolvedAt ? 'resuelta' : 'abierta',
  locationName: alert.nodeName,
  productName: alert.productName,
  reportedBy: alert.responsible ?? 'Sistema de inventarios',
  reportedAt: alert.createdAt,
  estimatedCost: alert.value ? Math.round(alert.value * 120) : undefined,
  solution: alert.resolvedAt ? 'Incidencia atendida y cerrada por operación.' : undefined,
}));

// Mock Audits
export const mockAudits: Audit[] = [
  {
    id: 'aud1',
    folio: 'AUD-2026-045',
    nodeId: 'n2',
    nodeName: 'Sucursal Norte',
    type: 'cycle_count',
    status: 'completed',
    responsible: 'Laura Martínez',
    scheduledDate: new Date('2026-05-09T08:00:00'),
    completedDate: new Date('2026-05-09T16:30:00'),
    productsAudited: 145,
    differencesFound: 8,
    accuracy: 94.5,
    adjustments: [
      {
        productId: 'p5',
        productName: 'Patch Panel 24p',
        sku: 'PP-24P-CAT6',
        systemCount: 44,
        physicalCount: 42,
        difference: -2,
        reason: 'Diferencia en conteo físico',
        approved: true,
        approvedBy: 'Carlos Ruiz',
      },
      {
        productId: 'p1',
        productName: 'Cable Cat6 305m',
        sku: 'CAB-CAT6-305',
        systemCount: 97,
        physicalCount: 98,
        difference: 1,
        reason: 'Error de registro previo',
        approved: true,
        approvedBy: 'Carlos Ruiz',
      },
    ],
  },
  {
    id: 'aud2',
    folio: 'AUD-2026-046',
    nodeId: 'n3',
    nodeName: 'Sucursal Sur',
    type: 'spot_check',
    status: 'in_progress',
    responsible: 'Roberto Sánchez',
    scheduledDate: new Date('2026-05-10T09:00:00'),
    productsAudited: 45,
    differencesFound: 0,
    accuracy: 100,
    adjustments: [],
  },
  {
    id: 'aud3',
    folio: 'AUD-2026-047',
    nodeId: 'n1',
    nodeName: 'Almacén Central',
    type: 'full_audit',
    status: 'pending',
    responsible: 'Carlos Ruiz',
    scheduledDate: new Date('2026-05-15T08:00:00'),
    productsAudited: 0,
    differencesFound: 0,
    accuracy: 0,
    adjustments: [],
  },
];

export const mockCounts = mockAudits.map((audit) => ({
  id: audit.id,
  folio: audit.folio,
  locationName: audit.nodeName,
  status: audit.status === 'pending'
    ? 'pendiente'
    : audit.status === 'in_progress'
      ? 'proceso'
      : audit.differencesFound > 0
        ? 'diferencia'
        : 'validado',
  totalItems: audit.productsAudited,
  differences: audit.differencesFound,
  countedBy: audit.responsible,
  startedAt: audit.scheduledDate,
  items: audit.adjustments.map((adjustment) => ({
    id: adjustment.productId,
    productName: adjustment.productName,
    systemStock: adjustment.systemCount,
    countedStock: adjustment.physicalCount,
    difference: adjustment.difference,
    hasDifference: adjustment.difference !== 0,
  })),
}));

// Mock Product Trace
export const mockProductTraces: ProductTrace[] = [
  {
    productId: 'p1',
    productName: 'Cable Cat6 305m',
    sku: 'CAB-CAT6-305',
    currentLocation: 'Almacén Central',
    currentQuantity: 312,
    events: [
      {
        id: 'e1',
        type: 'entry',
        timestamp: new Date('2026-04-15T10:00:00'),
        nodeId: 'n1',
        nodeName: 'Almacén Central',
        user: 'Sistema Compras',
        quantity: 500,
        reason: 'Compra inicial',
      },
      {
        id: 'e2',
        type: 'transfer',
        timestamp: new Date('2026-04-20T14:00:00'),
        nodeId: 'n2',
        nodeName: 'Sucursal Norte',
        user: 'Carlos Ruiz',
        quantity: -100,
        reason: 'Reabastecimiento sucursal',
      },
      {
        id: 'e3',
        type: 'transfer',
        timestamp: new Date('2026-04-25T11:00:00'),
        nodeId: 'n3',
        nodeName: 'Sucursal Sur',
        user: 'Laura Martínez',
        quantity: -50,
        reason: 'Reabastecimiento sucursal',
      },
      {
        id: 'e4',
        type: 'exit',
        timestamp: new Date('2026-05-02T09:30:00'),
        nodeId: 'n1',
        nodeName: 'Almacén Central',
        user: 'Roberto Sánchez',
        quantity: -38,
        reason: 'Venta directa',
      },
      {
        id: 'e5',
        type: 'transfer',
        timestamp: new Date('2026-05-10T08:30:00'),
        nodeId: 'n4',
        nodeName: 'Vehículo 12',
        user: 'Carlos Ruiz',
        quantity: -25,
        reason: 'Transferencia en tránsito',
      },
    ],
  },
];

// Mock Metrics
export const mockMetrics: InventoryMetrics = {
  accuracy: 96.8,
  averageRotation: 8.9,
  totalLosses: 45680,
  averageTransferTime: 18.5,
  criticalStockItems: 4,
  immobileInventoryItems: 12,
  logisticsEfficiency: 87.3,
  totalNodes: 7,
  activeTransfers: 2,
  movementsToday: 127,
};

// Mock Insights
export const mockInsights: Insight[] = [
  {
    id: 'i1',
    type: 'critical',
    icon: '🔥',
    message: 'Sucursal Norte saturada al 109.5% de capacidad',
    actionable: true,
    action: 'Redistribuir inventario',
    nodeId: 'n2',
  },
  {
    id: 'i2',
    type: 'warning',
    icon: '⚠️',
    message: '4 transferencias retrasadas más de 2 días',
    actionable: true,
    action: 'Revisar pendientes',
  },
  {
    id: 'i3',
    type: 'success',
    icon: '📈',
    message: 'Rotación alta esta semana: +15% vs. promedio',
    actionable: false,
  },
  {
    id: 'i4',
    type: 'warning',
    icon: '⚠️',
    message: '12 productos inmóviles hace más de 60 días',
    actionable: true,
    action: 'Ver análisis',
  },
  {
    id: 'i5',
    type: 'info',
    icon: '📦',
    message: 'Vehículo 12 pendiente de recepción (ETA 18:00)',
    actionable: true,
    action: 'Seguimiento',
    nodeId: 'n4',
  },
  {
    id: 'i6',
    type: 'success',
    icon: '🔥',
    message: 'Almacén Central con mayor movimiento: 127 operaciones hoy',
    actionable: false,
    nodeId: 'n1',
  },
];

const nodeTypeToLegacyLocationType: Record<LogisticsNode['type'], string> = {
  warehouse: 'almacen_central',
  branch: 'sucursal',
  vehicle: 'unidad_movil',
  technician: 'bodega',
  transit: 'transito',
  production: 'bodega',
  consignment: 'bodega',
};

export const mockLocations = mockNodes.map((node, index) => ({
  id: node.id,
  name: node.name,
  code: `UBI-${String(index + 1).padStart(3, '0')}`,
  type: nodeTypeToLegacyLocationType[node.type],
  isActive: node.status !== 'critical',
  address: node.location,
  capacity: node.capacity,
  occupation: node.capacityUsed,
  totalStock: node.stockTotal,
  movements: node.movementsToday,
  manager: node.responsible,
  phone: index % 2 === 0 ? '+52 33 5555 0100' : '+52 81 5555 0200',
}));

const legacyStockStatus = (stock: number, minStock: number, maxStock: number) => {
  if (stock <= minStock) {
    return 'critico';
  }
  if (stock <= minStock * 1.5) {
    return 'bajo';
  }
  if (stock >= maxStock) {
    return 'exceso';
  }
  return 'normal';
};

export const mockInventoryLocations = mockStockItems.flatMap((item) =>
  item.stockByNode.map((nodeStock) => {
    const minStock = item.alerts.includes('Stock crítico') ? 50 : 20;
    const maxStock = Math.max(minStock * 4, Math.ceil(nodeStock.quantity * 1.35));
    const reserved = Math.min(item.reserved, Math.max(nodeStock.quantity, 0));
    const inTransit = item.inTransit > 0 && nodeStock.nodeId === 'n4' ? item.inTransit : 0;
    return {
      id: `${item.productId}-${nodeStock.nodeId}`,
      productId: item.productId,
      productName: item.productName,
      productSku: item.sku,
      locationId: nodeStock.nodeId,
      locationName: nodeStock.nodeName,
      stock: nodeStock.quantity,
      reserved,
      inTransit,
      available: Math.max(nodeStock.quantity - reserved, 0),
      minStock,
      maxStock,
      status: legacyStockStatus(nodeStock.quantity, minStock, maxStock),
    };
  })
);

const legacyMockCounts = [
  {
    id: 'cnt-1',
    folio: 'CNT-2026-001',
    locationName: 'Sucursal Norte',
    status: 'diferencia',
    totalItems: 145,
    differences: 2,
    countedBy: 'Laura Martínez',
    startedAt: new Date('2026-05-09T08:00:00'),
    items: [
      {
        id: 'cnt-1-p5',
        productName: 'Patch Panel 24p',
        systemStock: 44,
        countedStock: 42,
        difference: -2,
        hasDifference: true,
      },
      {
        id: 'cnt-1-p1',
        productName: 'Cable Cat6 305m',
        systemStock: 97,
        countedStock: 98,
        difference: 1,
        hasDifference: true,
      },
    ],
  },
  {
    id: 'cnt-2',
    folio: 'CNT-2026-002',
    locationName: 'Almacén Central',
    status: 'validado',
    totalItems: 210,
    differences: 0,
    countedBy: 'Carlos Ruiz',
    startedAt: new Date('2026-05-10T09:00:00'),
    items: [],
  },
  {
    id: 'cnt-3',
    folio: 'CNT-2026-003',
    locationName: 'Sucursal Sur',
    status: 'pendiente',
    totalItems: 86,
    differences: 0,
    countedBy: null,
    startedAt: new Date('2026-05-11T09:00:00'),
    items: [],
  },
];

const alertPriorityToLegacyPriority: Record<Alert['priority'], string> = {
  urgent: 'critica',
  high: 'alta',
  medium: 'media',
  low: 'baja',
};

const legacyMockIncidents = mockAlerts.map((alert, index) => ({
  id: alert.id,
  folio: `INC-2026-${String(index + 1).padStart(3, '0')}`,
  title: alert.title,
  description: alert.description,
  priority: alertPriorityToLegacyPriority[alert.priority],
  status: alert.resolvedAt ? 'resuelta' : 'abierta',
  locationName: alert.nodeName,
  productName: alert.productName,
  reportedBy: alert.responsible || 'Sistema',
  reportedAt: alert.createdAt,
  estimatedCost: alert.value ? Math.round(alert.value * 100) : null,
  solution: alert.resolvedAt ? 'Incidencia cerrada y documentada.' : null,
}));
