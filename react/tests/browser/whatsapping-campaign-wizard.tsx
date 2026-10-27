import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageProvider } from '../../src/app/shared/context';
import { setCachedAuthSession } from '../../src/app/api/authSessionStore';
import { CampaignEditor } from '../../src/app/BasicModules/Sales/Whatsapping/CampaignEditor';
import { whatsappingApi, type CampaignInput, type Contact, type Detail } from '../../src/app/BasicModules/Sales/Whatsapping/whatsappingApi';
import '../../src/styles/index.css';

setCachedAuthSession({ user: { id: 9001, role: 'user', name: 'Vendedor sintético', module_slugs: ['crm'], tab_permissions_configured: true, tab_permission_keys: ['crm.contacts'] }, company: { id: 9001, name: 'Empresa sintética', active: true, role: 'user', commercial_account_type: 'SUPER_ADMIN' }, companies: [], csrfToken: 'synthetic' });
const contacts: Contact[] = [1, 2].map(id => ({ id, name: `Contacto sintético ${id}`, companyName: 'Empresa sintética', phone: `+1416555010${id}`, eligibility: 'READY', ownerName: 'Vendedor sintético', source: 'test' }));
const scenario = new URLSearchParams(location.search).get('scenario');
if (new URLSearchParams(location.search).get('theme') === 'dark') document.documentElement.classList.add('dark');
const legacy: Detail = { campaign: { id: '00000000-0000-4000-8000-000000000001', name: 'Campaña anterior', objective: 'WELCOME', offer: scenario === 'legacy-empty' ? '' : 'Consulta de ejemplo', defaultRegion: 'MX', resourceUrl: '', steps: [{ name: 'Mensaje', delayDays: 0, body: 'Hola {{name}}, {{offer}}' }], version: 1, status: 'DRAFT', ownerUserId: 9001, ownerName: 'Vendedor sintético', updatedAt: '2026-10-26T12:00:00Z', total: 1, done: 0, pending: 1, due: 0, canEdit: true }, recipients: [{ contact: contacts[0], stepIndex: 0, state: 'PENDING', nextActionAt: null, notes: '', version: 1, message: '', eligibility: 'READY' }], events: [] };
whatsappingApi.contacts = async query => ({ items: contacts.filter(contact => contact.name.toLowerCase().includes((query.get('search') || '').toLowerCase())), total: contacts.length, page: 1, pageSize: 200 });
whatsappingApi.templates = async () => [];
whatsappingApi.lists = async () => [];
let attempts = 0;
whatsappingApi.save = async (id, input: CampaignInput) => {
  document.getElementById('attempts')!.textContent = String(++attempts);
  if (attempts === 1 && scenario !== 'legacy') throw new Error('Synthetic save failure');
  document.getElementById('payload')!.textContent = JSON.stringify(input);
  return { ...legacy, campaign: { ...legacy.campaign, ...input, id } };
};
const originalFetch = window.fetch.bind(window);
window.fetch = ((input, options) => String(input).includes('/api/') ? Promise.reject(new Error('No real API in this synthetic fixture')) : originalFetch(input, options)) as typeof fetch;
function Fixture() {
  const [open, setOpen] = useState(true);
  return <LanguageProvider><main className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 dark:text-white">
    <h1>Revisión sintética del wizard de Whatsapping</h1><p>Intentos: <output id="attempts">0</output></p><output id="payload" />
    <button onClick={() => document.documentElement.classList.toggle('dark')}>Modo oscuro</button>
    {open ? <CampaignEditor initial={scenario?.startsWith('legacy') ? legacy : null} onClose={() => setOpen(false)} onSaved={() => setOpen(false)} /> : <p>Editor cerrado</p>}
  </main></LanguageProvider>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
