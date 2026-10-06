import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageProvider } from '../../src/app/shared/context';
import { MessagingWorkspace } from '../../src/app/Messaging/MessagingWorkspace';
import { MessagingModal } from '../../src/app/Messaging/MessagingModal';
import { setCachedCsrfToken } from '../../src/app/api/authSessionStore';
import type { MessagingPortal } from '../../src/app/Messaging/types';
import '../../src/styles/index.css';
setCachedCsrfToken('synthetic-csrf');
function Fixture() {
  const [portal, setPortal] = useState<MessagingPortal>('member');
  const [company, setCompany] = useState(1);
  const [open, setOpen] = useState(true);
  return <><nav><button onClick={() => { setPortal('member'); setOpen(true); }}>Client view</button><button onClick={() => setPortal('platform')}>Operator view</button>
    <button onClick={() => { setCompany(2); Object.assign(window, { fixtureCompany: 2 }); }}>Switch company</button></nav>
    {portal === 'member' ? open && <MessagingModal key={company} locale="es-MX" userId={company} initialId={null} onClose={() => setOpen(false)} />
      : <MessagingWorkspace key={`${portal}:${company}`} portal={portal} locale="es-MX" userId={9} />}</>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><LanguageProvider><Fixture /></LanguageProvider></StrictMode>);
