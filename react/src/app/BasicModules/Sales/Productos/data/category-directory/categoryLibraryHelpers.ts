import type { SalesProductType } from '../../../types';
import type { CategoryLibraryInput, CategoryTypeToken, ProductCategoryLibrary } from './categoryLibraryTypes';

const categoryPalette = [
  '#2563EB',
  '#B63B32',
  '#059669',
  '#D97706',
  '#7C3AED',
  '#0891B2',
  '#DB2777',
  '#475569',
];

const salesProductTypeByToken: Record<CategoryTypeToken, SalesProductType> = {
  product: 'Product',
  service: 'Service',
  package: 'Package',
  subscription: 'Subscription',
  operational: 'Operational item',
};

export function defineCategoryLibrary(library: CategoryLibraryInput): ProductCategoryLibrary {
  return {
    ...library,
    categories: library.categories.map(([id, name, description, supportedTypes, icon = 'tag'], index) => ({
      id,
      name,
      description,
      color: categoryPalette[index % categoryPalette.length],
      icon,
      supportedTypes: supportedTypes.map((type) => salesProductTypeByToken[type]),
    })),
  };
}

export function defineCategoryLibraries(libraries: CategoryLibraryInput[]): ProductCategoryLibrary[] {
  return libraries.map(defineCategoryLibrary);
}
