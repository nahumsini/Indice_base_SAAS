import { apiClient } from "../../../lib/apiClient";

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
export type Choice = { id: number; name: string };
export type Step = { label: string; required: boolean; done: boolean };
export type Settings = {
  timezone: string;
  currency: string;
  hourlyRate: number;
  criticalHours: number;
  highHours: number;
  normalHours: number;
  lowHours: number;
  categories: string[];
  specialties: string[];
  procedures: { name: string; steps: Step[]; evidenceRequired: boolean }[];
  evidenceRequired: boolean;
  version: number;
};
export type Context = {
  manager: boolean;
  administrator: boolean;
  userId: number;
  assignment: { unitId: number | null; businessId: number | null };
  inventory: boolean;
  expenses: boolean;
  hrAssets: boolean;
  tasks: boolean;
  settings: Settings;
};
export type Asset = {
  id: number;
  name: string;
  assetType: string;
  hrAssetId: number | null;
  unitId: number | null;
  businessId: number | null;
  location: string;
  criticality: string;
  notes: string;
  active: boolean;
  unavailable: boolean;
  version: number;
};
export type RequestItem = {
  id: number;
  assetId: number | null;
  assetName: string | null;
  requesterId: number;
  title: string;
  description: string;
  location: string;
  priority: string;
  category: string;
  status: string;
  responseAt: string | null;
  createdAt: string;
  orderId: number | null;
  version: number;
};
export type Order = {
  id: number;
  assetId: number | null;
  assetName: string | null;
  requestId: number | null;
  planId: number | null;
  title: string;
  description: string;
  orderType: string;
  priority: string;
  category: string;
  status: string;
  assigneeId: number | null;
  assigneeName: string | null;
  dueAt: string;
  originalDueAt: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  timezone: string;
  diagnosis: string;
  resolution: string;
  checklist: Step[];
  evidenceRequired: boolean;
  blocking: boolean;
  currency: string;
  estimatedAmount: number;
  startedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  version: number;
};
export type Event = {
  id: number;
  action: string;
  actorId: number | null;
  reason: string;
  createdAt: string;
};
export type Attachment = {
  id: number;
  filename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};
export type OrderDetail = {
  order: Order;
  history: Event[];
  attachments: Attachment[];
  taskId: number | null;
};
export type RequestDetail = {
  request: RequestItem;
  history: Event[];
  attachments: Attachment[];
};
export type Plan = {
  id: number;
  assetId: number;
  assetName: string;
  title: string;
  description: string;
  priority: string;
  anchorDate: string;
  frequency: string;
  intervalCount: number;
  timezone: string;
  leadDays: number;
  nextCycle: number;
  nextDate: string;
  checklist: Step[];
  evidenceRequired: boolean;
  active: boolean;
  currency: string;
  estimatedAmount: number;
  version: number;
};
export type Metrics = {
  from: string;
  to: string;
  open: number;
  overdue: number;
  critical: number;
  preventiveDue: number;
  preventiveOnTime: number;
  responseHours: number | null;
  repairHours: number | null;
  downtimeHours: number | null;
};
export type Labor = {
  id: number;
  technicianId: number;
  minutes: number;
  hourlyRate: number;
  amount: number;
  currency: string;
  note: string;
  reversed: boolean;
};
export type Part = {
  id: number;
  movementId: number;
  productName: string;
  warehouseName: string;
  quantity: number;
  unitCost: number;
  currency: string;
  reversed: boolean;
};
export type ExpenseLink = {
  id: number;
  concept: string;
  costType: string;
  currency: string;
  actual: number | null;
  paid: number | null;
  available: boolean;
};
export type Costs = {
  currency: string;
  estimated: number;
  labor: number;
  parts: number | null;
  services: number | null;
  actual: number | null;
  paidServices: number | null;
  complete: boolean;
  laborEntries: Labor[];
  partEntries: Part[];
  expenses: ExpenseLink[];
};
export type Balance = {
  id: number;
  productId: number;
  productName: string;
  warehouseId: number;
  warehouseName: string;
  currency: string;
  freeQuantity: number;
  unitCost: number;
  inventoryUnit: string;
};
export const orderStatuses = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_PARTS",
  "WAITING_VENDOR",
  "PENDING_VALIDATION",
  "CLOSED",
  "CANCELLED",
];
export const priorities = ["LOW", "NORMAL", "HIGH", "CRITICAL"];
export const base = "/api/v1/maintenance";
export function query(
  values: Record<string, string | number | boolean | null | undefined>,
) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null) params.set(key, String(value));
  });
  return `?${params}`;
}
export const maintenanceApi = {
  get: <T>(path: string, signal?: AbortSignal) =>
    apiClient<T>(base + path, { signal }),
  save: <T>(path: string, body: unknown, method = "POST", key?: string) =>
    apiClient<T>(base + path, {
      method,
      body: JSON.stringify(body),
      headers: key ? { "Idempotency-Key": key } : undefined,
    }),
  upload: async (type: string, id: number, file: File) => {
    const ticket = await maintenanceApi.save<{
      id: string;
      url: string;
      method: string;
      headers: Record<string, string>;
    }>(`/evidence/${type}/${id}/upload`, {
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    });
    const result = await fetch(ticket.url, {
      method: ticket.method,
      headers: ticket.headers,
      body: file,
    });
    if (!result.ok) throw new Error("Upload failed");
    return maintenanceApi.save<Attachment[]>(
      `/evidence/${type}/${id}/register`,
      { id: ticket.id },
    );
  },
};
