import type { SalesProductType } from '../../types';

export type ProductCategoryConfig = {
  id: string;
  name: string;
  value: string;
  color: string;
  icon: string;
  isActive: boolean;
  supportedTypes: SalesProductType[];
};

export type ProductCategoryLibrary = {
  id: string;
  name: string;
  description: string;
  categories: Array<{
    id: string;
    name: string;
    description: string;
    color: string;
    icon: string;
    supportedTypes: SalesProductType[];
  }>;
};
