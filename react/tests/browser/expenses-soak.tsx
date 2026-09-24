import { Component, Profiler, StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { LanguageProvider } from '../../src/app/shared/context';
import { BusinessCurrencyProvider } from '../../src/app/BasicModules/shared/BusinessCurrencyContext';
import Expenses from '../../src/app/BasicModules/Expenses/Expenses/Expenses';
import { setCachedAuthSession, setCachedCsrfToken } from '../../src/app/api/authSessionStore';
import type { Expense } from '../../src/app/BasicModules/Expenses/types/expenses.types';
import '../../src/styles/index.css';

// Only loaded by the browser-test entry; no production routes import this fixture.
const stats = { commits: 0, errors: [] as string[] };
Object.assign(window, { expenseSoakStats: stats });
setCachedAuthSession({ user: { id: 9001, name: 'Test user', role: 'admin' },
  company: { id: 9001, name: 'Synthetic company', active: true, role: 'admin' } } as never);
setCachedCsrfToken('synthetic-test-csrf');
localStorage.setItem('frontend-indice-language', 'es-MX');
const now = new Date();
const fixtureExpenses: Expense[] = Array.from({ length: 1200 }, (_, index) => {
  const offset = [0, 1, 2, 3, 13, 0][index % 6];
  const date = new Date(now.getFullYear(), now.getMonth() - offset, 1 + index % 20);
  const originFund = index % 7 === 0 ? { id: String(1 + index % 35), name: `Fund ${index % 35}`, type: 'INTERNAL_COMPANY' as const } : undefined;
  const status = originFund ? 'paid' : (['paid', 'pending', 'partial', 'overdue', 'audited'] as const)[index % 5];
  return { id: String(index + 1), version: 1, folio: `TEST-${index + 1}`, concept: `Synthetic expense ${index + 1}`,
    category: 'other', businessUnit: index % 3 ? '8' : '9', business: index % 3 ? '80' : '90',
    providerId: index % 2 ? '10' : '11', providerName: `Provider ${index % 2}`, date, dueDate: date,
    amount: 100, taxes: 16, total: 116, currency: index % 4 ? 'MXN' : 'USD',
    amountPaid: ['paid', 'audited'].includes(status) ? 116 : status === 'partial' ? 50 : 0,
    paymentMethod: 'cash', type: 'real', status, backendStatus: ['paid', 'audited'].includes(status) ? 'PAID' : 'APPROVED', originFund } as Expense;
});
const providers = [{ id: '10', name: 'Provider 1', status: 'active', type: 'company' },
  { id: '11', name: 'Provider 0', status: 'active', type: 'company' }] as never;

class Boundary extends Component<{ children: React.ReactNode }, { error: string }> {
  state = { error: '' };
  static getDerivedStateFromError(error: Error) { return { error: error.message }; }
  componentDidCatch(error: Error) { stats.errors.push(error.message); }
  render() { return this.state.error ? <p role="alert">{this.state.error}</p> : this.props.children; }
}
function Fixture() {
  const [rows, setRows] = useState(fixtureExpenses);
  const [visible, setVisible] = useState(true);
  return <>
    <nav><button onClick={() => setVisible(value => !value)}>{visible ? 'Leave expenses' : 'Return expenses'}</button>
      <button onClick={() => setRows(previous => previous.map(row => ({ ...row })))}>Refresh fixture</button></nav>
    {visible && <Expenses expenses={rows} onExpensesChange={setRows} providers={providers} />}
  </>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Boundary><LanguageProvider>
  <BusinessCurrencyProvider><BrowserRouter><Profiler id="expenses" onRender={() => { stats.commits++; }}>
    <Fixture />
  </Profiler></BrowserRouter></BusinessCurrencyProvider>
</LanguageProvider></Boundary></StrictMode>);
