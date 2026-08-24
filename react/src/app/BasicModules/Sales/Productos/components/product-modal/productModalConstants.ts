export const productFieldClassName = 'border-slate-200 bg-white shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20';

export const productModalWizardStepIds = [
  'basics',
  'commercial',
  'availability',
  'review',
] as const;

export type ProductModalWizardStepId = typeof productModalWizardStepIds[number];
