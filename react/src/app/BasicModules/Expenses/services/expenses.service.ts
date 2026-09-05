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

const expensesPath = '/api/v1/finance/expenses';

const jsonMutation = (method: 'POST' | 'PUT', body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const expensesService = {
  async getExpenses(providers: Array<{ id: string; name: string }> = []): Promise<Expense[]> {
    const response = await apiClient<ExpenseListApiResponse>(expensesPath);
    return response.expenses.map(expense => toExpense(expense, providers));
  },

  async getFinanceExpenses(): Promise<FinanceExpense[]> {
    const response = await apiClient<ExpenseListApiResponse>(expensesPath);
    return response.expenses.map(toFinanceExpenseFromApi);
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
      registeredByUserId: payment.registeredByUserId == null ? undefined : String(payment.registeredByUserId),
      registeredByName: payment.registeredByName ?? undefined,
      createdAt: new Date(payment.createdAt),
    }));
  },

  async createExpense(expense: Expense, providers: Array<{ id: string; name: string }> = []): Promise<Expense> {
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
      `${expensesPath}/${expense.id}`,
      jsonMutation('PUT', toExpenseApiRequest(expense)),
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

  async recordExpensePayment(
    expenseId: string,
    amount: number,
    paymentAccountId: string,
    paymentDate: Date,
    providers: Array<{ id: string; name: string }> = [],
  ): Promise<Expense> {
    const response = await apiClient<ExpenseApiDto>(
      `${expensesPath}/${expenseId}/record-payment`,
      jsonMutation('POST', {
        amount,
        paymentAccountId: Number(paymentAccountId),
        paymentDate: paymentDate.toISOString().slice(0, 10),
        idempotencyKey: crypto.randomUUID(),
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
        paymentDate: paymentDate ? paymentDate.toISOString().slice(0, 10) : undefined,
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
