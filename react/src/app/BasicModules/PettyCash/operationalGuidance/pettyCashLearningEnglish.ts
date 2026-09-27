import type { EnglishLearningOverview } from '../../../learningMode/englishOverview';
import type { pettyCashLearningLabels } from './pettyCashLearningControls';

export const pettyCashLearningEnglish = {
  "cash": {
    label: "Petty cash funds",
    objective: "Assign a purpose and a responsible person to each fund.",
    instructions: "Review existing funds, open the appropriate fund and check its type, currency and available balance before recording movements.",
    whenToUse: "Before handing over cash or registering spending against a fund.",
    example: "A branch uses its own fund so another branch’s purchases do not change its available balance.",
  },
  "control": {
    label: "Reconciliation",
    objective: "Explain each cash movement with the appropriate evidence.",
    instructions: "Review movements and receipts, resolve missing information and compare recorded spending with the fund balance before closing.",
    whenToUse: "When receipts arrive or a fund is ready for reconciliation.",
    example: "A missing receipt is followed up with the responsible person before the fund is treated as reconciled.",
  },
  "statements": {
    label: "Statements",
    objective: "Review how opening balance, movements and closing balance relate.",
    instructions: "Choose the fund and period, inspect the statement and use its supporting entries to explain differences.",
    whenToUse: "At handover, period close or when investigating a balance.",
    example: "A handover includes the statement so the next custodian can see which purchases explain the remaining cash.",
  },
  "kpis": {
    label: "Financial overview",
    objective: "Compare fund balances and evidence to focus the review.",
    instructions: "Select a consistent period and scope, check the indicators and inspect the funds behind unusual results.",
    whenToUse: "Before replenishing funds or reviewing petty cash performance.",
    example: "A fund with frequent missing receipts receives attention before another replenishment is approved.",
  },
} satisfies Record<keyof typeof pettyCashLearningLabels, EnglishLearningOverview>;
