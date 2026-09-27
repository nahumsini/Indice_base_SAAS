import type { EnglishLearningOverview } from '../../../learningMode/englishOverview';
import type { receivablesLearningLabels } from './receivablesLearningControls';

export const receivablesLearningEnglish = {
  "credit-sales": {
    label: "Credit sales",
    objective: "Record agreed credit terms as a traceable payment obligation.",
    instructions: "Select an eligible sale, review the customer’s credit policy and payment schedule, then confirm the agreement.",
    whenToUse: "After terms are agreed and credit availability is checked.",
    example: "A customer pays in instalments; the agreed dates make each expected payment visible.",
  },
  "accounts-receivable": {
    label: "Accounts receivable",
    objective: "Track outstanding balances and due dates.",
    instructions: "Filter the receivables, inspect the payment schedule and record follow-up against the correct customer and obligation.",
    whenToUse: "When reviewing due or overdue balances.",
    example: "The team checks which instalment is overdue before contacting a customer who has already made a partial payment.",
  },
  "payments": {
    label: "Received payments",
    objective: "Apply money received to the correct obligation.",
    instructions: "Locate the receivable, review the amount and payment details, and verify the remaining balance after registering payment.",
    whenToUse: "When a customer payment has been confirmed.",
    example: "A partial payment reduces the outstanding balance without marking the entire obligation as paid.",
  },
  "credit-customers": {
    label: "Credit customers",
    objective: "Keep credit conditions tied to the correct customer.",
    instructions: "Search for the customer, review the credit policy and available information before agreeing to another credit sale.",
    whenToUse: "Before offering credit or reviewing existing conditions.",
    example: "A customer’s outstanding balance is checked before another payment plan is offered.",
  },
  "kpis": {
    label: "Receivables KPIs",
    objective: "Identify overdue balances and collection trends.",
    instructions: "Choose the period and scope, compare the indicators and inspect the receivables that explain the result.",
    whenToUse: "During collection planning and financial reviews.",
    example: "An increase in overdue balances prompts a review of due dates and customer follow-up.",
  },
} satisfies Record<keyof typeof receivablesLearningLabels, EnglishLearningOverview>;
