import type { SalesCatalogItem, SalesProductStatus } from '../../types';

export const productStatusClasses: Record<SalesProductStatus, string> = {
  Active: 'border-[#59C3A5]/25 bg-[#59C3A5]/10 text-[#177d66]',
  Inactive: 'border-slate-300 bg-slate-100 text-slate-600',
  Draft: 'border-[#F4C84A]/45 bg-[#F4C84A]/15 text-[#9a6b05]',
};

export const productTypeProgressStyles: Record<SalesCatalogItem['type'], string> = {
  Product: 'bg-[#2563EB]',
  Service: 'bg-[#59C3A5]',
  Package: 'bg-[#F4C84A]',
  Subscription: 'bg-[#8B5CF6]',
  'Operational item': 'bg-[#FF6B5E]',
};
