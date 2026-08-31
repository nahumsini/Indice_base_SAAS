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
