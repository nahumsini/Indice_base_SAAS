import type { ExpenseBulkStatusChange } from '../types/expenseOperations.types';
import { formatExpenseDate } from '../utils/expenseDates';
import { apiClient } from '../../../lib/apiClient';
import {
  toExpense,
  toExpenseApiRequest,
  toFinanceExpenseFromApi,
} from '../adapters/expense.adapter';
import { EXPENSE_COLUMN_CONTRACT } from '../types/expense-column-contract.types';
import { createEmptyFinancialOverview } from '../types/financial-overview.types';
import type { Expense, ExpensePayment, ExpenseStatus } from '../types/expenses.types';
import type { ExpenseColumnContract } from '../types/expense-column-contract.types';
import type { FinancialOverview } from '../types/financial-overview.types';
import type { FinanceExpense, FinancePurchaseOrder } from '../types/finance-domain.types';
import type { ExpenseApiDto, ExpenseListApiResponse, ExpensePaymentListApiResponse } from '../types/finance-api.types';

import type { FinanceBulkAction } from '../../shared/financeBulkActions.copy';

const expensesPath = '/api/v1/finance/expenses';

const jsonMutation = (method: 'POST' | 'PUT' | 'PATCH', body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const expensesService = {
  async applyBulkStatus(rows: Expense[], change: ExpenseBulkStatusChange, providers: Array<{ id: string; name: string }> = []): Promise<Expense[]> {
    const response = await apiClient<ExpenseListApiResponse>(`${expensesPath}/bulk-status`, jsonMutation('POST', {
      ...change, paymentAccountId: change.paymentAccountId ? Number(change.paymentAccountId) : null,
      rows: rows.map(row => ({ id: Number(row.id), expectedVersion: row.version })),
    }));
    return response.expenses.map(expense => toExpense(expense, providers));
  },
  async applyBulkAction(rows: Expense[], action: FinanceBulkAction, targetId: string, reason: string, providers: Array<{ id: string; name: string }> = []): Promise<Expense[]> {
    const response = await apiClient<ExpenseListApiResponse>(`${expensesPath}/bulk-actions`, jsonMutation('POST', {
      action, rows: rows.map(row => ({ id: Number(row.id), expectedVersion: row.version })),
      targetId: targetId ? Number(targetId) : null, reason,
    }));
    return response.expenses.map(expense => toExpense(expense, providers));
  },
  async getExpenses(providers: Array<{ id: string; name: string }> = []): Promise<Expense[]> {
    const response = await apiClient<ExpenseListApiResponse>(expensesPath);
    return response.expenses.map(expense => toExpense(expense, providers));
  },

  async getFinanceExpenses(): Promise<FinanceExpense[]> {
    const response = await apiClient<ExpenseListApiResponse>(expensesPath);
    return response.expenses.map(toFinanceExpenseFromApi);
  },

  async getFinanceExpenseSnapshot() {
    const response = await apiClient<ExpenseListApiResponse>(expensesPath);
    return {
      expenses: response.expenses.map(toFinanceExpenseFromApi),
      asOfDate: response.asOfDate,
      timeZone: response.timeZone,
    };
  },

  async getExpenseById(expenseId: string, providers: Array<{ id: string; name: string }> = []): Promise<Expense | null> {
    const response = await apiClient<ExpenseApiDto>(`${expensesPath}/${expenseId}`);
    return toExpense(response, providers);
  },

  async getExpensePayments(expenseId: string): Promise<ExpensePayment[]> {
    const response = await apiClient<ExpensePaymentListApiResponse>(`${expensesPath}/${expenseId}/payments`);
    return response.payments.map(payment => ({
      id: String(payment.id),
      expenseId: String(payment.expenseId),
      paymentAccountId: payment.paymentAccountId == null ? undefined : String(payment.paymentAccountId),
      paymentAccountName: payment.paymentAccountName ?? undefined,
      paymentAccountType: payment.paymentAccountType ?? undefined,
      amount: Number(payment.amount),
      currency: payment.currencyCode,
      paymentDate: payment.paymentDate,
      source: payment.source,
      reversedAt: payment.reversedAt ? new Date(payment.reversedAt) : undefined,
      reversalReason: payment.reversalReason ?? undefined,
      reversedByUserId: payment.reversedByUserId == null ? undefined : String(payment.reversedByUserId),
      registeredByUserId: payment.registeredByUserId == null ? undefined : String(payment.registeredByUserId),
      registeredByName: payment.registeredByName ?? undefined,
      createdAt: new Date(payment.createdAt),
    }));
  },

  async reverseExpensePayment(expense: Expense, paymentId: string, reason: string, providers: Array<{ id: string; name: string }> = []): Promise<Expense> {
    const response = await apiClient<ExpenseApiDto>(`${expensesPath}/${expense.id}/payments/${paymentId}/reversal`, jsonMutation('POST', {
      expectedVersion: expense.version, reason,
    }));
    return toExpense(response, providers);
  },

  async importExpenses(expenses: Expense[], requestKey: string, providers: Array<{ id: string; name: string }> = []): Promise<Expense[]> {
    const response = await apiClient<ExpenseListApiResponse>(`${expensesPath}/import`, jsonMutation('POST', {
      requestKey,
      expenses: expenses.map(expense => { const request = toExpenseApiRequest(expense); return { ...request, settleOnCreate: expense.status === 'paid',
        customFields: { ...request.customFields, ...(expense.taxIncluded !== undefined ? { bulkTaxIncluded: expense.taxIncluded } : {}) } }; }),
    }));
    return response.expenses.map(expense => toExpense(expense, providers));
  },

  async updateExpensesBatch(expenses: Expense[], providers: Array<{ id: string; name: string }> = []): Promise<Expense[]> {
    const response = await apiClient<ExpenseListApiResponse>(`${expensesPath}/batch`, jsonMutation('PUT', {
      expenses: expenses.map(expense => ({ id: Number(expense.id), expectedVersion: expense.version, expense: toExpenseApiRequest(expense) })),
    }));
    return response.expenses.map(expense => toExpense(expense, providers));
  },

  async reclassifyExpense(expense: Expense, accountingAccountId: string, providers: Array<{ id: string; name: string }> = []): Promise<Expense> {
    const response = await apiClient<ExpenseApiDto>(`${expensesPath}/${expense.id}/accounting-account`, jsonMutation('PATCH', {
      accountingAccountId: accountingAccountId ? Number(accountingAccountId) : null,
      expectedVersion: expense.version,
    }));
    return toExpense(response, providers);
  },

  async createExpense(expense: Expense, providers: Array<{ id: string; name: string }> = [], requestKey: string = crypto.randomUUID()): Promise<Expense> {
    if (expense.type === 'real' && expense.status === 'paid' && !expense.budgetLineId && !expense.purchaseOrderId) {
      const response = await apiClient<ExpenseListApiResponse>(`${expensesPath}/import`, jsonMutation('POST', {
        requestKey, expenses: [{ ...toExpenseApiRequest({ ...expense, folio: 'AUTO-EXP' }), settleOnCreate: true }],
      }));
      return toExpense(response.expenses[0], providers);
    }
    const request = toExpenseApiRequest(expense);
    const response = await apiClient<ExpenseApiDto>(
      expensesPath,
      jsonMutation('POST', {
        ...request,
        settleOnCreate: expense.type === 'real' && expense.status === 'paid' && Boolean(expense.paymentAccountId),
      }),
    );
    return toExpense(response, providers);
  },

  async createPayableAccount(expense: Expense, providers: Array<{ id: string; name: string }> = []): Promise<Expense> {
    const response = await apiClient<ExpenseApiDto>(
      expensesPath,
      jsonMutation('POST', toExpenseApiRequest({ ...expense, type: 'payable', status: expense.status ?? 'pending' })),
    );
    return toExpense(response, providers);
  },

  async updateExpense(expense: Expense, providers: Array<{ id: string; name: string }> = []): Promise<Expense> {
    const response = await apiClient<ExpenseApiDto>(
      `${expensesPath}/${expense.id}/corrections`,
      jsonMutation('POST', { expectedVersion: expense.version, expense: toExpenseApiRequest(expense) }),
    );
    return toExpense(response, providers);
  },

  async deleteExpense(expenseId: string): Promise<void> {
    await apiClient(`${expensesPath}/${expenseId}`, { method: 'DELETE' });
  },

  async submitExpense(expenseId: string, providers: Array<{ id: string; name: string }> = []): Promise<Expense> {
    const response = await apiClient<ExpenseApiDto>(`${expensesPath}/${expenseId}/submit`, { method: 'POST' });
    return toExpense(response, providers);
  },

  async approveExpense(expenseId: string, providers: Array<{ id: string; name: string }> = []): Promise<Expense> {
    const response = await apiClient<ExpenseApiDto>(`${expensesPath}/${expenseId}/approve`, { method: 'POST' });
    return toExpense(response, providers);
  },

  async settleExpensePayment(
    expenseId: string,
    paymentAccountId: string,
    idempotencyKey: string,
    providers: Array<{ id: string; name: string }> = [],
  ): Promise<Expense> {
    const response = await apiClient<ExpenseApiDto>(
      `${expensesPath}/${expenseId}/settle-payment`,
      jsonMutation('POST', { paymentAccountId: paymentAccountId ? Number(paymentAccountId) : null, idempotencyKey }),
    );
    return toExpense(response, providers);
  },

  async recordExpensePayment(
    expenseId: string,
    amount: number,
    paymentAccountId: string,
    paymentDate: Date,
    providers: Array<{ id: string; name: string }> = [],
    idempotencyKey: string = crypto.randomUUID(),
  ): Promise<Expense> {
    const response = await apiClient<ExpenseApiDto>(
      `${expensesPath}/${expenseId}/record-payment`,
      jsonMutation('POST', {
        amount,
        paymentAccountId: Number(paymentAccountId),
        paymentDate: formatExpenseDate(paymentDate),
        idempotencyKey,
      }),
    );
    return toExpense(response, providers);
  },

  async updateExpenseStatus(
    expenseId: string,
    status: ExpenseStatus,
    providers: Array<{ id: string; name: string }> = [],
    paidAmount?: number,
    paymentDate?: Date,
  ): Promise<Expense> {
    const response = await apiClient<ExpenseApiDto>(
      `${expensesPath}/${expenseId}/status`,
      jsonMutation('POST', {
        status,
        paidAmount,
        paymentDate: paymentDate ? formatExpenseDate(paymentDate) : undefined,
      }),
    );
    return toExpense(response, providers);
  },

  async closeExpense(expenseId: string, providers: Array<{ id: string; name: string }> = []): Promise<Expense> {
    const response = await apiClient<ExpenseApiDto>(`${expensesPath}/${expenseId}/close`, { method: 'POST' });
    return toExpense(response, providers);
  },

  async getPurchaseOrders(): Promise<FinancePurchaseOrder[]> {
    return [];
  },

  async getFinancialOverview(companyId = 'mock-company'): Promise<FinancialOverview> {
    return createEmptyFinancialOverview(companyId);
  },

  async getExpenseColumnContract(): Promise<ExpenseColumnContract[]> {
    return EXPENSE_COLUMN_CONTRACT.map(column => ({ ...column }));
  },
};
