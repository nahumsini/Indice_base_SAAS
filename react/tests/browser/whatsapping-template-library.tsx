import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageProvider } from '../../src/app/shared/context';
import { setCachedAuthSession } from '../../src/app/api/authSessionStore';
import { LibraryModal } from '../../src/app/BasicModules/Sales/Whatsapping/LibraryModal';
import { whatsappingApi, type Template } from '../../src/app/BasicModules/Sales/Whatsapping/whatsappingApi';
import '../../src/styles/index.css';

setCachedAuthSession({ user: { id: 9001, role: 'user', name: 'Vendedor sintético', module_slugs: ['crm'], tab_permissions_configured: true, tab_permission_keys: ['crm.contacts'] }, company: { id: 9001, name: 'Empresa sintética', active: true, role: 'user', commercial_account_type: 'SUPER_ADMIN' }, companies: [], csrfToken: 'synthetic' });
const params = new URLSearchParams(location.search);
if (params.get('theme') === 'dark') document.documentElement.classList.add('dark');
let records: Template[] = params.has('empty') ? [] : Array.from({ length: 12 }, (_, index) => ({ id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, name: index === 0 ? 'Bienvenida personalizada' : `Seguimiento ${String(index).padStart(2, '0')}`, body: 'Hola {{name}}, de {{clientCompany}}. Soy {{seller}}, de {{company}}. ¿Revisamos tu propuesta?\n\nMaterial: {{link}}', status: index % 4 === 3 ? 'ARCHIVED' : 'ACTIVE', version: 1 }));
let reads = 0, writes = 0;
whatsappingApi.templates = async () => { if (params.has('failRead') && ++reads === 1) throw new Error('Synthetic load failure'); return records; };
whatsappingApi.lists = async () => { throw new Error('Templates must not load lists'); };
whatsappingApi.saveTemplate = async input => {
  document.getElementById('writes')!.textContent = String(++writes);
  if (params.has('failSave') && writes === 1) throw new Error('Synthetic save failure');
  records = [...records.filter(record => record.id !== input.id), { ...input, version: input.version + 1 }];
  return records;
};
const originalFetch = window.fetch.bind(window);
window.fetch = ((input, options) => String(input).includes('/api/') ? Promise.reject(new Error('No real API in synthetic template review')) : originalFetch(input, options)) as typeof fetch;
function Fixture() {
  const [open, setOpen] = useState(true);
  return <LanguageProvider><main className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 dark:text-white"><h1>Biblioteca de plantillas sintética</h1><p>Guardados: <output id="writes">0</output></p>{open ? <LibraryModal mode="templates" onClose={() => setOpen(false)} /> : <p>Biblioteca cerrada</p>}</main></LanguageProvider>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
