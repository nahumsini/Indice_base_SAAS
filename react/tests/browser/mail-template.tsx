import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LanguageProvider} from '../../src/app/shared/context';
import {setCachedAuthSession,setCachedCsrfToken} from '../../src/app/api/authSessionStore';
import {TemplateManager} from '../../src/app/BasicModules/Sales/Mailing/components/TemplateManager';
import {CampaignEditor} from '../../src/app/BasicModules/Sales/Mailing/components/CampaignEditor';
import {useMailingCopy} from '../../src/app/BasicModules/Sales/Mailing/translations';
import {MailComposer} from '../../src/app/ComplementaryModules/Email/MailComposer';
import '../../src/styles/index.css';
setCachedAuthSession({user:{id:9001,role:'admin',name:'Synthetic user',module_slugs:['crm','correo'],tab_permissions_configured:true,tab_permission_keys:['crm.mailing','crm.contacts','correo.mail','correo.accounts']},company:{id:9001,name:'Synthetic company',active:true,role:'admin',commercial_account_type:'SUPER_ADMIN'},companies:[],csrfToken:'synthetic-csrf'});
setCachedCsrfToken('synthetic-csrf');
function Fixture(){const {copy,locale}=useMailingCopy(),[done,setDone]=useState(false);const mode=new URLSearchParams(location.search).get('mode');
 return <main><output>{done?'done':''}</output>{!done&&(mode==='email'?<MailComposer account={{id:'private-account',label:'Synthetic',email:'sender@example.com',displayName:'Synthetic',receiveProtocol:'IMAP',version:1}} initial={{version:0,accountVersion:1,to:[],cc:[],bcc:[],subject:'',bodyText:'',replyToMessageId:null}} onClose={()=>setDone(true)} onDone={()=>setDone(true)}/>:mode==='campaign'?<CampaignEditor campaign={null} canEdit copy={copy} onClose={()=>setDone(true)} onSaved={()=>setDone(true)}/>:<TemplateManager tone={new URLSearchParams(location.search).get('tone')==='blue'?'blue':'coral'} copy={copy} locale={locale} onClose={()=>setDone(true)}/>)}</main>;
}
createRoot(document.getElementById('root')!).render(<LanguageProvider><Fixture/></LanguageProvider>);
