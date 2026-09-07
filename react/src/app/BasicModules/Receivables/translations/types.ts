import type {
  CreditCustomerStatus,
  CreditSaleStatus,
  PaymentMethod,
  PeriodFilter,
  ReceivableStatus,
} from '../types';
import type { ReceivablesTabId } from '../constants/receivables.constants';

export type ReceivablesLocale =
  | 'es-MX'
  | 'es-CO'
  | 'en-US'
  | 'en-CA'
  | 'fr-CA'
  | 'pt-BR'
  | 'ko-CA'
  | 'zh-CA';

export type TableCopy = {
  [key: string]: string;
};

export interface ReceivablesTranslations {
  module: {
    title: string;
    subtitle: string;
    loadingTitle: string;
    loadingDescription: string;
    navLabel: string;
    openBalanceLabel: string;
  };
  tabs: Record<ReceivablesTabId, string>;
  filters: {
    title: string;
    search: string;
    searchPlaceholder: string;
    period: string;
    status: string;
    unit: string;
    business: string;
    all: string;
    allUnits: string;
    clear: string;
    hideMore: string;
    more: string;
    method: string;
    evidence: string;
    withEvidence: string;
    withoutEvidence: string;
    periodOptions: Record<PeriodFilter, string>;
  };
  kpiEngine: {
    currency: {
      consolidatedIn: string;
      nativeOrigin: string;
      partialTotal: string;
      excludedRecords: (count: number) => string;
      dailyRate: string;
      unavailable: string;
    };
    creditSales: {
      labels: {
        receivableTotal: string;
        visibleSales: string;
        activeSales: string;
        monthlyFlow: string;
        totalInterest: string;
        completedSales: string;
      };
      alerts: {
        nativeCurrencyTotal: (label: string) => string;
        active: (count: number) => string;
        simulated: (count: number) => string;
        blocked: (count: number) => string;
        multiCurrency: (count: number) => string;
      };
      segments: {
        active: string;
        setup: string;
        completed: string;
        stopped: string;
      };
      insight: (context: {
        active: number;
        blocked: number;
        completed: number;
        nativeTotal: string;
        preferredCurrency: string;
        receivableTotal: string;
        setup: number;
        total: number;
        visible: number;
      }) => string;
    };
    accountsReceivable: {
      labels: {
        openBalance: string;
        visibleInstallments: string;
        overdue: string;
        dueSoon: string;
        paid: string;
        partial: string;
      };
      alerts: {
        nativeCurrencyTotal: (label: string) => string;
        overdue: (count: number) => string;
        dueSoon: (count: number) => string;
        multiCurrency: (count: number) => string;
      };
      segments: {
        onTime: string;
        dueSoon: string;
        overdue: string;
        partial: string;
        paid: string;
      };
      insight: (context: {
        dueSoon: number;
        nativeTotal: string;
        openBalance: string;
        overdue: number;
        preferredCurrency: string;
        total: number;
        visible: number;
      }) => string;
    };
    payments: {
      labels: {
        totalPaid: string;
        visiblePayments: string;
        withReceipt: string;
        missingReceipt: string;
        transfer: string;
        cash: string;
        card: string;
      };
      alerts: {
        nativeCurrencyTotal: (label: string) => string;
        missingReceipts: (count: number) => string;
        withReceipts: (count: number) => string;
      };
      segments: {
        transfer: string;
        cash: string;
        card: string;
        other: string;
      };
      insight: (context: {
        missingReceipts: number;
        nativeTotal: string;
        preferredCurrency: string;
        totalPaid: string;
        visible: number;
        withReceipts: number;
      }) => string;
    };
    creditCustomers: {
      labels: {
        creditLine: string;
        available: string;
        visibleCustomers: string;
        active: string;
        review: string;
        blocked: string;
        utilization: string;
      };
      alerts: {
        active: (count: number) => string;
        review: (count: number) => string;
        blocked: (count: number) => string;
      };
      segments: {
        active: string;
        review: string;
        blocked: string;
      };
      insight: (context: {
        active: number;
        available: string;
        blocked: number;
        creditLine: string;
        preferredCurrency: string;
        review: number;
        visible: number;
      }) => string;
    };
  };
  status: Record<CreditSaleStatus | ReceivableStatus, string>;
  creditCustomerStatus: Record<CreditCustomerStatus, string>;
  paymentMethods: Record<PaymentMethod, string>;
  common: {
    cancel: string;
    close: string;
    noReference: string;
    financeUser: string;
  };
  views: {
    creditSales: {
      title: string;
      subtitle: string;
      action: string;
      columnsAction: string;
      rowActions: {
        detail: string;
        schedule: string;
      };
      empty: string;
      itemLabel: string;
      table: TableCopy;
    };
    accountsReceivable: {
      title: string;
      subtitle: string;
      rowActions: {
        payment: string;
        files: string;
      };
      columnsAction: string;
      empty: string;
      itemLabel: string;
      table: TableCopy;
    };
    payments: {
      title: string;
      subtitle: string;
      action: string;
      columnsAction: string;
      rowActions: {
        files: string;
      };
      empty: string;
      itemLabel: string;
      table: TableCopy;
    };
    creditCustomers: {
      title: string;
      subtitle: string;
      action: string;
      columnsAction: string;
      rowActions: {
        delete: string;
        edit: string;
      };
      empty: string;
      itemLabel: string;
      table: TableCopy;
    };
  };
  modals: {
    creditSale: {
      title: string;
      description: string;
      sourceSale: string;
      creditCustomer: string;
      creditCustomerHelp: string;
      creditCustomerRequired: string;
      noActiveCreditCustomers: string;
      financedAmount: string;
      firstDueDate: string;
      months: string;
      annualInterest: string;
      simulations: string;
      monthlyPayment: string;
      totalInterest: string;
      approve: string;
      noSales: string;
      detailTitle: string;
      detailDescription: string;
      scheduleTitle: string;
      scheduleDescription: string;
      originalAmount: string;
      totalPayable: string;
      term: string;
      source: string;
      firstDueDateLabel: string;
      installment: string;
      dueDate: string;
      balance: string;
      availableLine: (amount: string, months: number) => string;
      noPolicy: string;
      inactivePolicy: string;
      overLimit: string;
    };
    payment: {
      destinationAccount: string;
      destinationPlaceholder: string;
      universalCash: string;
      title: string;
      description: string;
      account: string;
      pendingBalance: string;
      amount: string;
      method: string;
      reference: string;
      registeredBy: string;
      receipt: string;
      receiptHint: string;
      uploadReceipt: string;
      replaceReceipt: string;
      removeReceipt: string;
      save: string;
      noAccounts: string;
    };
    files: {
      title: string;
      description: string;
      empty: string;
      missing: string;
      open: string;
      download: string;
      noPreview: string;
      registeredOn: string;
      reference: string;
      amount: string;
    };
    creditPolicy: {
      title: string;
      editTitle: string;
      description: string;
      editDescription: string;
      customer: string;
      creditLine: string;
      monthlyLimit: string;
      suggestedTerm: string;
      annualInterest: string;
      status: string;
      notes: string;
      save: string;
      update: string;
      noCustomers: string;
      deleteTitle: string;
      deleteDescription: (customerName: string) => string;
      deleteAction: string;
      deleteConfirm: (customerName: string) => string;
    };
  };
  errors: {
    createCreditSale: string;
    registerPayment: string;
    createCreditPolicy: string;
  };
}
