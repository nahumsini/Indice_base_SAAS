export const productFieldClassName = 'border-slate-200 bg-white shadow-none focus:border-[#FF6B5E] focus:ring-[#FF6B5E]/20';

export const productModalTabIds = [
  'general',
  'commercial',
  'presentation',
  'media',
  'usage',
] as const;

export type ProductModalTabId = typeof productModalTabIds[number];
