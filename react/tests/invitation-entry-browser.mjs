import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {resolve,join} from 'node:path';
import {mkdirSync} from 'node:fs';
const {chromium}=await import(process.env.INDICE_PLAYWRIGHT_MODULE||'playwright');
const server=await createServer({root:resolve(import.meta.dirname,'..'),cacheDir:'/private/tmp/indice-invitation-entry-vite',server:{host:'127.0.0.1',port:5203,strictPort:true,hmr:false,watch:null},define:{'import.meta.env.VITE_API_BASE_URL':'""'}});
const origin='http://127.0.0.1:5203';
const modules=[['config_center','Panel Inicial','home-panel'],['human_resources','Recursos Humanos','human-resources'],['crm','Ventas','sales']].map(([slug,name,route_key])=>({slug,name,name_es:name,route_key,module_category:'basic',lifecycle_status:'released',access_model:'tabs',assignable:true,entitled:true,assignment_enabled:true,is_active:true}));
const tabs=[['config_center','profile','Mi perfil'],['config_center','users','Usuarios'],['human_resources','attendance','Asistencia']].map(([module_slug,tab_key,name],tab_order)=>({module_slug,tab_key,permission_key:`${module_slug}.${tab_key}`,name,name_es:name,name_en:name,compatible_roles:tab_key==='users'?['admin','superadmin']:['user','admin','superadmin'],default_granted:tab_key!=='users',tab_order}));
const session=(admin)=>({user:{id:admin?9101:9102,name:admin?'Synthetic Admin':'Synthetic Invitee',role:admin?'root':'user',module_slugs:admin?modules.map(m=>m.slug):['config_center','human_resources'],tab_permission_keys:admin?tabs.map(t=>t.permission_key):['config_center.profile','human_resources.attendance'],tab_permissions_configured:true},company:{id:9101,name:'Synthetic Invited Company',user_company_id:admin?9101:9102,role:admin?'root':'user',commercial_account_type:'SUPER_ADMIN',scope:{type:'corporate_office',unit_id:null,business_id:null},active:true},companies:[],csrfToken:'synthetic-csrf'});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
await server.listen();
const browser=await chromium.launch({headless:true,...(process.env.INDICE_CHROME_PATH?{executablePath:process.env.INDICE_CHROME_PATH}:{})});
try {
 for(const viewport of [{width:390,height:844},{width:1440,height:1000}]){
  const context=await browser.newContext({viewport,isMobile:viewport.width<500,hasTouch:viewport.width<500});
  await context.addInitScript(()=>localStorage.setItem('frontend-indice-language','es-MX'));
  let current='admin',inviteStatus='pending',created=false,acceptCount=0,logoutCount=0,failLoad=true,failLogout=true;
  const errors=[];
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url()),path=url.pathname;
   if(url.origin!==origin)return route.abort();if(!path.startsWith('/api/'))return route.continue();
   const reply=(json,status=200)=>route.fulfill({status,json});
   if(path==='/api/v1/auth/csrf')return reply({csrfToken:'synthetic-csrf'});
   if(path==='/api/v1/auth/me')return current?reply(session(current==='admin')):reply({message:'Unauthorized'},401);
   if(path==='/api/v1/auth/logout'){
    logoutCount++;if(failLogout){failLogout=false;return reply({message:'Synthetic provider detail'},503);}current=null;return reply({success:true});
   }
   if(path==='/api/v1/auth/login'){
    assert.deepEqual(req.postDataJSON(),{companyName:'Synthetic Invited Company',email:'synthetic-invited@example.invalid',password:' exact synthetic password '});current='invitee';return reply(session(false));
   }
   if(path==='/api/v1/modules')return reply(current==='admin'?modules:modules.filter(m=>m.slug!=='crm'));
   if(path==='/api/v1/config-center/current-user')return reply({id:current==='admin'?9101:9102,nombres:'Synthetic',apellidos:current==='admin'?'Admin':'Invitee',email:current==='admin'?'synthetic-admin@example.invalid':'synthetic-invited@example.invalid',role:current==='admin'?'root':'user',preferred_language:'es-MX',phone_numbers:[]});
   if(path==='/api/v1/config-center/users'&&req.method()==='GET')return reply({company_id:9101,users:[{id:9101,source:'user',nombres:'Synthetic Admin',email:'synthetic-admin@example.invalid',role:'root',status:'active',is_protected:true,module_slugs:modules.map(m=>m.slug),tab_permission_keys:tabs.map(t=>t.permission_key),kiosk_definition_ids:[],scope_type:'corporate_office',capabilities:{can_edit_access:true}}],catalog:{units:[],businesses:[],modules,tabs,employee_kiosks:[]},capabilities:{can_manage_users:true,can_invite:true,can_assign_super_admin:true}});
   if(path==='/api/v1/config-center/users/invite'){
    const body=req.postDataJSON();assert.equal(body.email,'synthetic-invited@example.invalid');created=true;
    return reply({email:body.email,invite_link:origin+'/invite/synthetic-full-entry',email_sent:false,email_status:'disabled'},201);
   }
   if(path==='/api/v1/invitations/synthetic-full-entry'){
    if(failLoad){return reply({message:'SQL synthetic private detail'},503);}
    assert(created);return reply({email:'synthetic-invited@example.invalid',full_name:'Synthetic Invitee',role:'user',company_id:9101,company_name:'Synthetic Invited Company',status:inviteStatus,existing_user:false});
   }
   if(path==='/api/v1/invitations/synthetic-full-entry/accept'){
    acceptCount++;assert.deepEqual(req.postDataJSON(),{password:' exact synthetic password ',confirm_password:' exact synthetic password '});inviteStatus='accepted';await pause(250);return reply({accepted:true,user_id:9102,user_company_id:9102});
   }
   if(path.includes('/workspace-state/'))return reply({state:{},schemaVersion:1});
   if(path.includes('/billing/')&&path.endsWith('/subscription'))return reply({seat_limit_enforced:false,remaining_seats:99,active_seats:1,pending_invitations:created?1:0});
   if(path.includes('payment-request'))return reply({active:false,requests:[]});
   if(path.includes('managed-compan'))return reply({active:false,authority_mode:'NONE',companies:[]});
   if(path==='/api/v1/messaging/unread')return reply(0);
   if(path.includes('notifications'))return reply({items:[],summary:{total_count:0,unread_count:0}});
   if(path==='/api/v1/exchange-rates/daily')return reply({ratesPerUsd:{USD:1,MXN:18.5,CAD:1.36,COP:4000,BRL:5.5},metadata:{sourceDate:'2026-10-19'},sources:[]});
   // Unrelated optional dashboard domains fail closed, never fabricate permissions/data.
   return reply({message:'Synthetic optional endpoint unavailable'},403);
  });
  const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/home-panel/users');
  await page.getByRole('button',{name:'Invitar usuario',exact:true}).click({noWaitAfter:true});const dialog=page.getByRole('dialog');
  await dialog.getByRole('textbox',{name:'Nombre',exact:true}).fill('Synthetic Invitee');await dialog.getByRole('textbox',{name:'Correo electrónico',exact:true}).fill('synthetic-invited@example.invalid');
  await dialog.getByRole('button',{name:'Continuar',exact:true}).click({noWaitAfter:true});await dialog.getByRole('combobox',{name:'Alcance organizacional',exact:true}).selectOption('corporate_office');await dialog.getByRole('button',{name:'Continuar',exact:true}).click({noWaitAfter:true});await dialog.getByRole('button',{name:/^Básico /}).click({noWaitAfter:true});
  await dialog.getByRole('button',{name:'Enviar invitación',exact:true}).click({noWaitAfter:true});const link=await dialog.getByRole('textbox',{name:/Enlace de invitación/}).inputValue();assert(created);
  await page.goto(link);await page.getByRole('button',{name:'Volver a cargar',exact:true}).waitFor();failLoad=false;await page.getByRole('button',{name:'Volver a cargar',exact:true}).click({noWaitAfter:true});
  await page.getByLabel('Crea tu contraseña',{exact:true}).fill('short');await page.getByLabel('Confirma tu contraseña',{exact:true}).click({noWaitAfter:true});await page.getByText('La contraseña debe tener al menos 8 caracteres.',{exact:true}).waitFor();
  await page.getByLabel('Crea tu contraseña',{exact:true}).fill(' exact synthetic password ');await page.getByLabel('Confirma tu contraseña',{exact:true}).fill('different');await page.getByLabel('Crea tu contraseña',{exact:true}).click({noWaitAfter:true});await page.getByText('La contraseña y su confirmación deben coincidir.',{exact:true}).waitFor();
  await page.getByLabel('Confirma tu contraseña',{exact:true}).fill(' exact synthetic password ');
  if(process.env.INDICE_INVITATION_OUTPUT_DIR){await page.getByRole('button',{name:'Aceptar invitación',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:join(process.env.INDICE_INVITATION_OUTPUT_DIR,`invitation-form-${viewport.width}.png`)});}
  const accept=page.getByRole('button',{name:'Aceptar invitación',exact:true});await accept.evaluate(el=>{el.click({noWaitAfter:true});el.click({noWaitAfter:true});});await page.getByRole('heading',{name:'Tu cuenta está lista',exact:true}).waitFor();assert.equal(acceptCount,1);
  await page.getByRole('button',{name:'Ir a iniciar sesión',exact:true}).click({noWaitAfter:true});await page.getByRole('alert').filter({hasText:'No pudimos preparar'}).waitFor();assert.equal(new URL(page.url()).pathname,'/invite/synthetic-full-entry');
  await page.getByRole('button',{name:'Ir a iniciar sesión',exact:true}).click({noWaitAfter:true});await page.waitForURL('**/login');assert.equal(logoutCount,2);
  const inputs=page.locator('input');assert.equal(await inputs.nth(0).inputValue(),'Synthetic Invited Company');assert.equal(await page.locator('input[type=email]').inputValue(),'synthetic-invited@example.invalid');assert.equal(await page.locator('input[type=password]').inputValue(),'');
  await page.locator('input[type=password]').fill(' exact synthetic password ');await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click({noWaitAfter:true});await page.waitForURL('**/dashboard');
  await pause(1500);
  if(process.env.INDICE_INVITATION_OUTPUT_DIR){mkdirSync(process.env.INDICE_INVITATION_OUTPUT_DIR,{recursive:true});await page.screenshot({path:join(process.env.INDICE_INVITATION_OUTPUT_DIR,`invitation-dashboard-${viewport.width}.png`)});}
  await page.getByRole('heading',{name:/Módulos básicos|Herramientas de tu recorrido|Herramientas de esta etapa/}).waitFor();
  assert.equal(current,'invitee');assert.equal(await page.getByText('Ventas',{exact:true}).count(),0);
  const fit=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);assert(fit);
  await page.goto(origin+'/home-panel/users');await page.waitForURL('**/home-panel/profile');
  await page.getByRole('heading',{name:'Tu perfil',exact:true}).waitFor();
  await page.getByText('Cargando módulo',{exact:true}).waitFor({state:'hidden'});
  assert.equal(await page.locator('[data-profile-editor]').isVisible(),true);
  assert.equal(await page.getByRole('button',{name:'Invitar usuario',exact:true}).count(),0);
  assert.deepEqual(errors,[]);
  if(process.env.INDICE_INVITATION_OUTPUT_DIR){mkdirSync(process.env.INDICE_INVITATION_OUTPUT_DIR,{recursive:true});await page.screenshot({path:join(process.env.INDICE_INVITATION_OUTPUT_DIR,`invitation-entry-${viewport.width}.png`)});}
  console.log(`Invitation to permitted session ${viewport.width}px: creation, load retry, password feedback, one acceptance, failed/successful logout handoff, private login prefill, dashboard module filtering and denied-tab fallback pass.`);
  await context.close();
 }
}finally{await browser.close();await server.close();}
