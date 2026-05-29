import { productCategories, productTypes } from '../../types';
import type { ProductsTranslations } from '../translations';
import type { ProductCategoryConfig, ProductCategoryLibrary } from '../types/productCategoryTypes';

const defaultCategoryColors = ['#FF6B5E', '#2563EB', '#059669', '#D97706', '#7C3AED', '#475569'];

export type ProductCategoryOption = {
  value: string;
  label: string;
};

export function createCategoryId(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `category-${Date.now()}`;
}

export function getCategoryLabel(category: string, t: ProductsTranslations) {
  return t.categoryLabels[category as keyof typeof t.categoryLabels] ?? category;
}

function getCategoryConfigLabel(category: ProductCategoryConfig, t: ProductsTranslations) {
  return t.categoryLabels[category.value as keyof typeof t.categoryLabels] ?? category.name;
}

export function buildInitialProductCategories(t: ProductsTranslations): ProductCategoryConfig[] {
  return productCategories.map((category, index) => ({
    id: createCategoryId(category),
    name: getCategoryLabel(category, t),
    value: category,
    color: defaultCategoryColors[index % defaultCategoryColors.length],
    icon: 'tag',
    isActive: true,
    supportedTypes: [...productTypes],
  }));
}

function addUniqueCategory(categories: ProductCategoryConfig[], category: ProductCategoryConfig) {
  const categoryKeys = [category.value, category.name].map(normalizeCategoryName).filter(Boolean);
  const existingKeys = new Set(categories.flatMap((item) => [item.value, item.name].map(normalizeCategoryName)));

  if (categoryKeys.some((key) => existingKeys.has(key))) {
    return categories;
  }

  return [...categories, category];
}

export function buildCatalogProductCategories({
  t,
  managedCategories,
  extraValues = [],
}: {
  t: ProductsTranslations;
  managedCategories: ProductCategoryConfig[];
  extraValues?: string[];
}) {
  const baseCategories = buildInitialProductCategories(t);

  return [...managedCategories, ...extraValues.map((value, index) => ({
    id: `existing-${createCategoryId(value)}-${index}`,
    name: getCategoryLabel(value, t),
    value,
    color: defaultCategoryColors[(baseCategories.length + index) % defaultCategoryColors.length],
    icon: 'tag',
    isActive: true,
    supportedTypes: [...productTypes],
  }))]
    .filter((category) => category.value.trim())
    .reduce(addUniqueCategory, baseCategories);
}

export function buildProductCategoryOptions(
  categories: ProductCategoryConfig[],
  t: ProductsTranslations,
): ProductCategoryOption[] {
  return categories
    .filter((category) => category.isActive)
    .map((category) => ({
      value: category.value,
      label: getCategoryConfigLabel(category, t),
    }));
}

export function createProductCategory(name: string, index = 0): ProductCategoryConfig {
  const normalizedName = name.trim();

  return {
    id: `${createCategoryId(normalizedName)}-${Date.now()}`,
    name: normalizedName,
    value: normalizedName,
    color: defaultCategoryColors[index % defaultCategoryColors.length],
    icon: 'tag',
    isActive: true,
    supportedTypes: [...productTypes],
  };
}

export function createCategoriesFromLibrary(
  library: ProductCategoryLibrary,
  selectedNames: string[],
  existingCategories: ProductCategoryConfig[],
) {
  const existingValues = new Set(existingCategories.map((category) => normalizeCategoryName(category.name)));

  return library.categories
    .filter((category) => selectedNames.includes(category.name))
    .filter((category) => !existingValues.has(normalizeCategoryName(category.name)))
    .map((category, index) => ({
      id: `${createCategoryId(category.name)}-${Date.now()}-${index}`,
      name: category.name,
      value: category.name,
      color: category.color,
      icon: category.icon,
      isActive: true,
      supportedTypes: category.supportedTypes,
    }));
}

export function normalizeCategoryName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
