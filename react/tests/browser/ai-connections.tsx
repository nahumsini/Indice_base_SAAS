import { createRoot } from 'react-dom/client';
import { LanguageProvider } from '../../src/app/shared/context';
import { setCachedCsrfToken } from '../../src/app/api/authSessionStore';
import Integrations from '../../src/app/BasicModules/Dashboard/Integrations/Integrations';
import '../../src/styles/index.css';

localStorage.setItem('frontend-indice-language', new URL(location.href).searchParams.get('language') ?? 'en-US');
setCachedCsrfToken('synthetic-csrf');
createRoot(document.getElementById('root')!).render(
  <LanguageProvider><main className="p-4"><Integrations /></main></LanguageProvider>,
);
