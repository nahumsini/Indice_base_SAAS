import { z } from "zod";

const id = z.number().int().positive();
const text = z.string().nullable();
const optionalId = id.nullable();
const decimal = z.union([z.number().finite(), z.string().regex(/^-?\d+(?:\.\d+)?$/)]);
const amount = z.union([z.number().finite().nonnegative(), z.string().regex(/^\d+(?:\.\d+)?$/)]);
const currency = z.string().regex(/^[A-Z]{3}$/);
const unit = z.enum(["Piece", "Kilogram", "Gram", "Liter", "Meter"]);
export const inventoryReadNames = ["list_inventory_products", "get_inventory_product", "list_inventory_warehouses", "get_inventory_warehouse", "list_inventory_balances", "get_inventory_balance", "list_inventory_movements", "get_inventory_movement", "get_inventory_metrics"] as const;
export const inventoryActionNames = ["create_inventory_product", "update_inventory_product", "inactivate_inventory_product", "create_inventory_warehouse", "update_inventory_warehouse", "inactivate_inventory_warehouse", "configure_inventory_stock", "receive_inventory_stock", "issue_inventory_stock", "transfer_inventory_stock", "count_inventory_stock", "cancel_inventory_movement"] as const;
export const inventoryReadNameSchema = z.enum(inventoryReadNames);
export const inventoryActionNameSchema = z.enum(inventoryActionNames);

const productFields = {
  name: z.string().trim().min(1).max(220), sku: z.string().max(80), description: z.string().max(10000), category: z.string().max(120),
  type: z.enum(["PRODUCT", "PACKAGE", "SERVICE"]), price: amount, cost: amount, currency,
  taxCategory: z.string().max(80), status: z.enum(["active", "inactive", "draft"]), visibility: z.enum(["commercial", "pos_ready", "quote_only", "internal"]),
  inventoryReady: z.boolean(), posReady: z.boolean(), inventoryUnit: unit,
};
export const inventoryProductInputSchema = z.object(productFields).partial().strict();
const productCreate = inventoryProductInputSchema.required({name: true, currency: true});
export const inventoryWarehouseInputSchema = z.object({name: z.string().trim().min(1).max(180), type: z.string().min(1).max(80), unitId: id, businessId: id,
  responsibleUserCompanyId: id, addressNote: z.string().max(1000), status: z.enum(["active", "inactive"])}).partial().strict();
const warehouseCreate = inventoryWarehouseInputSchema.required({name: true, unitId: true, businessId: true});
export const inventoryStockPolicySchema = z.object({productId: id, warehouseId: id, minimumQuantity: amount.optional(), usesInventory: z.boolean().optional(), enableInventory: z.boolean().optional()}).strict();
const line = z.object({productId: id, quantity: amount, unitCost: amount.optional()}).strict();
export const inventoryMovementInputSchema = z.object({fromWarehouseId: id.optional(), toWarehouseId: id.optional(), date: z.iso.date(), providerId: id.optional(),
  reason: z.string().trim().min(1).max(1000), reference: z.string().max(120).optional(), items: z.array(line).min(1).max(100)}).strict();
export const inventoryChangeSchema = z.object({id: id.optional(), product: inventoryProductInputSchema.optional(), warehouse: inventoryWarehouseInputSchema.optional(), stock: inventoryStockPolicySchema.optional(),
  movement: inventoryMovementInputSchema.optional(), reason: z.string().max(1000).optional()}).strict();
export const inventoryQuerySchema = z.object({id: id.optional(), productId: id.optional(), warehouseId: id.optional(), query: z.string().max(120).optional(), status: z.string().max(40).optional(),
  belowMinimum: z.boolean().optional(), from: z.iso.date().optional(), to: z.iso.date().optional(), limit: id.max(100).optional(), cursor: z.string().max(160).optional()}).strict();
const lifecycle = z.object({id, reason: z.string().trim().min(1).max(1000)}).strict();
export const inventoryInputs = {
  create_inventory_product: z.object({product: productCreate}).strict(), update_inventory_product: z.object({id, product: inventoryProductInputSchema}).strict(), inactivate_inventory_product: lifecycle,
  create_inventory_warehouse: z.object({warehouse: warehouseCreate}).strict(), update_inventory_warehouse: z.object({id, warehouse: inventoryWarehouseInputSchema}).strict(), inactivate_inventory_warehouse: lifecycle,
  configure_inventory_stock: z.object({stock: inventoryStockPolicySchema}).strict(),
  receive_inventory_stock: z.object({movement: inventoryMovementInputSchema.omit({fromWarehouseId: true}).required({toWarehouseId: true, providerId: true}).extend({items: z.array(line.required({unitCost: true})).min(1).max(100)})}).strict(),
  issue_inventory_stock: z.object({movement: inventoryMovementInputSchema.omit({toWarehouseId: true, providerId: true}).required({fromWarehouseId: true}).extend({items:z.array(line.omit({unitCost:true})).min(1).max(100)})}).strict(),
  transfer_inventory_stock: z.object({movement: inventoryMovementInputSchema.omit({providerId: true}).required({fromWarehouseId: true, toWarehouseId: true}).extend({items:z.array(line.omit({unitCost:true})).min(1).max(100)})}).strict(),
  count_inventory_stock: z.object({movement: inventoryMovementInputSchema.omit({toWarehouseId: true, providerId: true}).required({fromWarehouseId: true}).extend({items:z.array(line.omit({unitCost:true})).min(1).max(100)})}).strict(), cancel_inventory_movement: lifecycle,
} as const;

