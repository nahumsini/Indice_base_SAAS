import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router';
import { Header } from '../../src/app/components/Header';
import InviteAcceptPage from '../../src/app/Auth/InviteAcceptPage';
import Users from '../../src/app/BasicModules/Dashboard/Users/Users';
import { LanguageProvider, useLanguage, languages } from '../../src/app/shared/context';
import { WorkbarLayoutProvider } from '../../src/app/components/workbar/WorkbarLayoutContext';
import { BusinessCurrencyProvider } from '../../src/app/BasicModules/shared/BusinessCurrencyContext';
import { setCachedAuthSession, setCachedCsrfToken } from '../../src/app/api/authSessionStore';
import type { AuthSessionResponse } from '../../src/app/api/auth.types';
import '../../src/styles/index.css';
const session=(user=9001,company=9001,role='root'):AuthSessionResponse=>({user:{id:user,name:'Synthetic User',role,module_slugs:['config_center'],tab_permissions_configured:true,tab_permission_keys:['config_center.profile','config_center.business-structure','config_center.users']},company:{id:company,name:'Synthetic company',role,active:true,commercial_account_type:'SUPER_ADMIN'},companies:[],csrfToken:'synthetic-csrf'});
const initialActor = JSON.parse(sessionStorage.getItem('synthetic-users-actor') ?? '[9001,9001]');
setCachedAuthSession(session(initialActor[0],initialActor[1],initialActor[2]));setCachedCsrfToken('synthetic-csrf');
function Fixture(){
  const [dark,setDark]=useState(false); const {setCurrentLanguage}=useLanguage();
  Object.assign(window,{usersFixture:{switchUser(user:number,company=9001,role='root'){sessionStorage.setItem('synthetic-users-actor',JSON.stringify([user,company,role]));setCachedAuthSession(session(user,company,role));setCachedCsrfToken('synthetic-csrf');},language(code:string){setCurrentLanguage(languages.find(language=>language.code===code)!);}}});
  return <div className="flex h-dvh min-w-0 flex-col overflow-hidden"><Header darkMode={dark} onToggleDarkMode={()=>{setDark(!dark);document.documentElement.classList.toggle('dark',!dark);}} learningModeActive={false} learningModeVisible={false} learningStep={0} onSaveLearningModeSettings={async()=>{}} learningPreferencesReady learningPreferenceError={null} onRetryLearningPreferences={()=>{}}/><main data-users-scroll className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8"><Users/></main></div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><LanguageProvider><BusinessCurrencyProvider><WorkbarLayoutProvider><Routes><Route path="/invitations/:token" element={<InviteAcceptPage/>}/><Route path="*" element={<Fixture/>}/></Routes></WorkbarLayoutProvider></BusinessCurrencyProvider></LanguageProvider></BrowserRouter></StrictMode>);
