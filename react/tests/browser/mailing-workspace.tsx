import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router';
import {LanguageProvider} from '../../src/app/shared/context';
import Mailing from '../../src/app/BasicModules/Sales/Mailing/Mailing';
import {setCachedAuthSession,setCachedCsrfToken} from '../../src/app/api/authSessionStore';
import '../../src/styles/index.css';
setCachedAuthSession({user:{id:9001,role:'admin',name:'Synthetic user',module_slugs:['crm','correo'],tab_permissions_configured:true,tab_permission_keys:['crm.mailing','crm.contacts','crm.mailing_send','email.accounts']},company:{id:9001,name:'Synthetic company',active:true,role:'admin',commercial_account_type:'SUPER_ADMIN'},companies:[],csrfToken:'synthetic-csrf'});
setCachedCsrfToken('synthetic-csrf');
createRoot(document.getElementById('root')!).render(<LanguageProvider><MemoryRouter initialEntries={['/sales/mailing']}><main className="min-h-screen min-w-0 bg-slate-50 p-4 md:p-6 dark:bg-slate-950 dark:text-white"><Mailing/></main></MemoryRouter></LanguageProvider>);
