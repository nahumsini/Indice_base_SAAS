import type { ReceivablesTranslations } from './types';

export const enCA: ReceivablesTranslations = {
  module: {
    title: 'Receivables',
    subtitle: 'Manage credit sales, due dates, payments, and customer credit policies.',
    loadingTitle: 'Loading receivables',
    loadingDescription: 'Opening the selected section.',
    navLabel: 'Receivables',
    openBalanceLabel: 'Open balance',
  },
  tabs: {
    'accounts-receivable': 'Accounts Receivable',
    'credit-customers': 'Credit Customers',
    'credit-sales': 'Credit Sales',
    payments: 'Payments',
  },
  filters: {
    title: 'Filters',
    search: 'Search',
    searchPlaceholder: 'Customer, sale, or reference',
    period: 'Period',
    status: 'Status',
    unit: 'Unit',
    business: 'Business',
    all: 'All',
    allUnits: 'All',
    periodOptions: {
      all: 'All',
      today: 'Today',
      this_week: 'This week',
      this_month: 'This month',
      last_month: 'Last month',
    },
  },
  kpiEngine: {
    currency: {
      consolidatedIn: 'Consolidated in',
      nativeOrigin: 'Native origin',
      partialTotal: 'Partial total',
      excludedRecords: (count) => `${count} excluded records`,
      dailyRate: 'Daily exchange rate',
      unavailable: 'Unavailable',
    },
    creditSales: {
      labels: {
        receivableTotal: 'receivable',
        visibleSales: 'visible',
        activeSales: 'active',
        monthlyFlow: 'monthly payment',
        totalInterest: 'interest',
        completedSales: 'closed',
      },
      alerts: {
        nativeCurrencyTotal: (label) => `Native ${label}`,
        active: (count) => `${count} active`,
        simulated: (count) => `${count} in simulation`,
        blocked: (count) => `${count} stopped`,
        multiCurrency: (count) => `${count} currencies`,
      },
      segments: {
        active: 'Active',
        setup: 'Simulation',
        completed: 'Closed',
        stopped: 'Stopped',
      },
      insight: ({
        active,
        blocked,
        completed,
        nativeTotal,
        preferredCurrency,
        receivableTotal,
        setup,
        total,
        visible,
      }) => {
        if (visible === 0) {
          return 'No credit sales match the current filters; adjust period, status, unit, or business to review receivables.';
        }

        if (blocked > 0) {
          return `${blocked} credit sales are stopped and should be reviewed before projecting collections.`;
        }

        if (setup > 0) {
          return `${setup} sales are in simulation or approval; complete the financial run before moving them into active collections.`;
        }

        if (active > 0) {
          return `${active} active sales hold ${receivableTotal} estimated receivable in ${preferredCurrency}. Native total: ${nativeTotal}.`;
        }

        return `${completed} sales are closed across ${visible} visible of ${total}. The filtered portfolio is reconciled in ${preferredCurrency}.`;
      },
    },
    accountsReceivable: {
      labels: {
        dueSoon: 'due soon',
        openBalance: 'open balance',
        overdue: 'overdue',
        paid: 'paid',
        partial: 'partial',
        visibleInstallments: 'installments',
      },
      alerts: {
        dueSoon: (count) => `${count} due soon`,
        multiCurrency: (count) => `${count} currencies`,
        nativeCurrencyTotal: (label) => `Native ${label}`,
        overdue: (count) => `${count} overdue`,
      },
      segments: {
        dueSoon: 'Due soon',
        onTime: 'On time',
        overdue: 'Overdue',
        paid: 'Paid',
        partial: 'Partial',
      },
      insight: ({
        dueSoon,
        nativeTotal,
        openBalance,
        overdue,
        preferredCurrency,
        total,
        visible,
      }) => {
        if (visible === 0) {
          return 'No installments match the current filters; adjust period, status, unit, or business to review collections.';
        }

        if (overdue > 0) {
          return `${overdue} installments need immediate follow-up. Filtered balance: ${openBalance} in ${preferredCurrency}.`;
        }

        if (dueSoon > 0) {
          return `${dueSoon} installments are coming due; prepare reminders before they become overdue.`;
        }

        return `${visible} of ${total} installments are reconciled in this filter. Native total: ${nativeTotal}.`;
      },
    },
    payments: {
      labels: {
        card: 'card',
        cash: 'cash',
        totalPaid: 'paid',
        transfer: 'transfers',
        visiblePayments: 'payments',
        withReceipt: 'with file',
      },
      alerts: {
        missingReceipts: (count) => `${count} missing receipt`,
        nativeCurrencyTotal: (label) => `Native ${label}`,
        withReceipts: (count) => `${count} with receipt`,
      },
      segments: {
        card: 'Card',
        cash: 'Cash',
        other: 'Other',
        transfer: 'Transfer',
      },
      insight: ({
        missingReceipts,
        nativeTotal,
        preferredCurrency,
        totalPaid,
        visible,
        withReceipts,
      }) => {
        if (visible === 0) {
          return 'No payments match the current filters; register a payment or adjust the period to review receipts.';
        }

        if (missingReceipts > 0) {
          return `${missingReceipts} payments are still missing a receipt. Visible total: ${totalPaid} in ${preferredCurrency}.`;
        }

        return `${withReceipts} payments have a supporting file. Native total registered: ${nativeTotal}.`;
      },
    },
    creditCustomers: {
      labels: {
        active: 'active',
        available: 'available',
        blocked: 'blocked',
        creditLine: 'total line',
        review: 'review',
        visibleCustomers: 'customers',
      },
      alerts: {
        active: (count) => `${count} active`,
        blocked: (count) => `${count} blocked`,
        review: (count) => `${count} in review`,
      },
      segments: {
        active: 'Active',
        blocked: 'Blocked',
        review: 'Review',
      },
      insight: ({
        active,
        available,
        blocked,
        creditLine,
        preferredCurrency,
        review,
        visible,
      }) => {
        if (visible === 0) {
          return 'No credit customers match the current filters; adjust unit, business, or status.';
        }

        if (blocked > 0 || review > 0) {
          return `${review + blocked} customers need policy review before releasing new credit sales.`;
        }

        return `${active} active customers have ${available} available out of ${creditLine} configured in ${preferredCurrency}.`;
      },
    },
  },
  status: {
    active: 'Active',
    approved: 'Approved',
    cancelled: 'Cancelled',
    completed: 'Completed',
    draft: 'Draft',
    due_soon: 'Due soon',
    on_time: 'On time',
    overdue: 'Overdue',
    paid: 'Paid',
    partial: 'Partial',
    rejected: 'Rejected',
    restructured: 'Restructured',
    simulated: 'Simulated',
  },
  creditCustomerStatus: {
    active: 'Active',
    blocked: 'Blocked',
    review: 'In review',
  },
  paymentMethods: {
    card: 'Card',
    cash: 'Cash',
    check: 'Check',
    transfer: 'Transfer',
    wallet: 'Wallet',
  },
  common: {
    cancel: 'Cancel',
    close: 'Close',
    financeUser: 'Finance',
    noReference: 'No reference',
  },
  views: {
    creditSales: {
      title: 'Credit Sales',
      subtitle: 'Sales converted to credit and selected financial simulations.',
      action: 'New credit sale',
      columnsAction: 'Columns',
      rowActions: {
        detail: 'View detail',
        schedule: 'View schedule',
      },
      empty: 'No credit sales match these filters.',
      itemLabel: 'sales',
      table: {
        actions: 'Actions',
        due: 'Due',
        business: 'Business',
        customer: 'Customer',
        monthlyPayment: 'Monthly payment',
        amount: 'Amount',
        run: 'Simulation',
        sale: 'Sale',
        status: 'Status',
        unit: 'Unit',
      },
    },
    accountsReceivable: {
      title: 'Accounts Receivable',
      subtitle: 'Review due dates, balances, and payment status by period.',
      rowActions: {
        files: 'View files',
        payment: 'Register payment',
      },
      columnsAction: 'Columns',
      empty: 'No receivable installments match these filters.',
      itemLabel: 'installments',
      table: {
        actions: 'Actions',
        amount: 'Amount',
        balance: 'Balance',
        business: 'Business',
        customer: 'Customer',
        dueDate: 'Due date',
        installment: 'Installment',
        paid: 'Paid',
        sale: 'Sale',
        status: 'Status',
        unit: 'Unit',
      },
    },
    payments: {
      title: 'Payments',
      subtitle: 'Payments applied to credit sales.',
      action: 'Register payment',
      columnsAction: 'Columns',
      rowActions: {
        files: 'View receipts',
      },
      empty: 'No payments match these filters.',
      itemLabel: 'payments',
      table: {
        actions: 'Actions',
        amount: 'Amount',
        customer: 'Customer',
        date: 'Date',
        files: 'Receipts',
        method: 'Method',
        reference: 'Reference',
        registeredBy: 'Registered by',
        sale: 'Sale',
      },
    },
    creditCustomers: {
      title: 'Credit Customers',
      subtitle: 'Customer policies, monthly limits, and credit lines.',
      action: 'Add customer',
      columnsAction: 'Columns',
      rowActions: {
        delete: 'Delete policy',
        edit: 'Edit policy',
      },
      empty: 'No credit customers match these filters.',
      itemLabel: 'customers',
      table: {
        actions: 'Actions',
        annualInterest: 'Interest',
        available: 'Available',
        business: 'Business',
        customer: 'Customer',
        line: 'Line',
        monthlyLimit: 'Monthly limit',
        status: 'Status',
        term: 'Term',
        unit: 'Unit',
      },
    },
  },
  modals: {
    creditSale: {
      title: 'Create credit sale',
      description: 'Select a sale, simulate compound interest, and approve the financial run.',
      sourceSale: 'Source sale',
      creditCustomer: 'Credit customer',
      creditCustomerHelp: 'The ticket keeps its source folio, but the debt is linked to the approved customer.',
      creditCustomerRequired: 'Select an active credit customer before approving this sale.',
      noActiveCreditCustomers: 'There are no active credit customers available to assign this sale.',
      financedAmount: 'Financed amount',
      firstDueDate: 'First due date',
      months: 'Months',
      annualInterest: 'Annual interest',
      simulations: 'Financial simulations',
      monthlyPayment: 'Monthly payment',
      totalInterest: 'Total interest',
      approve: 'Approve simulation',
      noSales: 'There are no sales available to convert to credit.',
      detailTitle: 'Credit sale detail',
      detailDescription: 'Review source, customer, amount, and approved credit terms.',
      scheduleTitle: 'Financial schedule',
      scheduleDescription: 'Estimated due-date calendar generated from the approved simulation.',
      originalAmount: 'Original amount',
      totalPayable: 'Total payable',
      term: 'Term',
      source: 'Source',
      firstDueDateLabel: 'First due date',
      installment: 'Installment',
      dueDate: 'Due date',
      balance: 'Balance',
      availableLine: (amount, months) => `Available line: ${amount} - suggested term ${months} months`,
      noPolicy: 'Customer has no saved policy. You can simulate the run and create the policy later.',
      inactivePolicy: 'The customer policy is not active; select another credit customer or update its status.',
      overLimit: 'The financed amount exceeds the selected customer available line.',
    },
    payment: {
      title: 'Register payment',
      description: 'Apply a payment to an open account and update outstanding balances.',
      account: 'Account',
      pendingBalance: 'Outstanding balance',
      amount: 'Amount',
      method: 'Method',
      reference: 'Reference',
      registeredBy: 'Registered by',
      receipt: 'Receipt',
      receiptHint: 'Upload an image, PDF, or supporting payment file.',
      uploadReceipt: 'Upload receipt',
      replaceReceipt: 'Replace receipt',
      removeReceipt: 'Remove receipt',
      save: 'Save payment',
      noAccounts: 'There are no open accounts to apply payments.',
    },
    files: {
      title: 'Supporting files',
      description: 'Review receipts, statements, or supporting files linked to this movement.',
      amount: 'Amount',
      download: 'Download',
      empty: 'No files are registered for this movement.',
      missing: 'No file',
      noPreview: 'Preview is not available for this format.',
      open: 'Open file',
      reference: 'Reference',
      registeredOn: 'Registered',
    },
    creditPolicy: {
      title: 'Add credit customer',
      editTitle: 'Edit credit customer',
      description: 'Define line, monthly limit, suggested term, and customer credit policy.',
      editDescription: 'Update line, monthly limit, suggested term, and policy status.',
      customer: 'Customer',
      creditLine: 'Credit line',
      monthlyLimit: 'Monthly limit',
      suggestedTerm: 'Suggested term',
      annualInterest: 'Annual interest',
      status: 'Status',
      notes: 'Notes',
      save: 'Save policy',
      update: 'Update policy',
      noCustomers: 'There are no customers available to add.',
      deleteTitle: 'Delete credit policy',
      deleteDescription: (customerName) => `This action removes ${customerName} from credit customers in this view.`,
      deleteAction: 'Delete policy',
      deleteConfirm: (customerName) => `Delete the credit policy for ${customerName}?`,
    },
  },
  errors: {
    createCreditPolicy: 'Credit policy could not be created.',
    createCreditSale: 'Credit sale could not be created.',
    registerPayment: 'Payment could not be registered.',
  },
};
