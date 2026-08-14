import type {
  PlatformAccountCreatePayload,
  PlatformCatalogProduct,
} from "../../api/platformAdmin";
import {
  requiredExtraSeats,
} from "../AccountCreation/accountCreationUtils";
import type {
  QuickTestAccessDays,
  QuickTestDraft,
  QuickTestScenario,
} from "./types";

export const quickScenarioDefaults: Record<
  QuickTestScenario,
  { employeeCount: number; accessDays: QuickTestAccessDays }
> = {
  people: { employeeCount: 10, accessDays: 15 },
  commerce: { employeeCount: 8, accessDays: 15 },
  complete: { employeeCount: 20, accessDays: 30 },
};

const scenarioKeywords: Record<Exclude<QuickTestScenario, "complete">, string[]> = {
  people: ["human", "process", "task", "kpi"],
  commerce: ["inventory", "pos", "sales", "receivable", "expense", "petty"],
};

function availableBasicProducts(products: PlatformCatalogProduct[]) {
  return products.filter(
    (product) =>
      product.active &&
      product.commercially_available !== false &&
      product.product_type.toUpperCase() === "BASIC",
  );
}

function searchableProductText(product: PlatformCatalogProduct) {
  return [
    product.product_code,
    product.display_name,
    ...(product.capabilities ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

export function selectQuickScenarioProductCodes(
  products: PlatformCatalogProduct[],
  scenario: QuickTestScenario,
) {
  const basics = availableBasicProducts(products);
  if (scenario === "complete") {
    return basics.map((product) => product.product_code);
  }

  const keywords = scenarioKeywords[scenario];
  const matches = basics.filter((product) =>
    keywords.some((keyword) => searchableProductText(product).includes(keyword)),
  );
  const fallbackSize = scenario === "people" ? 2 : 3;
  return (matches.length ? matches : basics.slice(0, fallbackSize)).map(
    (product) => product.product_code,
  );
}

export function createQuickTestDraft(
  existingOwnerEmails: string[],
  companyPrefix: string,
  ownerName: string,
  now = Date.now(),
): QuickTestDraft {
  const existing = new Set(existingOwnerEmails.map((email) => email.toLowerCase()));
  let attempt = 0;
  let ownerEmail = "";
  do {
    const suffix = attempt ? `.${attempt + 1}` : "";
    ownerEmail = `prueba.indice.${now}${suffix}@example.com`;
    attempt += 1;
  } while (existing.has(ownerEmail));

  const timestamp = new Date(now)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
  return {
    scenario: "people",
    company_name: `${companyPrefix} ${timestamp}`,
    owner_name: ownerName,
    owner_email: ownerEmail,
    country_code: "MX",
    employee_count: quickScenarioDefaults.people.employeeCount,
    access_days: quickScenarioDefaults.people.accessDays,
  };
}

export function buildQuickTestAccountForm(
  draft: QuickTestDraft,
  products: PlatformCatalogProduct[],
): PlatformAccountCreatePayload {
  const employeeCount = Math.max(1, Math.trunc(draft.employee_count));
  return {
    company_name: draft.company_name.trim(),
    account_type: "SUPER_ADMIN",
    owner_name: draft.owner_name.trim() || undefined,
    owner_email: draft.owner_email.trim().toLowerCase(),
    temporary_password: "",
    country_code: draft.country_code,
    employee_count: employeeCount,
    company_size: String(employeeCount),
    product_codes: selectQuickScenarioProductCodes(products, draft.scenario),
    extra_seats: requiredExtraSeats(employeeCount),
    access_days: draft.access_days,
    permanent: false,
  };
}
