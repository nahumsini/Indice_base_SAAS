import type { CustomerTableCopy } from "./customerTableCopy";

export type CustomerTableColumnId =
  | "customer"
  | "userType"
  | "distributor"
  | "status"
  | "plan"
  | "users"
  | "rate"
  | "nextEvent";

export const defaultCustomerTableColumnIds: CustomerTableColumnId[] = [
  "customer",
  "userType",
  "distributor",
  "status",
  "plan",
  "users",
  "rate",
  "nextEvent",
];

export const customerTableDefaultWidths: Record<CustomerTableColumnId, number> = {
  customer: 260,
  userType: 160,
  distributor: 250,
  status: 130,
  plan: 250,
  users: 170,
  rate: 190,
  nextEvent: 190,
};

export const customerTableMinimumWidths: Record<CustomerTableColumnId, number> = {
  customer: 220,
  userType: 140,
  distributor: 190,
  status: 110,
  plan: 180,
  users: 140,
  rate: 150,
  nextEvent: 160,
};

export const customerTableMaximumWidths: Record<CustomerTableColumnId, number> = {
  customer: 380,
  userType: 260,
  distributor: 380,
  status: 220,
  plan: 400,
  users: 280,
  rate: 300,
  nextEvent: 320,
};

export const customerTableActionsWidth = 206;
export const customerTableColumnsStorageKey = "indice-platform-admin-customer-columns-v2";

export function getCustomerTableColumnLabels(copy: CustomerTableCopy): Record<CustomerTableColumnId, string> {
  return {
    customer: copy.account,
    userType: copy.userType,
    distributor: copy.commercialOrigin,
    status: copy.status,
    plan: copy.access,
    users: copy.users,
    rate: copy.billing,
    nextEvent: copy.nextEvent,
  };
}

export function normalizeCustomerTableColumnIds(value: unknown): CustomerTableColumnId[] {
  if (!Array.isArray(value)) return [...defaultCustomerTableColumnIds];

  const validIds = new Set<CustomerTableColumnId>(defaultCustomerTableColumnIds);
  const uniqueIds = value.filter(
    (columnId, index): columnId is CustomerTableColumnId =>
      typeof columnId === "string" &&
      validIds.has(columnId as CustomerTableColumnId) &&
      value.indexOf(columnId) === index,
  );

  return uniqueIds.includes("customer") ? uniqueIds : ["customer", ...uniqueIds];
}

export function loadCustomerTableColumnIds(): CustomerTableColumnId[] {
  if (typeof window === "undefined") return [...defaultCustomerTableColumnIds];

  try {
    const stored = window.localStorage.getItem(customerTableColumnsStorageKey);
    return stored ? normalizeCustomerTableColumnIds(JSON.parse(stored)) : [...defaultCustomerTableColumnIds];
  } catch {
    return [...defaultCustomerTableColumnIds];
  }
}

export function saveCustomerTableColumnIds(columnIds: CustomerTableColumnId[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    customerTableColumnsStorageKey,
    JSON.stringify(normalizeCustomerTableColumnIds(columnIds)),
  );
}
