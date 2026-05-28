import { healthBeautyCategoryLibraries } from './healthBeautyLibraries';
import { hospitalityFoodCategoryLibraries } from './hospitalityFoodLibraries';
import { professionalCategoryLibraries } from './professionalLibraries';
import { retailCategoryLibraries } from './retailLibraries';
import { technicalCategoryLibraries } from './technicalLibraries';
import type { ProductCategoryLibrary } from './categoryLibraryTypes';

const allCategoryLibraries = [
  ...retailCategoryLibraries,
  ...hospitalityFoodCategoryLibraries,
  ...healthBeautyCategoryLibraries,
  ...professionalCategoryLibraries,
  ...technicalCategoryLibraries,
];

const categoryLibraryById = new Map(allCategoryLibraries.map((library) => [library.id, library]));

function getCategoryLibrary(id: string): ProductCategoryLibrary {
  const library = categoryLibraryById.get(id);

  if (!library) {
    throw new Error(`Missing category library: ${id}`);
  }

  return library;
}

export const categoryDirectoryLibraries: ProductCategoryLibrary[] = [
  getCategoryLibrary('retail'),
  getCategoryLibrary('clothing-store-fashion'),
  getCategoryLibrary('pharmacy'),
  getCategoryLibrary('grocery-convenience-store'),
  getCategoryLibrary('department-store'),
  getCategoryLibrary('electronics-store'),
  getCategoryLibrary('furniture-store'),
  getCategoryLibrary('hardware-store'),
  getCategoryLibrary('restaurant-food'),
  getCategoryLibrary('bakery-coffee-shop'),
  getCategoryLibrary('bar-nightlife'),
  getCategoryLibrary('hospitality-rentals'),
  getCategoryLibrary('beauty-wellness'),
  getCategoryLibrary('salon-beauty-studio'),
  getCategoryLibrary('gym-fitness'),
  getCategoryLibrary('medical-clinics'),
  getCategoryLibrary('dental-clinic'),
  getCategoryLibrary('veterinary-pet-shop'),
  getCategoryLibrary('professional-services'),
  getCategoryLibrary('marketing-agency'),
  getCategoryLibrary('law-firm'),
  getCategoryLibrary('accounting-firm'),
  getCategoryLibrary('architecture-engineering'),
  getCategoryLibrary('construction-technical'),
  getCategoryLibrary('automotive'),
  getCategoryLibrary('auto-repair-shop'),
  getCategoryLibrary('car-wash'),
  getCategoryLibrary('logistics-delivery'),
  getCategoryLibrary('manufacturing-workshop'),
  getCategoryLibrary('ecommerce'),
  getCategoryLibrary('distributor-wholesale'),
  getCategoryLibrary('printing-design'),
  getCategoryLibrary('events'),
  getCategoryLibrary('tourism-experiences'),
  getCategoryLibrary('telecom-internet-services'),
  getCategoryLibrary('security-services'),
  getCategoryLibrary('education-training'),
  getCategoryLibrary('real-estate'),
  getCategoryLibrary('cleaning-services'),
  getCategoryLibrary('saas-technology'),
];

export type { ProductCategoryLibrary };
