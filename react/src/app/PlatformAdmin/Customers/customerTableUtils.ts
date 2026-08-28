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
  | "inactive"
  | "deleted";

export type CustomerControlSignal =
  | "payment"
  | "access"
  | "pricing"
  | "trialExpired"
  | "trialEnding"
  | "owner"
  | "offer"
  | "adoption";

export function basicCommercialStatus(
  company: PlatformCompanySummary,
): CustomerCommercialStatus {
  if (company.platform_status === "DELETED") return "deleted";
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

export function isManagedCustomer(company: PlatformCompanySummary) {
  return company.user_type === "SUPER_ADMIN" && company.platform_status !== "DELETED";
}

export function customerControlSignals(
  company: PlatformCompanySummary,
): CustomerControlSignal[] {
  if (!isManagedCustomer(company)) return [];

  const status = basicCommercialStatus(company);
  const paymentStatus = (
    company.last_invoice_status ||
    company.last_payment_status ||
    ""
  ).toLowerCase();
  const signals: CustomerControlSignal[] = [];

  if (["past_due", "unpaid", "failed"].includes(paymentStatus)) {
    signals.push("payment");
  }
  if (status === "inactive") signals.push("access");
  if (company.billing_amount_kind === "UNAVAILABLE") signals.push("pricing");
  if (company.trial_source && (company.trial_days_remaining ?? 0) <= 0) {
    signals.push("trialExpired");
  } else if (
    company.trial_source &&
    (company.trial_days_remaining ?? Number.POSITIVE_INFINITY) <= 7
  ) {
    signals.push("trialEnding");
  }
  if (!company.owner_email) signals.push("owner");
  if (
    !company.offer_code &&
    !company.projected_offer_code &&
    !(company.product_names?.length || company.product_codes?.length)
  ) {
    signals.push("offer");
  }
  if (["active", "trial", "demo"].includes(status) && company.active_members === 0) {
    signals.push("adoption");
  }

  return signals;
}

export function customerPriorityScore(company: PlatformCompanySummary) {
  const weights: Record<CustomerControlSignal, number> = {
    payment: 100,
    trialExpired: 90,
    access: 80,
    pricing: 70,
    trialEnding: 60,
    owner: 50,
    offer: 40,
    adoption: 30,
  };
  return customerControlSignals(company).reduce(
    (score, signal) => score + weights[signal],
    0,
  );
}

export function isCustomerAttentionAccount(company: PlatformCompanySummary) {
  return customerControlSignals(company).some((signal) =>
    ["payment", "access", "pricing", "trialExpired"].includes(signal),
  );
}

export function isCustomerTrialEndingSoon(company: PlatformCompanySummary) {
  return customerControlSignals(company).includes("trialEnding");
}

export function isCustomerWithoutOffer(company: PlatformCompanySummary) {
  return customerControlSignals(company).includes("offer");
}

export function isCustomerWithoutAdoption(company: PlatformCompanySummary) {
  return customerControlSignals(company).includes("adoption");
}

export function matchesCustomerStatusFilter(
  company: PlatformCompanySummary,
  statusFilter: string,
) {
  if (statusFilter === "all") return true;
  if (statusFilter === "temporary") {
    return ["demo", "trial"].includes(basicCommercialStatus(company));
  }
  if (statusFilter === "attention") return isCustomerAttentionAccount(company);
  if (statusFilter === "expiring") return isCustomerTrialEndingSoon(company);
  if (statusFilter === "no_offer") return isCustomerWithoutOffer(company);
  if (statusFilter === "no_adoption") return isCustomerWithoutAdoption(company);
  return basicCommercialStatus(company) === statusFilter;
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
