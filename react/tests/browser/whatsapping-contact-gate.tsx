import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {LanguageProvider} from '../../src/app/shared/context';
import {ContactPicker} from '../../src/app/BasicModules/Sales/Whatsapping/ContactPicker';
import {CampaignEditor} from '../../src/app/BasicModules/Sales/Whatsapping/CampaignEditor';
import {whatsappingApi,type Contact,type Detail} from '../../src/app/BasicModules/Sales/Whatsapping/whatsappingApi';
import {setCachedAuthSession} from '../../src/app/api/authSessionStore';
import '../../src/styles/index.css';
setCachedAuthSession({user:{id:9001,role:'user',name:'Vendedor sintético',module_slugs:['crm'],tab_permissions_configured:true,tab_permission_keys:['crm.contacts']},company:{id:9001,name:'Empresa sintética',active:true,role:'user',commercial_account_type:'SUPER_ADMIN'},companies:[],csrfToken:'synthetic'});
const contacts:Contact[]=[{id:1,name:'Con datos completos',companyName:'Empresa sintética',phone:'+14165550111',ownerName:'Vendedor',source:'test',eligibility:'READY'},{id:2,name:'Sin teléfono',companyName:'Empresa sintética',phone:'',ownerName:'Vendedor',source:'test',eligibility:'INVALID'},{id:3,name:'Teléfono excluido',companyName:'Empresa sintética',phone:'+14165550112',ownerName:'Vendedor',source:'test',eligibility:'BLOCKED'},{id:4,name:'Sin empresa',companyName:'',phone:'+14165550113',ownerName:'Vendedor',source:'test',eligibility:'READY'}];
whatsappingApi.contacts=async q=>({items:contacts.filter(c=>c.name.toLowerCase().includes((q.get('search')||'').toLowerCase())),total:4,page:1,pageSize:200});
whatsappingApi.templates=async()=>[];whatsappingApi.lists=async()=>[{id:'test-list',name:'Lista sintética mixta',contactIds:[1,2,3,4],version:1}];
const seed:Detail={campaign:{id:'00000000-0000-4000-8000-000000000001',name:'Prueba de validación',objective:'QUOTE',offer:'',defaultRegion:'MX',resourceUrl:'',steps:[{name:'Mensaje',delayDays:0,body:'Hola'}],version:1,status:'DRAFT',ownerUserId:9001,ownerName:'Vendedor sintético',updatedAt:new Date().toISOString(),total:1,done:0,pending:1,due:0,canEdit:true},recipients:[{contact:contacts[1],stepIndex:0,state:'PENDING',nextActionAt:null,notes:'',version:1,message:'Hola',eligibility:'INVALID'}],events:[]};
let saves=0;whatsappingApi.save=async()=>{saves++;document.getElementById('saved')!.textContent=String(saves);return seed};
// F8 simulates the browser return event in the embedded test viewer.
document.addEventListener("keydown",event=>{if(event.key==="F8")window.dispatchEvent(new Event("focus"))});
// Simulate a successful external save in memory; never write real contacts.
document.addEventListener('click',event=>{const target=(event.target as Element).closest('a');if(target?.href.includes('/sales/contacts')&&new URL(target.href).searchParams.get('q')==='Sin teléfono'){contacts[1].phone='+14165550114';contacts[1].eligibility='READY'}});
window.fetch=(()=>Promise.reject(new Error('No API allowed in synthetic fixture'))) as typeof fetch;
function App(){const[ids,setIds]=useState<number[]>([]);const[mode,setMode]=useState('picker');const detail=structuredClone(seed);if(mode==='link'){detail.campaign.steps[0].body='Hola {{link}}';detail.recipients[0].contact=contacts[0]}return <LanguageProvider><button onClick={()=>setMode('picker')}>Selector</button><button onClick={()=>setMode('bad')}>Editor con contacto incompleto</button><button onClick={()=>setMode('link')}>Editor con enlace pendiente</button><button onClick={()=>document.documentElement.classList.toggle('dark')}>Modo oscuro</button><p>Guardados: <span id="saved">{saves}</span></p><main className="bg-slate-50 p-3 dark:bg-slate-950 dark:text-white"><p>Seleccionados: {ids.join(', ')||'ninguno'}</p>{mode==='picker'?<ContactPicker selected={ids} onChange={setIds} region="MX" needsCompany/>:<CampaignEditor key={mode} initial={detail} onClose={()=>setMode('picker')} onSaved={()=>setMode('picker')}/>}</main></LanguageProvider>};createRoot(document.getElementById('root')!).render(<App/>);
