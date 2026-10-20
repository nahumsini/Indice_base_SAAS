import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { Header } from '../../src/app/components/Header';
import BusinessStructure from '../../src/app/BasicModules/Dashboard/BusinessStructure/BusinessStructure';
import { LanguageProvider, useLanguage, languages } from '../../src/app/shared/context';
import { WorkbarLayoutProvider } from '../../src/app/components/workbar/WorkbarLayoutContext';
import { BusinessCurrencyProvider } from '../../src/app/BasicModules/shared/BusinessCurrencyContext';
import { setCachedAuthSession, setCachedCsrfToken } from '../../src/app/api/authSessionStore';
import type { AuthSessionResponse } from '../../src/app/api/auth.types';
import '../../src/styles/index.css';
const session=(user=9001,company=9001,role='admin'):AuthSessionResponse=>({user:{id:user,name:'Synthetic User',role,module_slugs:['config_center'],tab_permissions_configured:true,tab_permission_keys:['config_center.profile','config_center.business-structure']},company:{id:company,name:'Synthetic company',role,active:true,commercial_account_type:'SUPER_ADMIN'},companies:[],csrfToken:'synthetic-csrf'});
const initialActor = JSON.parse(sessionStorage.getItem('synthetic-company-actor') ?? '[9001,9001]');
setCachedAuthSession(session(initialActor[0],initialActor[1]));setCachedCsrfToken('synthetic-csrf');
function Fixture(){
  const [dark,setDark]=useState(false); const {setCurrentLanguage}=useLanguage();
  Object.assign(window,{companyFixture:{switchUser(user:number,company=9001,role='admin'){sessionStorage.setItem('synthetic-company-actor',JSON.stringify([user,company]));setCachedAuthSession(session(user,company,role));setCachedCsrfToken('synthetic-csrf');},language(code:string){setCurrentLanguage(languages.find(language=>language.code===code)!);}}});
  return <div className="flex h-dvh min-w-0 flex-col overflow-hidden"><Header darkMode={dark} onToggleDarkMode={()=>{setDark(!dark);document.documentElement.classList.toggle('dark',!dark);}} learningModeActive={false} learningModeVisible={false} learningStep={0} onSaveLearningModeSettings={async()=>{}} learningPreferencesReady learningPreferenceError={null} onRetryLearningPreferences={()=>{}}/><main data-company-scroll className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8"><BusinessStructure/></main></div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><LanguageProvider><BusinessCurrencyProvider><WorkbarLayoutProvider><Fixture/></WorkbarLayoutProvider></BusinessCurrencyProvider></LanguageProvider></BrowserRouter></StrictMode>);
