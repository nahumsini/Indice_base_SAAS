import { Component, Profiler, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { LanguageProvider, FavoritesProvider } from '../../src/app/shared/context';
import { BusinessCurrencyProvider } from '../../src/app/BasicModules/shared/BusinessCurrencyContext';
import { WorkbarLayoutProvider } from '../../src/app/components/workbar/WorkbarLayoutContext';
import ExpensesModule from '../../src/app/BasicModules/Expenses/ExpensesModule';
import { setCachedAuthSession, setCachedCsrfToken } from '../../src/app/api/authSessionStore';
import '../../src/styles/index.css';
const stats = { commits: 0, errors: [] as string[] };
Object.assign(window, { expenseSoakStats: stats });
setCachedAuthSession({ user: { id: 9001, name: 'Synthetic user', role: 'superadmin' },
  company: { id: 9001, name: 'Synthetic company', active: true, role: 'superadmin' } } as never);
setCachedCsrfToken('synthetic-test-csrf');
localStorage.setItem('frontend-indice-language', 'es-MX');
class Boundary extends Component<{ children: React.ReactNode }, { error: string }> {
  state = { error: '' };
  static getDerivedStateFromError(error: Error) { return { error: error.message }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { stats.errors.push(`${error.message}\n${error.stack}\n${info.componentStack}`); console.error(error); }
  render() { return this.state.error ? <p role="alert">{this.state.error}</p> : this.props.children; }
}
createRoot(document.getElementById('root')!).render(<StrictMode><Boundary><LanguageProvider><FavoritesProvider>
  <BusinessCurrencyProvider><BrowserRouter><WorkbarLayoutProvider><Profiler id="expenses" onRender={() => { stats.commits++; }}>
    <Routes><Route path="/:pageId/*" element={<ExpensesModule learningModeActive onNavigate={() => {}} />} /></Routes>
  </Profiler></WorkbarLayoutProvider></BrowserRouter></BusinessCurrencyProvider>
</FavoritesProvider></LanguageProvider></Boundary></StrictMode>);
