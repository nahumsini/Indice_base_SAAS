import type { ProductCategoryLibrary } from '../../types/productCategoryTypes';

export type CategoryTypeToken = 'product' | 'service' | 'package' | 'subscription' | 'operational';

export type CategoryLibraryItemInput = [
  id: string,
  name: string,
  description: string,
  supportedTypes: CategoryTypeToken[],
  icon?: string,
];

export type CategoryLibraryInput = {
  id: string;
  name: string;
  description: string;
  categories: CategoryLibraryItemInput[];
};

export type { ProductCategoryLibrary };
