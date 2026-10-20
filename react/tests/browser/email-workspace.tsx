import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageProvider, useLanguage } from '../../src/app/shared/context';
import { EmailAccountsWorkspace } from '../../src/app/ComplementaryModules/Email/EmailAccountsWorkspace';
import { LiveMailboxWorkspace } from '../../src/app/ComplementaryModules/Email/LiveMailboxWorkspace';
import { MailComposer } from '../../src/app/ComplementaryModules/Email/MailComposer';
import { languages } from '../../src/app/context/LanguageContext';
import '../../src/styles/index.css';
function Preview() {
  const params = new URLSearchParams(location.search);
  const [view,setView]=useState(params.get('view') ?? 'accounts');
  const [dark,setDark]=useState(false);
  const {setCurrentLanguage}=useLanguage();
  useEffect(()=>setCurrentLanguage(languages[0]),[setCurrentLanguage]);
  useEffect(()=>{document.documentElement.classList.toggle('dark',dark);},[dark]);
  if(params.get('layout')==='mobile'&&!params.has('embedded'))return <main style={{padding:20,background:'#e2e8f0',minHeight:'100vh'}}><iframe title="Correo móvil · 390 px" src={`?embedded=1&view=${view}`} style={{width:390,height:844,border:0,borderRadius:24,background:'white'}}/></main>;
  return <div className={dark?'dark':''}><main className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6 dark:bg-slate-950 dark:text-slate-100">
    <nav className="mb-6 flex flex-wrap gap-3 text-sm"><strong>Prueba aislada · datos ficticios</strong><button onClick={()=>setView('accounts')}>Cuentas demo</button><button onClick={()=>setView('mail')}>Buzón demo</button><button onClick={()=>setDark(!dark)}>Cambiar tema</button></nav>
    {view==='compose'?<MailComposer account={{id:'00000000-0000-4000-8000-000000000001',email:'equipo@example.com',displayName:'Equipo Horizonte',label:'Cuenta ficticia',version:1,receiveProtocol:'IMAP'}} initial={{version:0,accountVersion:1,to:[],cc:[],bcc:[],subject:'Prueba aislada de adjuntos',bodyText:'Texto ficticio conservado durante la carga.',replyToMessageId:null}} onClose={()=>setView('mail')} onDone={()=>setView('mail')}/>:view==='accounts'?<EmailAccountsWorkspace onMailbox={()=>setView('mail')}/>:<LiveMailboxWorkspace onAccounts={()=>setView('accounts')}/>}
  </main></div>;
}
createRoot(document.getElementById('root')!).render(<LanguageProvider><Preview/></LanguageProvider>);
