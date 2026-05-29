export const salesOperationalGuidanceSections = [
  'overview',
  'inventory',
  'finance',
  'commission',
] as const;

export type SalesOperationalGuidanceSection = (typeof salesOperationalGuidanceSections)[number];
