import * as z from "zod/v4";

const page = {
  generatedAt: z.iso.datetime(),
  scopeType: z.string().min(1),
  returnedCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  nextCursor: z.string().max(256).nullable()
};
const identity = {
  id: z.number().int().positive(),
  name: z.string().min(1),
  status: z.string().nullable(),
  unitId: z.number().int().positive().nullable(),
  businessId: z.number().int().positive().nullable()
};

export const customerReferencePageSchema = z.object({
  ...page,
  items: z.array(z.object({ ...identity, code: z.string().nullable() })).max(50)
});
export const warehouseReferencePageSchema = z.object({
  ...page,
  items: z.array(z.object({ ...identity, code: z.string().nullable(), type: z.string().nullable() })).max(50)
});
export const providerReferencePageSchema = z.object({
  ...page,
  items: z.array(z.object({
    ...identity, legalName: z.string().nullable(), paymentTermsDays: z.number().int().nonnegative().nullable()
  })).max(50)
});
export const budgetLineReferencePageSchema = z.object({
  ...page,
  items: z.array(z.object({
    ...identity,
    budgetId: z.number().int().positive().nullable(),
    categoryKey: z.string().nullable(),
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    plannedAmount: z.number(), committedAmount: z.number(), actualExpenseAmount: z.number(), availableAmount: z.number(),
    healthStatus: z.string()
  })).max(50)
});
export const accountingAccountReferencePageSchema = z.object({
  ...page,
  items: z.array(z.object({ ...identity, code: z.string(), groupKey: z.string() })).max(50)
});

export type CustomerReferencePage = z.infer<typeof customerReferencePageSchema>;
export type WarehouseReferencePage = z.infer<typeof warehouseReferencePageSchema>;
export type ProviderReferencePage = z.infer<typeof providerReferencePageSchema>;
export type BudgetLineReferencePage = z.infer<typeof budgetLineReferencePageSchema>;
export type AccountingAccountReferencePage = z.infer<typeof accountingAccountReferencePageSchema>;

export const taskAssigneeReferencePageSchema = z.object({
  ...page,
  items: z.array(z.object({
    userCompanyId: z.number().int().positive(), name: z.string().min(1),
    unitId: z.number().int().positive().nullable(), unitName: z.string().nullable(),
    businessId: z.number().int().positive().nullable(), businessName: z.string().nullable()
  })).max(50)
});
export type TaskAssigneeReferencePage = z.infer<typeof taskAssigneeReferencePageSchema>;
