export type FinanceLocale =
  | 'en-CA'
  | 'en-US'
  | 'fr-CA'
  | 'es-MX'
  | 'es-CO'
  | 'pt-BR'
  | 'ko-CA'
  | 'zh-CA';

export type FinanceTranslationOverrides = DeepPartial<Omit<FinanceTranslations, 'locale'>>;

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: any[]) => any
    ? T[K]
    : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export type FinanceColumnCopy = {
  label: string;
  description?: string;
};

export type FinanceColumnModalCopy = {
  applyChanges: string;
  cancel: string;
  close: string;
  empty: string;
  fixed: string;
  searchPlaceholder: string;
  selectAll: string;
  selectionInstructions: string;
  title: string;
  visibleCount: (visible: number, total: number) => string;
};

export type FinanceAlertMessageCopy = {
  message: string;
  recommendation: string;
  title: string;
};

export type FinanceTranslations = {
  locale: FinanceLocale;
  module: {
    back: string;
    loadingFinanceDescription: string;
    loadingFinanceTitle: string;
    loadingTabDescription: string;
    loadingTabTitle: string;
    subtitle: string;
    tabs: {
      accountingAccounts: string;
      budgets: string;
      expenses: string;
      kpis: string;
      paymentAccounts: string;
      providers: string;
    };
    title: string;
  };
  common: {
    actions: string;
    active: string;
    addFiles: string;
    all: string;
    applyTax: string;
    cancel: string;
    columns: string;
    continue: string;
    create: string;
    delete: string;
    deselectAll: string;
    duplicate: string;
    edit: string;
    inactive: string;
    loading: string;
    noOptions: string;
    next: string;
    previous: string;
    restore: string;
    results: (count: number) => string;
    rowsPerPage: string;
    saveChanges: string;
    search: string;
    select: string;
    selectAll: string;
    showing: (start: number, end: number, total: number) => string;
    unassigned: string;
    viewAttachedFiles: string;
  };
  filters: {
    business: string;
    period: string;
    provider: string;
    status: string;
    title: string;
    unit: string;
  };
  periods: {
    custom: string;
    lastMonth: string;
    lastYear: string;
    thisMonth: string;
    thisYear: string;
    twoMonthsAgo: string;
  };
  statuses: {
    audited: string;
    overdue: string;
    paid: string;
    partial: string;
    pending: string;
  };
  expenses: {
    createDisabledReason: string;
    emptyMessage: string;
    emptyTitle: string;
    headerButton: string;
    headerSubtitle: string;
    headerTitle: string;
    preferredCurrency: string;
    searchPlaceholder: string;
    attachments: {
      attachedFiles: (count: number) => string;
      dragDescription: string;
      dragTitle: string;
      download: string;
      empty: string;
      open: string;
      previewUnavailable: string;
      saveFiles: (count: number) => string;
      saveHint: string;
      selectFiles: string;
      supportedFormats: string;
      title: string;
      total: string;
    };
    bulk: {
      selected: (count: number) => string;
      title: string;
    };
    columnModalDescription: string;
    columns: Record<string, FinanceColumnCopy>;
    messages: {
      accountLoadFailed: string;
      created: string;
      createFailed: string;
      deleted: string;
      deleteFailed: string;
      duplicated: string;
      duplicateFailed: string;
      saved: string;
      saveFailed: string;
      updateFailed: string;
    };
    quick: {
      create: string;
      currency: string;
      description: string;
      saving: string;
      title: string;
    };
    modal: {
      amount: string;
      concept: string;
      create: string;
      currency: string;
      description: string;
      edit: string;
      groupTitle: string;
      mainTitle: string;
      placeholderConcept: string;
      subtitle: string;
      summarySubtotal: string;
      summaryTaxes: string;
      summaryTotal: string;
    };
    payment: {
      action: string;
      amount: string;
      amountExceedsBalance: string;
      currentPaid: string;
      date: string;
      newBalance: string;
      noBalance: string;
      remainingBalance: string;
      save: string;
      sectionDescription: string;
      sectionTitle: string;
      subtitle: string;
      title: string;
      total: string;
    };
    table: {
      addAudit: string;
      addDescription: string;
      allVisibleSelection: string;
      auditNotesFor: (folio: string) => string;
      authorizerFor: (folio: string) => string;
      businessFor: (folio: string) => string;
      conceptFor: (folio: string) => string;
      fallbackAccounts: string[];
      paymentMethods: Record<string, string>;
      providerFor: (folio: string) => string;
      responsibleFor: (folio: string) => string;
      selectExpense: (folio: string) => string;
      statuses: Record<string, string>;
      unitFor: (folio: string) => string;
    };
    summary: {
      overdue: (count: number) => string;
      records: (count: number) => string;
      total: string;
    };
  };
  budgets: {
    addLine: string;
    budget: string;
    budgetLine: string;
    committed: string;
    actual: string;
    available: string;
    health: string;
    headerButton: string;
    headerSubtitle: string;
    headerTitle: string;
    loadingDescription: string;
    loadingTitle: string;
    planned: string;
    period: string;
    frequencies: Record<string, string>;
    columns: Record<string, FinanceColumnCopy>;
    filters: {
      accountingAccount: string;
      clearSearch: string;
      customFutureRange: string;
      defaultHelp: string;
      from: string;
      futurePeriod: string;
      nextMonth: string;
      nextQuarter: string;
      searchPlaceholder: string;
      to: string;
    };
    summary: {
      budgetLines: (count: number) => string;
      lineCount: (count: number) => string;
      noAccountingAccount: string;
      other: string;
      totalEstimated: string;
    };
    messages: {
      created: (count: number) => string;
      createFailed: string;
      deleteFailed: string;
      deleted: string;
      emptyMessage: string;
      emptyTitle: string;
      lineSaveFailed: string;
      partialSaveFailed: string;
      updated: string;
      updateFailed: string;
    };
    modal: {
      account: string;
      amount: string;
      back: string;
      concept: string;
      createTitle: string;
      description: string;
      editSubtitle: string;
      editTitle: string;
      fieldGroupCost: string;
      fieldGroupPeriod: string;
      finishCreate: string;
      finishEdit: string;
      frequency: string;
      periodEnd: string;
      periodStart: string;
      provider: string;
      scheduleDescription: string;
      scheduleEmpty: string;
      scheduleSummary: string;
      scheduleTitle: string;
      stepCost: string;
      stepOf: (step: number, total: number) => string;
      stepSchedule: string;
      subtitle: string;
      titleCost: string;
      unit: string;
      business: string;
    };
  };
  providers: {
    add: string;
    edit: string;
    headerSubtitle: string;
    headerTitle: string;
    columns: Record<string, FinanceColumnCopy>;
    filters: {
      searchPlaceholder: string;
      type: string;
    };
    modal: {
      assignment: string;
      back: string;
      classification: string;
      contact: string;
      contactDescription: string;
      contactTitle: string;
      defaultSubtitle: string;
      finish: string;
      identity: string;
      location: string;
      next: string;
      noActiveAccounts: string;
      owners: string;
      ownersDescription: string;
      ownersTitle: string;
      scopeDescription: string;
      scopeTitle: string;
      stepContact: string;
      stepData: string;
      stepOf: (step: number, total: number) => string;
      stepOwners: string;
      stepScope: string;
      titleDescription: string;
      titleMain: string;
    };
    types: Record<string, string>;
  };
  accountingAccounts: {
    add: string;
    importCatalog: string;
    headerSubtitle: string;
    headerTitle: string;
    columns: Record<string, FinanceColumnCopy>;
    catalog: {
      alreadyExists: string;
      availableInView: (count: number) => string;
      clearVisible: string;
      countryLabels: Record<string, string>;
      description: string;
      importSelected: (count: number) => string;
      importing: string;
      searchPlaceholder: string;
      sectionLabels: Record<string, string>;
      selectedCount: (count: number) => string;
      selectVisible: string;
    };
    filters: {
      searchPlaceholder: string;
      type: string;
      allTypes: string;
    };
    messages: {
      activated: string;
      created: string;
      deleted: string;
      deleteFailed: string;
      deactivated: string;
      importFailed: string;
      imported: (count: number) => string;
      noNewAccounts: string;
      saveFailed: string;
      statusUpdateFailed: string;
      updated: string;
    };
    modal: {
      assignment: string;
      catalog: string;
      classification: string;
      close: string;
      code: string;
      defaultSubtitle: string;
      description: string;
      descriptionPlaceholder: string;
      expectedUse: string;
      fieldGroupUsage: string;
      identity: string;
      next: string;
      previous: string;
      scope: string;
      scopeDescription: string;
      status: string;
      title: string;
      type: string;
    };
    types: Record<string, string>;
  };
  paymentAccounts: {
    add: string;
    headerSubtitle: string;
    headerTitle: string;
    pettyCashNotice: string;
    columns: Record<string, FinanceColumnCopy>;
    filters: {
      allTypes: string;
      searchPlaceholder: string;
      type: string;
    };
    messages: {
      activated: string;
      created: string;
      deleted: string;
      deleteFailed: string;
      deactivated: string;
      saveFailed: string;
      statusUpdateFailed: string;
      updated: string;
    };
    table: {
      activate: string;
      deactivate: string;
      emptyDescription: string;
      emptyTitle: string;
      noCustodian: string;
      open: string;
      openPettyCash: string;
      pettyCash: string;
      pettyCashDetail: (custodian: string) => string;
    };
    types: Record<string, string>;
  };
  kpis: {
    alerts: string;
    baseCurrency: string;
    budgetHealth: string;
    cashRequirements: string;
    committed: string;
    costDrivers: {
      accountingAccounts: string;
      businesses: string;
      paymentAccounts: string;
      providers: string;
      units: string;
    };
    empty: string;
    actual: string;
    available: string;
    alertCopy: {
      accountConcentration: (account: string, percentage: string) => FinanceAlertMessageCopy;
      budgetExceeded: (count: number) => FinanceAlertMessageCopy;
      budgetWarning: (count: number) => FinanceAlertMessageCopy;
      cashNext7: (amount: string) => FinanceAlertMessageCopy;
      healthy: FinanceAlertMessageCopy;
      multiCurrency: (currencies: string, baseCurrency: string) => FinanceAlertMessageCopy;
      noBudget: FinanceAlertMessageCopy;
      overduePayments: (count: number, amount: string) => FinanceAlertMessageCopy;
      providerConcentration: (provider: string, percentage: string) => FinanceAlertMessageCopy;
      unitConcentration: (unit: string, percentage: string) => FinanceAlertMessageCopy;
      unpaidExpenses: (count: number) => FinanceAlertMessageCopy;
    };
    budgetLine: string;
    cashRequirementCopy: Record<string, { description: string; label: string }>;
    concentrationRisk: string;
    consumption: string;
    countLabel: string;
    dataFallback: (scope: string) => string;
    executiveSignal: string;
    fallback: string;
    fallbackService: string;
    financialSummary: string;
    headerSubtitle: string;
    headerTitle: string;
    healthLabels: {
      exceeded: string;
      onTrack: string;
      warning: string;
    };
    insights: {
      limit: string;
      noData: string;
      overdue: string;
      stable: string;
    };
    noAccountingAccountExpenses: string;
    noBusinessExpenses: string;
    noPaymentAccountExpenses: string;
    noProviderExpenses: string;
    noUnitExpenses: string;
    overdue: string;
    pending: string;
    periodFilterHelp: string;
    pdfFileName: string;
    pdfGeneratedAt: string;
    pdfPeriod: string;
    printPdf: string;
    planned: string;
    records: string;
    summaryCopy: {
      budgetAvailable: (percentage: string) => string;
      budgetExceeded: string;
      budgetStable: string;
      budgetWarning: string;
      concentration: (first: string, second?: string) => string;
      noBudget: string;
      noOverdue: string;
      overdue: (count: number) => string;
      unpaid: (count: number) => string;
    };
    topCostDrivers: {
      accountingAccounts: string;
      businesses: string;
      providers: string;
      units: string;
    };
    used: string;
  };
  columnModal: FinanceColumnModalCopy;
  tax: {
    amountIncludesTax: string;
    applyTax: string;
    availableSingular: string;
    availablePlural: (count: number) => string;
    consumptionTaxes: string;
    noTaxForCurrency: (currency: string) => string;
    rate: string;
    taxAvailable: string;
  };
};
