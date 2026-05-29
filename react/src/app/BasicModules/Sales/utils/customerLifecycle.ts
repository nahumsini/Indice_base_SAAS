export type CustomerHealthStatus = 'healthy' | 'attention' | 'at_risk' | 'lost';
export type CustomerRelationshipStatus = 'first_purchase' | 'recurring' | 'renewal' | 'recovered' | 'dormant';

export type CustomerLifecycleSale = {
  id?: string;
  customerName: string;
  contactId?: string;
  customerId?: string;
  saleDate?: string;
  totalAmount?: number;
  financeStatus?: string;
  paymentEvidenceStatus?: string;
  deliveryStatus?: string;
};

export type CustomerLifecyclePostSaleRecord = {
  clientId?: string;
  clientName: string;
  relationType?: string;
  postSaleType?: string;
  status?: string;
  riskLevel?: string;
  lastPurchaseDate?: string;
  nextFollowUpDate?: string;
  renewalDate?: string;
  lifetimeValue?: number;
  nextAction?: string;
};

export type CustomerLifecycleSignals = {
  health: CustomerHealthStatus;
  relationship: CustomerRelationshipStatus;
  revenueAtRisk: number | null;
  renewalDueThisMonth: boolean;
  lastActivityDate?: string;
  nextFollowUpDate?: string;
  renewalDate?: string;
  postSaleStatus?: string;
  postSaleType?: string;
  openCases: number;
};

