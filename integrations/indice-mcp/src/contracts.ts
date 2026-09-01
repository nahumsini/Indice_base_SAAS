import { z } from "zod";

const nativeCurrencyTotalSchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  amount: z.number()
});

const exchangeRateContextSchema = z.object({
  mode: z.string(),
  effectiveDate: z.iso.date(),
  source: z.string()
});

const monetaryTotalSchema = z.object({
  preferredCurrency: z.string().regex(/^[A-Z]{3}$/),
  preferredTotal: z.number(),
  nativeTotals: z.array(nativeCurrencyTotalSchema),
  exchangeRate: exchangeRateContextSchema,
  partial: z.boolean(),
  excludedRecords: z.number().int().nonnegative(),
  excludedCurrencies: z.array(z.string())
});

export const salesTodaySummarySchema = z.object({
  date: z.iso.date(),
  timezone: z.string().min(1),
  saleCount: z.number().int().nonnegative(),
  monetaryTotal: monetaryTotalSchema
});

export type SalesTodaySummary = z.infer<typeof salesTodaySummarySchema>;

export const businessPeriodSchema = z.enum([
  "monthly",
  "bimonthly",
  "quarterly",
  "semester",
  "annual",
  "custom"
]);

export const businessSnapshotQuerySchema = z.object({
  period: businessPeriodSchema.optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  preferredCurrency: z.string().regex(/^[A-Z]{3}$/).optional()
}).superRefine((value, context) => {
  if ((value.from || value.to) && value.period !== "custom") {
    context.addIssue({
      code: "custom",
      message: "from and to require period custom."
    });
  }
  if (value.period === "custom" && (!value.from || !value.to)) {
    context.addIssue({
      code: "custom",
      message: "period custom requires from and to."
    });
  }
});

export const businessSnapshotSchema = z.object({
  range: z.object({
    from: z.iso.date(),
    to: z.iso.date(),
    period: businessPeriodSchema
  }),
  context: z.object({
    currency: z.string().regex(/^[A-Z]{3}$/),
    generatedAt: z.iso.datetime(),
    scopeLabel: z.string().min(1)
  }),
  summary: z.object({
    salesTotal: z.number(),
    collectedTotal: z.number(),
    expensesTotal: z.number(),
    payablesTotal: z.number(),
    receivablesTotal: z.number(),
    overdueReceivables: z.number(),
    pettyCashBalance: z.number(),
    operatingProfit: z.number(),
    operatingMargin: z.number(),
    totalTasks: z.number().int().nonnegative(),
    overdueTasks: z.number().int().nonnegative(),
    absences: z.number().int().nonnegative(),
    attendanceRate: z.number(),
    organizationRows: z.number().int().nonnegative(),
    executiveScore: z.number().int()
  }),
  alerts: z.array(z.object({
    status: z.enum(["healthy", "watch", "critical"]),
    title: z.string().min(1),
    description: z.string().min(1)
  }))
});

export type BusinessSnapshotQuery = z.infer<typeof businessSnapshotQuerySchema>;
export type BusinessSnapshot = z.infer<typeof businessSnapshotSchema>;

export const attentionItemsSchema = z.object({
  range: businessSnapshotSchema.shape.range,
  context: businessSnapshotSchema.shape.context.extend({
    source: z.literal("executive_kpis")
  }),
  overview: z.object({
    executiveScore: z.number().int(),
    criticalCount: z.number().int().nonnegative(),
    watchCount: z.number().int().nonnegative(),
    healthy: z.boolean()
  }),
  items: z.array(z.object({
    status: z.enum(["critical", "watch"]),
    title: z.string().min(1),
    description: z.string().min(1)
  }))
});

export type AttentionItems = z.infer<typeof attentionItemsSchema>;

export const taskPrioritySchema = z.enum(["low", "medium", "high"]);

export const taskPreviewRequestSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().min(1).max(2000).optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.iso.date().optional()
});

export const taskDraftSchema = z.object({
  title: z.string().min(1).max(180),
  description: z.string().nullable(),
  priority: taskPrioritySchema,
  dueDate: z.iso.date().nullable(),
  assignee: z.literal("Usuario conectado")
});

export const taskPreviewResponseSchema = z.object({
  confirmationToken: z.string().startsWith("idx_confirm_"),
  expiresAt: z.iso.datetime(),
  requiresConfirmation: z.literal(true),
  task: taskDraftSchema
});

export const taskCommitRequestSchema = z.object({
  confirmationToken: z.string().startsWith("idx_confirm_"),
  idempotencyKey: z.string().min(8).max(128)
});

export const taskResultSchema = z.object({
  id: z.number().int().positive(),
  folio: z.string().nullable(),
  title: z.string().min(1),
  status: z.string().min(1),
  dueDate: z.iso.date().nullable()
});

export const taskCommitResponseSchema = z.object({
  replayed: z.boolean(),
  correlationId: z.uuid(),
  task: taskResultSchema
});

export type TaskPreviewRequest = z.infer<typeof taskPreviewRequestSchema>;
export type TaskPreviewResponse = z.infer<typeof taskPreviewResponseSchema>;
export type TaskCommitRequest = z.infer<typeof taskCommitRequestSchema>;
export type TaskCommitResponse = z.infer<typeof taskCommitResponseSchema>;

export const businessQueryResultSchema = z.object({
  tool: z.string().min(1),
  generatedAt: z.iso.datetime(),
  scope: z.string().min(1),
  count: z.number().int().nonnegative(),
  summary: z.record(z.string(), z.unknown()),
  items: z.array(z.record(z.string(), z.unknown())),
  detail: z.unknown().optional()
});

export type BusinessQueryResult = z.infer<typeof businessQueryResultSchema>;

export const financeActionNameSchema = z.enum([
  "create_expense_draft",
  "register_fund_expense",
  "add_money_to_fund"
]);

export const financeActionPreviewResponseSchema = z.object({
  confirmationToken: z.string().startsWith("idx_confirm_"),
  expiresAt: z.iso.datetime(),
  requiresConfirmation: z.literal(true),
  action: financeActionNameSchema,
  preview: z.record(z.string(), z.unknown())
});

export const financeActionCommitRequestSchema = z.object({
  confirmationToken: z.string().startsWith("idx_confirm_"),
  idempotencyKey: z.string().min(8).max(128)
});

export const financeActionCommitResponseSchema = z.object({
  replayed: z.boolean(),
  correlationId: z.uuid(),
  action: financeActionNameSchema,
  result: z.record(z.string(), z.unknown())
});

export type FinanceActionName = z.infer<typeof financeActionNameSchema>;
export type FinanceActionPreviewResponse = z.infer<typeof financeActionPreviewResponseSchema>;
export type FinanceActionCommitRequest = z.infer<typeof financeActionCommitRequestSchema>;
export type FinanceActionCommitResponse = z.infer<typeof financeActionCommitResponseSchema>;