export const inventoryProductSchema = z.object({id: optionalId, code: text, name: z.string(), sku: text, description: text, category: text, type: z.string(), price: decimal, cost: decimal,
  currency, taxCategory: text, status: z.string(), visibility: text, inventoryReady: z.boolean(), posReady: z.boolean(), inventoryUnit: z.string().min(1), readyForSales: z.boolean()}).strict();
export const inventoryWarehouseSchema = z.object({id: optionalId, code: text, name: z.string(), type: z.string(), unitId: id, unitName: text, businessId: id, businessName: text,
  responsibleUserCompanyId: optionalId, responsibleName: text, addressNote: text, status: z.string()}).strict();
export const inventoryBalanceSchema = z.object({id: optionalId, productId: id, productName: z.string(), warehouseId: id, warehouseName: z.string(), inventoryUnit: z.string().min(1), currency,
  availableQuantity: decimal, reservedQuantity: decimal, freeQuantity: decimal, minimumQuantity: decimal, unitCost: decimal, usesInventory: z.boolean(), belowMinimum: z.boolean()}).strict();
export const inventoryMovementSchema = z.object({id: optionalId, number: text, groupId: text, productId: optionalId, productName: z.string(), type: z.string(), quantity: decimal, unitCost: decimal,
  fromWarehouseId: optionalId, toWarehouseId: optionalId, reason: text, reference: text, date: z.iso.date(), status: z.string(), reversalOf: optionalId}).strict();
export const inventorySnapshotSchema = z.object({products: z.array(inventoryProductSchema), warehouses: z.array(inventoryWarehouseSchema), balances: z.array(inventoryBalanceSchema), movements: z.array(inventoryMovementSchema)}).strict();
export const inventoryResultSchema = z.object({action: inventoryActionNameSchema, records: inventorySnapshotSchema}).strict();
export const inventoryPreviewSchema = z.object({action: inventoryActionNameSchema, confirmationToken: z.string().regex(/^idx_confirm_[A-Za-z0-9_-]{43}$/), expiresAt: z.string(),
  requiresConfirmation: z.literal(true), before: inventorySnapshotSchema, after: inventorySnapshotSchema, changes: inventoryChangeSchema, effects: z.array(z.string()).min(1)}).strict();
// Jackson keeps absent record members as null in confirmation output; the input contract still excludes them.
export const inventoryConfirmedChangeSchema = z.object({id: optionalId, product: inventoryProductInputSchema.nullable(), warehouse: inventoryWarehouseInputSchema.nullable(), stock: inventoryStockPolicySchema.nullable(),
  movement: inventoryMovementInputSchema.nullable(), reason: text}).strict();
export const inventoryCommitRequestSchema = z.object({confirmationToken: z.string().regex(/^idx_confirm_[A-Za-z0-9_-]{43}$/), idempotencyKey: z.string().min(8).max(128)}).strict();
export const inventoryCommittedSchema = z.object({action: inventoryActionNameSchema, replayed: z.boolean(), correlationId: z.string(), result: inventoryResultSchema}).strict();
const page = <T extends z.ZodType>(item: T) => z.object({items: z.array(item), totalCount: z.number().int().nonnegative(), hasMore: z.boolean(), nextCursor: text, scope: z.string()}).strict();
export const inventorySummarySchema = z.object({balanceCount: z.number().int().nonnegative(), belowMinimumCount: z.number().int().nonnegative(), values: z.array(z.object({currency, inventoryValue: decimal}).strict()), scope: z.string()}).strict();
export const inventoryReadSchemas = {
  list_inventory_products: page(inventoryProductSchema), get_inventory_product: inventoryProductSchema.extend({id}),
  list_inventory_warehouses: page(inventoryWarehouseSchema), get_inventory_warehouse: inventoryWarehouseSchema.extend({id}),
  list_inventory_balances: page(inventoryBalanceSchema), get_inventory_balance: inventoryBalanceSchema.extend({id}),
  list_inventory_movements: page(inventoryMovementSchema), get_inventory_movement: inventoryMovementSchema.extend({id}), get_inventory_metrics: inventorySummarySchema,
} as const;
export type InventoryReadName = z.infer<typeof inventoryReadNameSchema>;
export type InventoryActionName = z.infer<typeof inventoryActionNameSchema>;
export type InventoryQuery = z.infer<typeof inventoryQuerySchema>;
export type InventoryChange = z.infer<typeof inventoryChangeSchema>;
export type InventoryReadResult = z.infer<(typeof inventoryReadSchemas)[InventoryReadName]>;
export type InventoryPreview = z.infer<typeof inventoryPreviewSchema>;
export type InventoryCommitted = z.infer<typeof inventoryCommittedSchema>;
