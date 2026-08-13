import type { PlatformCompanySummary } from "../../api/platformAdmin";

export type CustomerSortKey =
  | "customer"
  | "userType"
  | "distributor"
  | "status"
  | "plan"
  | "rate"
  | "users"
  | "nextEvent"
  | "payment";

export type SortDirection = "asc" | "desc" | null;
export type CustomerCommercialStatus =
  | "active"
  | "trial"
  | "demo"
  | "inactive";

export function basicCommercialStatus(
  company: PlatformCompanySummary,
): CustomerCommercialStatus {
  const billingStatus = (company.billing_status || "").toLowerCase();
  const lifecycleState = (company.lifecycle_state || "").toLowerCase();
  const accessMode = (company.access_mode || "").toLowerCase();

  if (billingStatus === "trialing" || lifecycleState === "trial") {
    return "trial";
  }
  if (!billingStatus && (company.temporary_benefits || 0) > 0) {
    return "demo";
  }
  if (
    ["active", "paid"].includes(billingStatus) ||
    ["active", "grace"].includes(lifecycleState) ||
    accessMode === "full" ||
    (company.active_benefits || 0) > 0
  ) {
    return "active";
  }
  return "inactive";
}

export function compareCustomerValues(
  left: PlatformCompanySummary,
  right: PlatformCompanySummary,
  key: CustomerSortKey,
) {
  const compareText = (
    first: string | null | undefined,
    second: string | null | undefined,
  ) =>
    (first || "").localeCompare(second || "", undefined, {
      numeric: true,
      sensitivity: "base",
    });
  const compareNumber = (
    first: number | null | undefined,
    second: number | null | undefined,
  ) => (first ?? 0) - (second ?? 0);
  const dateValue = (value: string | null | undefined) =>
    value ? new Date(value).getTime() || 0 : 0;

  switch (key) {
    case "customer":
      return compareText(left.name, right.name);
    case "userType":
      return compareText(left.user_type, right.user_type);
    case "distributor":
      return compareText(
        left.created_by_distributor_company_name ||
          left.distributor_company_name ||
          left.creation_origin ||
          (left.user_type === "DISTRIBUTOR" ? left.name : "Indice"),
        right.created_by_distributor_company_name ||
          right.distributor_company_name ||
          right.creation_origin ||
          (right.user_type === "DISTRIBUTOR" ? right.name : "Indice"),
      );
    case "status":
      return compareText(
        basicCommercialStatus(left),
        basicCommercialStatus(right),
      );
    case "plan":
      return compareText(
        left.offer_code || left.projected_offer_code,
        right.offer_code || right.projected_offer_code,
      );
    case "rate":
      return compareNumber(
        left.billing_amount_cents,
        right.billing_amount_cents,
      );
    case "users":
      return compareNumber(left.active_members, right.active_members);
    case "nextEvent":
      return compareNumber(
        dateValue(
          left.trial_source
            ? left.trial_ends_at
            : left.current_period_ends_at,
        ),
        dateValue(
          right.trial_source
            ? right.trial_ends_at
            : right.current_period_ends_at,
        ),
      );
    case "payment":
      return compareText(
        left.last_invoice_status || left.last_payment_status,
        right.last_invoice_status || right.last_payment_status,
      );
  }
}
