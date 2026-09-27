import type { EnglishLearningOverview } from '../../../learningMode/englishOverview';
import type { inventoryLearningLabels } from './inventoryLearningControls';

export const inventoryLearningEnglish = {
  "products": {
    label: "Products",
    objective: "Define what you buy and sell before recording physical stock.",
    instructions: "Search the catalogue, complete the product record and check its unit and commercial information. Creating a product does not receive stock.",
    whenToUse: "Before a new item is purchased, received or sold.",
    example: "A new product appears in the catalogue but has no warehouse stock until a receipt is recorded.",
  },
  "warehouses": {
    label: "Warehouses",
    objective: "Identify where stock is kept and who is responsible for it.",
    instructions: "Review warehouse records and assign the correct location when recording stock movements.",
    whenToUse: "Before receiving goods or separating stock by location.",
    example: "Two locations hold the same product but maintain separate quantities.",
  },
  "inventory": {
    label: "Inventory",
    objective: "Explain each stock change through a recorded movement.",
    instructions: "Choose the product and warehouse, review available stock and use the appropriate receipt, transfer or adjustment with supporting details.",
    whenToUse: "When goods arrive, move between locations or require a justified correction.",
    example: "Moving ten units between warehouses changes both locations without creating ten extra units for the company.",
  },
  "providers": {
    label: "Suppliers",
    objective: "Link replenishment to an identified supplier.",
    instructions: "Search existing supplier records and check their details before preparing a purchase order.",
    whenToUse: "Before committing to a purchase or updating supplier information.",
    example: "A purchase order uses the existing supplier record so its receipt and follow-up remain connected.",
  },
  "purchase-orders": {
    label: "Purchase orders",
    objective: "Separate an order commitment from goods actually received.",
    instructions: "Prepare and review the order. When goods arrive, register the actual receipt against the correct warehouse; the order alone does not add stock.",
    whenToUse: "When purchasing stock and confirming deliveries.",
    example: "An order for twenty units receives only twelve. The receipt records twelve rather than assuming the whole order arrived.",
  },
  "discounts": {
    label: "Discounts and promotions",
    objective: "Apply clear commercial rules to controlled products.",
    instructions: "Review the eligible products, dates and channel, and check the effect on margin before enabling a discount.",
    whenToUse: "Before launching or changing a promotion.",
    example: "A promotion has an end date so a temporary price reduction does not remain active indefinitely.",
  },
} satisfies Record<keyof typeof inventoryLearningLabels, EnglishLearningOverview>;
