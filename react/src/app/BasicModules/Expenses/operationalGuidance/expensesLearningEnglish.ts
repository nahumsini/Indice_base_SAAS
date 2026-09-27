import type { EnglishLearningOverview } from '../../../learningMode/englishOverview';
import type { expensesLearningLabels } from './expensesLearningControls';

export const expensesLearningEnglish = {
  "expenses": {
    label: "Expenses",
    objective: "Record purchases, obligations and payments with their supporting documents.",
    instructions: "Choose an expense or an account payable, check the supplier and dates, then save. Use status and period filters to find it; record payment only when money has actually moved.",
    whenToUse: "When a purchase or invoice creates an obligation, even if payment is due later.",
    example: "A supplier delivers today and expects payment next month. Record the payable now and use the pending filter to follow its due date.",
  },
  "budgets": {
    label: "Budgets",
    objective: "Plan spending before comparing it with actual expenses.",
    instructions: "Create a budget with a period, category and responsible person. Filter the same scope when reviewing planned amounts against actual spending.",
    whenToUse: "Before a new month, project or recurring commitment.",
    example: "A branch budgets for supplies and maintenance separately. A maintenance overrun is visible without hiding it in the supplies total.",
  },
  "providers": {
    label: "Suppliers",
    objective: "Keep the supplier identity and contact details attached to each expense.",
    instructions: "Search before creating a supplier, complete the required details and review the record before using it on an expense.",
    whenToUse: "Before recording a purchase from a new supplier or updating contact details.",
    example: "Two invoices from the same supplier use one record, making its outstanding obligations easier to review.",
  },
  "accounting": {
    label: "Accounting accounts",
    objective: "Classify spending consistently so reports compare the same concepts.",
    instructions: "Review the account structure and select the appropriate account when recording an expense. Check existing classifications before adding another account.",
    whenToUse: "Before entering new categories of spending or reviewing a financial period.",
    example: "Rent is classified consistently across branches, so a comparison does not mix it with maintenance.",
  },
  "payment_accounts": {
    label: "Payment accounts",
    objective: "Identify the account used for each payment.",
    instructions: "Review the available accounts and their currencies. Select the actual source of funds when registering payment and use its records during reconciliation.",
    whenToUse: "Before making payments or reconciling a bank or cash account.",
    example: "A supplier invoice is paid from one bank account. Recording that account keeps the payment traceable.",
  },
  "kpis": {
    label: "Financial KPIs",
    objective: "Use spending evidence to identify deviations and trends.",
    instructions: "Select the period and operating scope, review the indicators and open the supporting records before deciding what to change.",
    whenToUse: "During a financial review or after new expenses and payments are recorded.",
    example: "A higher expense total leads the team to review the underlying invoices before changing next month’s budget.",
  },
} satisfies Record<keyof typeof expensesLearningLabels, EnglishLearningOverview>;
