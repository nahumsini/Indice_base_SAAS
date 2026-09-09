import type {
  BillingSignupConfig,
  BillingSignupPrice,
  BillingSignupProduct,
} from '../../api/billingSignup';

export type PublicPricingMode = 'DIRECT_PRODUCTS' | 'LEGACY_TIERS';

export type PublicPlanPricing = {
  pricingMode: PublicPricingMode;
  offerCode: string | null;
  selectedBasicCount: number;
  selectedProductCount: number;
  baseAmountCents: number | null;
  extraSeatUnitAmountCents: number | null;
  extraSeatsAmountCents: number | null;
  estimatedAmountCents: number | null;
  validSelection: boolean;
  overlappingSelection: boolean;
};

const published = (price: BillingSignupPrice) => price.status === 'ACTIVE';

export function pricingModeForConfig(config: BillingSignupConfig): PublicPricingMode {
  const productCodes = new Set(config.products.map((product) => product.code));
  return config.prices.some((price) => (
    productCodes.has(price.billableCode)
    && (price.priceType === 'PRODUCT' || price.priceType === 'PACKAGE')
  )) ? 'DIRECT_PRODUCTS' : 'LEGACY_TIERS';
}

export function calculatePublicPlanPricing(
  config: BillingSignupConfig,
  selectedProductCodes: readonly string[],
  extraSeats: number,
  billingInterval: 'MONTH' | 'YEAR',
): PublicPlanPricing {
  const pricingMode = pricingModeForConfig(config);
  const selectedCodes = new Set(selectedProductCodes);
  const selectedProducts = config.products.filter((product) => selectedCodes.has(product.code));
  const allCodesKnown = selectedProducts.length === selectedCodes.size;
  const overlappingSelection = pricingMode === 'DIRECT_PRODUCTS' && hasProductOverlap(selectedProducts);
  const normalizedExtraSeats = Math.max(0, Math.trunc(extraSeats));
  const extraSeatUnitAmountCents = findSeatPrice(config, billingInterval);
  const extraSeatsAmountCents = extraSeatUnitAmountCents == null
    ? null
    : extraSeatUnitAmountCents * normalizedExtraSeats;

  if (pricingMode === 'DIRECT_PRODUCTS') {
    const packageProducts = selectedProducts.filter((product) => product.commercialKind === 'PACKAGE');
    const moduleProducts = selectedProducts.filter((product) => product.commercialKind !== 'PACKAGE');
    const packageAmounts = packageProducts.map((product) => findProductPrice(config, product, billingInterval));
    const packagePricesReady = packageAmounts.every((amount): amount is number => amount != null);
    const moduleAmount = moduleProducts.length === 0
      ? 0
      : moduleProducts.length === 1 && packageProducts.length === 0
        ? findProductPrice(config, moduleProducts[0], billingInterval)
        : findPublishedPrice(config, 'module_additional_unit', 'PRODUCT', billingInterval) == null
          ? null
          : findPublishedPrice(config, 'module_additional_unit', 'PRODUCT', billingInterval)! * moduleProducts.length;
    const baseAmountCents = packagePricesReady && moduleAmount != null
      ? packageAmounts.reduce((total, amount) => total + amount, 0) + moduleAmount
      : null;
    const validSelection = allCodesKnown && selectedProducts.length > 0 && !overlappingSelection;
    return {
      pricingMode,
      offerCode: selectedProducts.length === 1
        ? selectedProducts[0].code
        : validSelection ? 'custom_offer' : null,
      selectedBasicCount: selectedProducts.length,
      selectedProductCount: selectedProducts.length,
      baseAmountCents,
      extraSeatUnitAmountCents,
      extraSeatsAmountCents,
      estimatedAmountCents: validSelection && baseAmountCents != null && extraSeatsAmountCents != null
        ? baseAmountCents + extraSeatsAmountCents
        : null,
      validSelection,
      overlappingSelection,
    };
  }

  const basicProducts = config.products.filter((product) => product.productType === 'BASIC');
  const selectedBasicCount = basicProducts.filter((product) => selectedCodes.has(product.code)).length;
  const selectedAddons = selectedProducts.filter((product) => product.productType === 'ADDON');
  const offerCode = offerCodeForCount(selectedBasicCount, basicProducts.length);
  const baseTierAmount = offerCode
    ? findPublishedPrice(config, offerCode, 'BASE', billingInterval)
    : null;
  const addonAmounts = selectedAddons.map((product) => (
    findPublishedPrice(config, product.code, 'ADDON', billingInterval)
  ));
  const addonsReady = addonAmounts.every((amount): amount is number => amount != null);
  const baseAmountCents = baseTierAmount == null || !addonsReady
    ? null
    : baseTierAmount + addonAmounts.reduce((total, amount) => total + amount, 0);
  const validSelection = allCodesKnown && offerCode != null && !overlappingSelection;

  return {
    pricingMode,
    offerCode,
    selectedBasicCount,
    selectedProductCount: selectedProducts.length,
    baseAmountCents,
    extraSeatUnitAmountCents,
    extraSeatsAmountCents,
    estimatedAmountCents: validSelection && baseAmountCents != null && extraSeatsAmountCents != null
      ? baseAmountCents + extraSeatsAmountCents
      : null,
    validSelection,
    overlappingSelection,
  };
}