function normalizeKey(value?: string) {
  return (value ?? '').trim().toLowerCase();
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getDaysFromToday(value?: string) {
  const date = parseDate(value);
  if (!date) return Number.POSITIVE_INFINITY;
  return Math.ceil((date.getTime() - startOfToday().getTime()) / 86400000);
}

function getDaysSince(value?: string) {
  const daysFromToday = getDaysFromToday(value);
  return Number.isFinite(daysFromToday) ? -daysFromToday : Number.POSITIVE_INFINITY;
}

function getLatestDate(values: Array<string | undefined>) {
  return values
    .filter(Boolean)
    .sort((left, right) => new Date(`${right}T00:00:00`).getTime() - new Date(`${left}T00:00:00`).getTime())[0];
}

export function isSameLifecycleCustomer(
  sale: CustomerLifecycleSale,
  candidate: CustomerLifecycleSale | CustomerLifecyclePostSaleRecord,
) {
  const saleContactId = sale.contactId || sale.customerId;
  const candidateContactId = 'customerName' in candidate
    ? candidate.contactId || candidate.customerId
    : candidate.clientId;

  if (saleContactId && candidateContactId && saleContactId === candidateContactId) {
    return true;
  }

  const candidateName = 'customerName' in candidate ? candidate.customerName : candidate.clientName;
  return normalizeKey(sale.customerName) === normalizeKey(candidateName);
}

export function getCustomerSales<TSale extends CustomerLifecycleSale>(sale: TSale, sales: TSale[]) {
  return sales.filter((candidate) => isSameLifecycleCustomer(sale, candidate));
}

export function getRelatedPostSaleRecords(
  sale: CustomerLifecycleSale,
  postSaleRecords: CustomerLifecyclePostSaleRecord[],
) {
  return postSaleRecords.filter((record) => isSameLifecycleCustomer(sale, record));
}

export function isRenewalDueThisMonth(renewalDate?: string) {
  const days = getDaysFromToday(renewalDate);
  return days >= 0 && days <= 30;
}

export function getCustomerRelationship({
  sale,
  customerSales,
  postSaleRecords,
}: {
  sale?: CustomerLifecycleSale;
  customerSales: CustomerLifecycleSale[];
  postSaleRecords: CustomerLifecyclePostSaleRecord[];
}): CustomerRelationshipStatus {
  const latestPostSale = postSaleRecords[0];
  const relationType = normalizeKey(latestPostSale?.relationType);
  const postSaleType = normalizeKey(latestPostSale?.postSaleType);
  const latestSaleDate = getLatestDate(customerSales.map((item) => item.saleDate)) ?? sale?.saleDate;

  if (relationType.includes('dormant') && getDaysSince(latestSaleDate) <= 45) {
    return 'recovered';
  }

  if (relationType.includes('renewal') || postSaleType.includes('renewal') || isRenewalDueThisMonth(latestPostSale?.renewalDate)) {
    return 'renewal';
  }

  if (customerSales.length > 1 || relationType.includes('recurrent') || postSaleType.includes('recurrent')) {
    return 'recurring';
  }

  if (relationType.includes('dormant') || getDaysSince(latestSaleDate) > 180) {
    return 'dormant';
  }

  return 'first_purchase';
}

export function getCustomerHealth({
  sale,
  customerSales,
  postSaleRecords,
}: {
  sale?: CustomerLifecycleSale;
  customerSales: CustomerLifecycleSale[];
  postSaleRecords: CustomerLifecyclePostSaleRecord[];
}): CustomerHealthStatus {
  const latestPostSale = postSaleRecords[0];
  const latestSaleDate = getLatestDate(customerSales.map((item) => item.saleDate)) ?? sale?.saleDate;
  const daysSincePurchase = getDaysSince(latestSaleDate);
  const renewalDays = getDaysFromToday(latestPostSale?.renewalDate);
  const followUpDays = getDaysFromToday(latestPostSale?.nextFollowUpDate);
  const postSaleStatus = normalizeKey(latestPostSale?.status);
  const riskLevel = normalizeKey(latestPostSale?.riskLevel);
  const hasRejectedPayment = sale?.financeStatus === 'rejected' || sale?.paymentEvidenceStatus === 'rejected';

  if (postSaleStatus.includes('lost') || postSaleStatus === 'closed' || daysSincePurchase > 365) {
    return 'lost';
  }

  if (
    postSaleStatus.includes('risk')
    || riskLevel === 'high'
    || renewalDays < 0
    || followUpDays < 0
    || hasRejectedPayment
  ) {
    return 'at_risk';
  }

  if (
    (renewalDays >= 0 && renewalDays <= 30)
    || (followUpDays >= 0 && followUpDays <= 14)
    || daysSincePurchase > 90
  ) {
    return 'attention';
  }

  return 'healthy';
}

export function getRevenueAtRisk({
  health,
  sale,
  customerSales,
  postSaleRecords,
}: {
  health: CustomerHealthStatus;
  sale?: CustomerLifecycleSale;
  customerSales: CustomerLifecycleSale[];
  postSaleRecords: CustomerLifecyclePostSaleRecord[];
}) {
  if (health === 'healthy') return null;

  const lifetimeValue = postSaleRecords.find((record) => Number(record.lifetimeValue) > 0)?.lifetimeValue;
  const totalCustomerRevenue = customerSales.reduce((total, item) => total + (Number(item.totalAmount) || 0), 0);
  const fallbackAmount = Number(sale?.totalAmount) || 0;
  const amount = Number(lifetimeValue) || totalCustomerRevenue || fallbackAmount;

  return amount > 0 ? amount : null;
}

export function getCustomerLifecycleSignals({
  sale,
  sales,
  postSaleRecords,
}: {
  sale: CustomerLifecycleSale;
  sales: CustomerLifecycleSale[];
  postSaleRecords: CustomerLifecyclePostSaleRecord[];
}): CustomerLifecycleSignals {
  const customerSales = getCustomerSales(sale, sales);
  const relatedPostSaleRecords = getRelatedPostSaleRecords(sale, postSaleRecords)
    .sort((left, right) => getDaysSince(left.nextFollowUpDate) - getDaysSince(right.nextFollowUpDate));
  const latestPostSale = relatedPostSaleRecords[0];
  const health = getCustomerHealth({ sale, customerSales, postSaleRecords: relatedPostSaleRecords });
  const relationship = getCustomerRelationship({ sale, customerSales, postSaleRecords: relatedPostSaleRecords });

  return {
    health,
    relationship,
    revenueAtRisk: getRevenueAtRisk({ health, sale, customerSales, postSaleRecords: relatedPostSaleRecords }),
    renewalDueThisMonth: isRenewalDueThisMonth(latestPostSale?.renewalDate),
    lastActivityDate: getLatestDate([
      latestPostSale?.lastPurchaseDate,
      ...customerSales.map((item) => item.saleDate),
    ]),
    nextFollowUpDate: latestPostSale?.nextFollowUpDate,
    renewalDate: latestPostSale?.renewalDate,
    postSaleStatus: latestPostSale?.status,
    postSaleType: latestPostSale?.postSaleType,
    openCases: relatedPostSaleRecords.filter((record) => !['Closed', 'Completed'].includes(record.status ?? '')).length,
  };
}
