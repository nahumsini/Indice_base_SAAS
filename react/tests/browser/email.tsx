import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { LanguageProvider, FavoritesProvider } from '../../src/app/shared/context';
import { WorkbarLayoutProvider } from '../../src/app/components/workbar/WorkbarLayoutContext';
import CorreoEmpresarial from '../../src/app/ComplementaryModules/Email/CorreoEmpresarial';
import '../../src/styles/index.css';
createRoot(document.getElementById('root')!).render(<LanguageProvider><BrowserRouter><FavoritesProvider><WorkbarLayoutProvider><div className="h-screen"><CorreoEmpresarial preview /></div></WorkbarLayoutProvider></FavoritesProvider></BrowserRouter></LanguageProvider>);
