import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { LanguageProvider } from '../../src/app/shared/context';
import { setCachedAuthSession } from '../../src/app/api/authSessionStore';
import { WorkbarLayoutProvider } from '../../src/app/components/workbar/WorkbarLayoutContext';
import MultiKioskCenterPage from '../../src/app/KioskCenter/MultiKioskCenterPage';
import SubscriptionManagementPage from '../../src/app/Billing/SubscriptionManagementPage';
import PlatformAdminPage from '../../src/app/PlatformAdmin/PlatformAdminPage';
import AccountTypeEditModal from '../../src/app/PlatformAdmin/AccountTypeEditModal';
import DistributorAssignmentModal from '../../src/app/PlatformAdmin/DistributorAssignmentModal';
import { TrialExtensionModal } from '../../src/app/PlatformAdmin/Customers/TrialExtensionModal';
import type { PlatformCompanySummary } from '../../src/app/api/platformAdmin';
import '../../src/styles/index.css';

localStorage.setItem('frontend-indice-language', new URL(location.href).searchParams.get('language') ?? 'es-MX');
setCachedAuthSession({ user: { id: 901, name: 'Synthetic admin', role: 'root' }, company: { id: 901, name: 'Synthetic company', role: 'root', user_company_id: 901, active: true }, companies: [], csrfToken: 'synthetic-csrf' } as never);
const company = { id: 902, name: 'Empresa de prueba', user_type: 'SUPER_ADMIN', owner_email: 'admin@example.test', trial_days_remaining: 3, trial_ends_at: '2026-11-01T12:00:00Z' } as PlatformCompanySummary;
function Forms() {
  const [open, setOpen] = useState(''), [saving, setSaving] = useState(false), [error, setError] = useState('');
  const save = async () => { setSaving(true); await new Promise(resolve => setTimeout(resolve, 250)); setSaving(false); setError('Error de prueba: los cambios no se guardaron.'); };
  const props = { company, english: false, saving, error, onClose: () => setOpen('') };
  return <main className="p-6"><div className="flex flex-wrap gap-4">{['type', 'distributor', 'trial'].map(type => <button key={type} onClick={() => { setError(''); setOpen(type); }}>{type}</button>)}</div>
    {open === 'type' && <AccountTypeEditModal {...props} onSave={save} />}
    {open === 'distributor' && <DistributorAssignmentModal {...props} distributors={[{ ...company, id: 903, name: 'Distribuidor de prueba', user_type: 'DISTRIBUTOR' }]} onSave={save} />}
    {open === 'trial' && <TrialExtensionModal {...props} onConfirm={save} />}
  </main>;
}
const view = new URL(location.href).searchParams.get('workspace');
createRoot(document.getElementById('root')!).render(<BrowserRouter><LanguageProvider><WorkbarLayoutProvider>
  {view === 'billing' ? <SubscriptionManagementPage /> : view === 'platform' ? <PlatformAdminPage /> : view === 'forms' ? <Forms /> : <MultiKioskCenterPage />}
</WorkbarLayoutProvider></LanguageProvider></BrowserRouter>);