export function publishedTierAmount(
  config: BillingSignupConfig,
  basicCount: number,
  billingInterval: 'MONTH' | 'YEAR',
) {
  if (pricingModeForConfig(config) !== 'LEGACY_TIERS') return null;
  const availableBasicCount = config.products.filter((product) => product.productType === 'BASIC').length;
  const offerCode = offerCodeForCount(basicCount, availableBasicCount);
  return offerCode ? findPublishedPrice(config, offerCode, 'BASE', billingInterval) : null;
}

export function publishedProductAmount(
  config: BillingSignupConfig,
  product: BillingSignupProduct,
  billingInterval: 'MONTH' | 'YEAR',
) {
  if (pricingModeForConfig(config) === 'DIRECT_PRODUCTS') {
    return findProductPrice(config, product, billingInterval);
  }
  if (product.productType === 'ADDON') {
    return findPublishedPrice(config, product.code, 'ADDON', billingInterval);
  }
  return null;
}

export function publishedSeatAmount(
  config: BillingSignupConfig,
  billingInterval: 'MONTH' | 'YEAR',
) {
  return findSeatPrice(config, billingInterval);
}

export function selectAllCompatibleProductCodes(config: BillingSignupConfig) {
  if (pricingModeForConfig(config) === 'LEGACY_TIERS') {
    return config.products.map((product) => product.code);
  }
  const corporatePackage = config.products.find((product) => product.code === 'corporativiza');
  if (corporatePackage) return [corporatePackage.code];
  return config.products.reduce<string[]>((selection, product) => {
    const selectedProducts = config.products.filter((candidate) => selection.includes(candidate.code));
    return selectedProducts.some((candidate) => productsOverlap(candidate, product))
      ? selection
      : [...selection, product.code];
  }, []);
}

export function toggleCompatibleProductCode(
  config: BillingSignupConfig,
  selectedCodes: readonly string[],
  productCode: string,
) {
  const availableCodes = new Set(config.products.map((product) => product.code));
  const current = selectedCodes.filter((code) => availableCodes.has(code));
  if (current.includes(productCode)) return current.filter((code) => code !== productCode);
  const product = config.products.find((candidate) => candidate.code === productCode);
  if (!product) return current;
  if (pricingModeForConfig(config) === 'LEGACY_TIERS') return [...current, productCode];
  const withoutOverlaps = current.filter((code) => {
    const candidate = config.products.find((item) => item.code === code);
    return candidate ? !productsOverlap(candidate, product) : false;
  });
  return [...withoutOverlaps, productCode];
}

function findProductPrice(
  config: BillingSignupConfig,
  product: BillingSignupProduct,
  billingInterval: 'MONTH' | 'YEAR',
) {
  const expectedType = product.commercialKind === 'PACKAGE' ? 'PACKAGE' : 'PRODUCT';
  return findPublishedPrice(config, product.code, expectedType, billingInterval);
}

function findSeatPrice(config: BillingSignupConfig, billingInterval: 'MONTH' | 'YEAR') {
  return findPublishedPrice(config, 'extra_user', 'SEAT', billingInterval)
    ?? findPublishedPrice(config, 'extra_seat', 'ADDON', billingInterval);
}

function offerCodeForCount(selectedCount: number, availableCount: number) {
  if (selectedCount < 1 || selectedCount > availableCount) return null;
  if (selectedCount >= 4) return 'basic_all';
  return `basic_${selectedCount}`;
}

function findPublishedPrice(
  config: BillingSignupConfig,
  billableCode: string,
  priceType: BillingSignupPrice['priceType'],
  billingInterval: 'MONTH' | 'YEAR',
) {
  return config.prices.find((price) => (
    price.billableCode === billableCode
    && price.priceType === priceType
    && price.billingInterval === billingInterval
    && published(price)
  ))?.unitAmountCents ?? null;
}

function hasProductOverlap(products: readonly BillingSignupProduct[]) {
  return products.some((product, index) => (
    products.slice(index + 1).some((candidate) => productsOverlap(product, candidate))
  ));
}

function productsOverlap(left: BillingSignupProduct, right: BillingSignupProduct) {
  const leftCapabilities = productCapabilities(left);
  const rightCapabilities = productCapabilities(right);
  return [...leftCapabilities].some((capability) => (
    capability !== 'inventory' && rightCapabilities.has(capability)
  ));
}

function productCapabilities(product: BillingSignupProduct) {
  const explicit = product.capabilities?.map(normalizeCode).filter(Boolean) ?? [];
  const included = product.includedProductCodes?.map(normalizeCode).filter(Boolean) ?? [];
  return new Set(explicit.length > 0 ? explicit : included.length > 0 ? included : [normalizeCode(product.code)]);
}

function normalizeCode(value: string) {
  return value.trim().toLowerCase() === 'sales' ? 'crm' : value.trim().toLowerCase();
}

export function formatPublicPlanMoney(cents: number | null, currency: string, locale: string) {
  if (cents == null) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
