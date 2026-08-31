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
