export const enCA = {
  header: {
    title: 'Commercial KPIs',
    subtitle: 'Live sales board: prospects, quotes, wins, customers, commissions, and commercial risk.',
  },
  actions: {
    printReport: 'Print report',
  },
  filters: {
    title: 'Filters',
    search: 'Search',
    unit: 'Unit',
    business: 'Business',
    seller: 'Seller',
    allUnits: 'All units',
    allBusinesses: 'All businesses',
    allSellers: 'All sellers',
    searchPlaceholder: 'Search prospect, customer, or seller',
  },
  cards: {
    activeProspects: {
      label: 'Active prospects',
      detail: (count: number) => `${count} total ${count === 1 ? 'opportunity' : 'opportunities'}`,
    },
    quotes: {
      label: 'Quotes',
      detail: (count: number) => `${count} approved or won`,
    },
    pipeline: {
      label: 'Active pipeline',
      detail: (count: number) => `${count} active prospects`,
    },
    quoteConversion: {
      label: 'Quote to sale conversion',
      detail: (count: number) => `Based on ${count} quotes`,
    },
    salesRevenue: {
      label: 'Sales revenue',
      detail: (count: number) => `${count} registered ${count === 1 ? 'sale' : 'sales'}`,
    },
    commercialRisk: {
      label: 'Commercial risk',
      detail: (count: number) => `${count} overdue or pending follow-up`,
    },
    commissions: {
      label: 'Commissions',
      detail: 'Calculated from sales',
    },
    contacts: {
      label: 'Contacts',
      detail: (count: number) => `${count} active ${count === 1 ? 'customer' : 'customers'}`,
    },
    products: {
      label: 'Products',
      detail: (count: number) => `${count} active in catalog`,
    },
    averageTicket: {
      label: 'Average ticket',
      detail: 'Based on registered sales',
    },
    quoteApproval: {
      label: 'Quote approval',
      detail: (value: string) => `${value} rejected or expired`,
    },
  },
  signals: {
    title: 'Commercial signals',
    subtitle: 'Fast read of the sales funnel and blockers that may delay closing or execution.',
    risk: 'Attention required',
    stable: 'Operation stable',
    conversion: 'Quote to sale conversion',
    inventoryReadiness: 'Inventory readiness',
    inventoryReadyDetail: (ready: number, total: number) => `${ready} of ${total} products ready`,
    commercialRisk: 'Commercial risk',
    commercialRiskDescription: 'Overdue, stalled, or unscheduled prospects.',
  },
  context: {
    preferredCurrency: 'Preferred currency',
    native: 'Native',
    records: 'Records included',
  },
  pagination: {
    next: 'Next',
    page: 'Page',
    previous: 'Previous',
    records: 'records',
    rows: 'Rows',
  },
  sellerTable: {
    title: 'Seller performance',
    subtitle: 'Ranking by won sales, conversion, quotes, and pipeline.',
    columns: {
      rank: 'Rank',
      seller: 'Seller',
      sales: 'Sales',
      pipeline: 'Pipeline',
      quotes: 'Quotes',
      closed: 'Wins',
      conversion: 'Conversion',
    },
  },
  prospectsTable: {
    title: 'Filtered prospects',
    subtitle: 'Daily operation: follow-up, stage, estimated value, and next action.',
    columns: {
      prospect: 'Prospect',
      customer: 'Customer',
      stage: 'Stage',
      owner: 'Owner',
      value: 'Value',
      nextAction: 'Next action',
      status: 'Status',
    },
  },
} as const;
