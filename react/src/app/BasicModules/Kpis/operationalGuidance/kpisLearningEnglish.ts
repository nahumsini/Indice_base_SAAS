import type { EnglishLearningOverview } from '../../../learningMode/englishOverview';
import type { kpisLearningLabels } from './kpisLearningControls';

export const kpisLearningEnglish = {
  "kpis": {
    label: "Matrices and Índice IME",
    objective: "Turn operational evidence into review priorities.",
    instructions: "Refresh the matrices, choose the period and scope, then review evidence and coverage before interpreting a score or quadrant.",
    whenToUse: "Before a management review or after significant operational changes.",
    example: "A low score with incomplete evidence prompts better data collection before a broad business conclusion.",
  },
  "accounting-reports": {
    label: "Financial statements",
    objective: "Review financial results alongside the records that support them.",
    instructions: "Choose the reporting period and scope, inspect the statement and follow supporting entries when a balance needs explanation.",
    whenToUse: "During period close and financial reconciliation.",
    example: "An unexpected balance is traced to its supporting entries before the period is signed off.",
  },
  "automated-reports": {
    label: "Automated reports",
    objective: "Keep recurring reviews based on a consistent report configuration.",
    instructions: "Review the report, period and available scheduling options. Confirm the intended content and recipients before saving a delivery configuration.",
    whenToUse: "When the same operational review must be repeated regularly.",
    example: "A weekly report uses the same scope so the team can compare periods fairly.",
  },
} satisfies Record<keyof typeof kpisLearningLabels, EnglishLearningOverview>;
