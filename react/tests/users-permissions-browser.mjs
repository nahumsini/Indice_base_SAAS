import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {resolve,join} from 'node:path';
import {mkdirSync} from 'node:fs';
const runtime=await import(process.env.INDICE_PLAYWRIGHT_MODULE||'playwright');
const origin='http://127.0.0.1:5202';
const server=await createServer({root:resolve(import.meta.dirname,'..'),cacheDir:'/private/tmp/indice-users-permissions-vite',plugins:[{name:'users-fixture-public-invitation',configureServer(server){server.middlewares.use((request,response,next)=>{if(request.url?.startsWith('/invitations/'))request.url='/tests/browser/users-permissions.html';next();});}}],server:{host:'127.0.0.1',port:5202,strictPort:true,hmr:false,watch:null},define:{'import.meta.env.VITE_API_BASE_URL':'""'}});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const session=(id,company,role)=>({user:{id,name:'Synthetic Root',role,module_slugs:['config_center','human_resources'],tab_permissions_configured:true,tab_permission_keys:['config_center.profile','config_center.users','config_center.business-structure']},company:{id:company,name:'Synthetic company',role,active:true,commercial_account_type:'SUPER_ADMIN'},companies:[],csrfToken:'synthetic-csrf'});
const modules=[{slug:'config_center',name:'Panel Inicial',route_key:'home-panel'},{slug:'human_resources',name:'Recursos Humanos',route_key:'human-resources'},{slug:'processes',name:'Procesos y tareas',route_key:'processes'}].map(m=>({...m,module_category:'basic',lifecycle_status:'released',access_model:'tabs',assignable:true,entitled:true,assignment_enabled:true}));
const tabs=[['config_center','profile','Mi perfil',['user','admin','superadmin']],['config_center','users','Usuarios',['admin','superadmin']],['config_center','business-structure','Estructura empresarial',['admin','superadmin']],['human_resources','employees','Colaboradores',['admin','superadmin']],['processes','tasks','Tareas',['user','admin','superadmin']]].map(([slug,tab,name,roles],i)=>({module_slug:slug,tab_key:tab,permission_key:`${slug}.${tab}`,name,name_es:name,name_en:name,compatible_roles:roles,default_granted:tab==='profile',tab_order:i}));
const catalog={units:[{id:10,name:'Synthetic North'},{id:11,name:'Synthetic South'}],businesses:[{id:20,unit_id:10,name:'Synthetic Store'},{id:21,unit_id:11,name:'Synthetic South Store'}],modules,tabs,employee_kiosks:[{id:501,name:'Synthetic Employee Kiosk',owner_module:'human_resources',module_slug:'human_resources',kiosk_type:'employee',unit_id:10,business_id:20,access_level:'employee'},{id:502,name:'Synthetic Other Kiosk',owner_module:'human_resources',module_slug:'human_resources',kiosk_type:'employee',unit_id:11,business_id:21,access_level:'employee'}]};
const user=(id,name,role='user',status='active')=>({id,user_company_id:id,email:`synthetic-${id}@example.invalid`,nombres:name,apellidos:'',role,status,source:'user',is_protected:role==='root',module_slugs:['config_center','human_resources'],tab_permission_keys:['config_center.profile'],kiosk_definition_ids:[501],unit_id:10,unit_name:'Synthetic North',business_id:20,business_name:'Synthetic Store',scope_type:'business_office'});
const seed=()=>[{...user(9001,'Synthetic Root','root'),unit_id:null,business_id:null,scope_type:'corporate_office',tab_permission_keys:['config_center.profile','config_center.users'],kiosk_definition_ids:[]},{...user(9010,'Synthetic Operator'),module_slugs:['config_center','human_resources','legacy_extra']},user(9011,'Synthetic Admin','admin'),user(9012,'Synthetic Inactive','user','inactive'),{...user(42,'Synthetic Pending','user','pending'),source:'invitation',invitation_id:42}];
async function flow(engine){
 const browser=await runtime[engine].launch({headless:true,...(engine==='chromium'&&process.env.INDICE_CHROME_PATH?{executablePath:process.env.INDICE_CHROME_PATH}:{})});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(()=>localStorage.setItem('frontend-indice-language','es-MX'));
 let id=9001,company=9001,role='root',failLoad=false,failRefresh=false,loadDelay=0,saveDelay=0,failMutation=false,loseAck=false,seatFull=false,sequence=100,providerSent=false,acceptCount=0;
 const saved=new Map([[9001,seed()],[9002,seed().map(u=>({...u,nombres:u.nombres.replace('Synthetic','Other')}))]]),writes=[],errors=[],unexpected=[];
 const rows=()=>saved.get(company);
 const isManager=()=>['root','superadmin','admin'].includes(role);
 const capabilities=u=>({can_edit_access:u.source==='user'&&isManager()&&(u.id!==id||role==='root'),can_activate:u.source==='user'&&isManager()&&u.id!==id&&u.status==='inactive',can_deactivate:u.source==='user'&&isManager()&&u.id!==id&&u.status==='active',can_resend_invitation:u.source==='invitation'&&isManager(),can_cancel_invitation:u.source==='invitation'&&isManager()});
 const snapshot=()=>({company_id:company,users:rows().map(u=>({...u,capabilities:capabilities(u)})),capabilities:{can_manage_users:isManager(),can_invite:isManager(),can_assign_super_admin:role==='root'},catalog});
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;
  if(url.origin!==origin)return route.abort();if(!path.startsWith('/api/'))return route.continue();const reply=json=>route.fulfill({json});
  if(path==='/api/v1/config-center/users'&&request.method()==='GET'){
    assert.equal(request.headers()['x-users-actor'],`${company}:${id}`);const response=structuredClone(snapshot());await delay(loadDelay);
    if(failLoad||failRefresh){failRefresh=false;return route.fulfill({status:503,json:{message:'SQL synthetic private detail'}});}return reply(response);
  }
  if(path.startsWith('/api/v1/config-center/users/')||path==='/api/v1/config-center/users/invite'){
    assert.equal(request.headers()['x-users-actor'],`${company}:${id}`);assert.equal(request.headers()['x-csrf-token'],'synthetic-csrf');const ownCompany=company,body=request.postData()?request.postDataJSON():{},method=request.method();writes.push({path,method,body,company:ownCompany});await delay(saveDelay);
    if(failMutation){failMutation=false;return route.fulfill({status:503,json:{message:'SQL synthetic private detail'}});}
    if(seatFull)return route.fulfill({status:409,json:{code:'SEAT_CAPACITY_EXCEEDED',message:'Synthetic capacity detail',seats:{active:3,reserved:2,limit:5}}});
    let result={success:true};const list=saved.get(ownCompany);
    if(path.endsWith('/invite')){
      const row={...user(++sequence,body.name,'user','pending'),invitation_id:sequence,source:'invitation',...body,nombres:body.name,scope_type:body.business_id?'business_office':body.unit_id?'unit_headquarters':'corporate_office'};
      list.push(row);result={email:body.email,invite_link:`${origin}/invitations/synthetic-${sequence}`,email_sent:providerSent,email_status:providerSent?'sent':'disabled',email_message:'SQL synthetic provider detail'};
    }else if(path.includes('/invitations/')){
      const target=Number(path.match(/invitations\/(\d+)/)[1]),row=list.find(u=>u.source==='invitation'&&u.id===target);
      assert(row);
      if(method==='DELETE')list.splice(list.indexOf(row),1);
      else{row.email=body.email||row.email;result={email:row.email,invite_link:`${origin}/invitations/synthetic-renewed-${++sequence}`,email_sent:false,email_status:'disabled',email_message:'SQL synthetic provider detail'};}
    }else{
      const target=Number(path.match(/users\/(\d+)/)[1]),row=list.find(u=>u.source==='user'&&u.id===target);assert(row);
      if(path.endsWith('/activate')){row.status='active';result={success:true,active:true};}
      else if(method==='DELETE'){row.status='inactive';result={success:true,deleted:true,inactive:true};}
      else{Object.assign(row,body);row.scope_type=body.business_id?'business_office':body.unit_id?'unit_headquarters':'corporate_office';if(target===id)role=body.role;}
    }
    if(loseAck){loseAck=false;return route.fulfill({status:503,json:{message:'Synthetic lost acknowledgement'}});}return reply(result);
  }
  if(path==='/api/v1/invitations/synthetic-existing')return reply({email:'synthetic-existing@example.invalid',full_name:'Synthetic Existing',role:'user',company_id:company,company_name:'Synthetic Company',status:'pending',existing_user:true});
  if(path==='/api/v1/invitations/synthetic-existing/accept'){
    acceptCount++;assert.equal(request.method(),'POST');assert.deepEqual(request.postDataJSON(),{password:' x ',confirm_password:' x '});await delay(300);return reply({accepted:true,user_id:9020,user_company_id:9020});
  }
  if(path==='/api/v1/invitations/synthetic-cancelled')return reply({email:'synthetic-cancelled@example.invalid',full_name:'Synthetic Invitee',role:'user',company_id:company,company_name:'Synthetic Company',status:'cancelled'});
  if(path==='/api/v1/config-center/current-user')return reply({id,nombres:'Synthetic',apellidos:'Root',email:'synthetic@example.invalid',role,preferred_language:'es-MX'});
  if(path==='/api/v1/auth/me')return reply(session(id,company,role));
  if(path.includes('/billing/')&&path.endsWith('/subscription'))return reply({seat_limit_enforced:false,remaining_seats:99,active_seats:3,pending_invitations:1});
  if(path.startsWith('/api/v1/workspace-state/'))return reply({state:request.method()==='PUT'?request.postDataJSON().state:{},schemaVersion:1});
  if(path.includes('managed-compan'))return reply({active:false,authority_mode:'NONE',companies:[]});
  if(path==='/api/v1/exchange-rates/daily')return reply({ratesPerUsd:{USD:1,MXN:18.5,CAD:1.36,COP:4000,BRL:5.5},metadata:{sourceDate:'2026-10-19',updatedAt:new Date().toISOString()},sources:[]});
  if(path==='/api/v1/messaging/unread')return reply(0);
  if(path.includes('notifications'))return reply({items:[],summary:{total_count:0,unread_count:0}});
  unexpected.push(`${request.method()} ${path}`);return route.fulfill({status:503,json:{}});
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 const row=name=>page.locator('article:visible,tbody tr:visible').filter({hasText:name}).first();
 const ready=()=>page.getByRole('button',{name:'Invitar usuario',exact:true}).waitFor();
 const dialog=()=>page.getByRole('dialog');
 const edit=async name=>{await row(name).getByRole('button',{name:'Administrar',exact:true}).click();await dialog().waitFor();};
 const save=()=>dialog().getByRole('button',{name:'Guardar',exact:true});
 const cancel=()=>dialog().getByRole('button',{name:'Cancelar',exact:true}).last().click();
 const action=async(name,label)=>{await row(name).getByRole('button',{name:'Más acciones',exact:true}).click();await page.getByRole('menuitem',{name:label,exact:true}).click();};
 const invite=async(email,name='Synthetic New User')=>{
  await page.getByRole('button',{name:'Invitar usuario',exact:true}).click();await dialog().waitFor();await dialog().getByRole('textbox',{name:'Nombre',exact:true}).fill(name);await dialog().getByRole('textbox',{name:'Correo electrónico',exact:true}).fill(email);
  await dialog().getByRole('button',{name:'Continuar',exact:true}).click();await dialog().getByRole('combobox',{name:'Alcance organizacional',exact:true}).selectOption('corporate_office');await dialog().getByRole('button',{name:'Continuar',exact:true}).click();await dialog().getByRole('button',{name:/^Básico /}).click();
 };
 const fit=async()=>{const size=await page.evaluate(()=>({width:innerWidth,body:document.documentElement.scrollWidth,main:document.querySelector('[data-users-scroll]').scrollWidth}));assert(size.body<=size.width&&size.main<=size.width,JSON.stringify(size));};
 const switchActor=async(next,nextCompany=9001,nextRole='root')=>{id=next;company=nextCompany;role=nextRole;await page.evaluate(({id,company,role})=>window.usersFixture.switchUser(id,company,role),{id,company,role});};
 await page.goto(`${origin}/tests/browser/users-permissions.html`);await ready();assert.equal(writes.length,0);
 await edit('Synthetic Operator');await dialog().getByRole('combobox',{name:'Alcance organizacional',exact:true}).selectOption('unit_headquarters');saveDelay=400;await save().evaluate(el=>{el.click();el.click();});await delay(60);assert.equal(await dialog().getByRole('button',{name:'Cancelar',exact:true}).last().isDisabled(),true);await dialog().waitFor({state:'hidden'});assert.equal(writes.length,1);assert.equal(writes[0].body.unit_id,10);assert.equal(writes[0].body.business_id,null);assert(writes[0].body.module_slugs.includes('legacy_extra'));saveDelay=0;
 await edit('Synthetic Operator');await dialog().getByRole('combobox',{name:'Alcance organizacional',exact:true}).selectOption('corporate_office');await dialog().getByRole('button',{name:/Synthetic Other Kiosk/}).click();await save().click();await dialog().waitFor({state:'hidden'});assert.equal(writes.at(-1).body.unit_id,null);assert.equal(writes.at(-1).body.business_id,null);assert(writes.at(-1).body.kiosk_definition_ids.includes(502));
 await edit('Synthetic Root');await save().click();await dialog().waitFor({state:'hidden'});assert.equal(writes.at(-1).body.role,'root');
 await edit('Synthetic Operator');failMutation=true;await save().click();await dialog().getByRole('alert').waitFor();assert.equal(await page.getByText('SQL synthetic private detail').count(),0);await save().click();await dialog().waitFor({state:'hidden'});
 await edit('Synthetic Operator');failRefresh=true;await save().click();await dialog().waitFor({state:'hidden'});await page.getByRole('status').filter({hasText:'El cambio se guardó'}).waitFor();await page.getByRole('button',{name:'Actualizar lista',exact:true}).click();await page.getByRole('status').filter({hasText:'El cambio se guardó'}).waitFor({state:'hidden'});
 console.log(`${engine}: explicit scope clearing, exact kiosk grants, hidden-access retention, unchanged Root, duplicate guard and save/reload failures pass`);
 // Invitation wizard validates before sending and retains confirmed links even if refreshing fails.
 await page.getByRole('button',{name:'Invitar usuario',exact:true}).click();await dialog().getByRole('button',{name:'Continuar',exact:true}).click();await dialog().getByRole('alert').waitFor();await cancel();const beforeInvite=writes.length;
 await invite('synthetic-new@example.invalid');failRefresh=true;saveDelay=350;await dialog().getByRole('button',{name:'Enviar invitación',exact:true}).evaluate(el=>{el.click();el.click();});await dialog().getByRole('textbox',{name:/Enlace de invitación/}).waitFor();assert.equal(writes.length,beforeInvite+1);assert.equal(await dialog().getByText('SQL synthetic provider detail').count(),0);assert((await dialog().getByRole('textbox',{name:/Enlace de invitación/}).inputValue()).includes('synthetic-'));saveDelay=0;await dialog().getByRole('button',{name:'Cerrar',exact:true}).first().click();await page.getByRole('button',{name:'Actualizar lista',exact:true}).click();await row('Synthetic New User').waitFor();
 await invite('synthetic-lost@example.invalid','Synthetic Uncertain');loseAck=true;await dialog().getByRole('button',{name:'Enviar invitación',exact:true}).click();await dialog().getByRole('status').filter({hasText:'No pudimos confirmar'}).waitFor();assert.equal(await dialog().getByRole('button',{name:'Enviar invitación',exact:true}).isDisabled(),true);await dialog().getByRole('button',{name:'Actualizar lista',exact:true}).click();await dialog().getByRole('button',{name:'Reenviar invitación',exact:true}).waitFor();assert.equal(rows().filter(u=>u.email==='synthetic-lost@example.invalid').length,1);await cancel();
 await action('Synthetic Pending','Reenviar invitación');await dialog().getByRole('textbox',{name:'Nuevo correo (opcional)',exact:true}).fill('bad');const beforeInvalidEmail=writes.length;await dialog().getByRole('button',{name:'Reenviar invitación',exact:true}).click();await dialog().getByRole('alert').waitFor();assert.equal(writes.length,beforeInvalidEmail);await dialog().getByRole('textbox',{name:'Nuevo correo (opcional)',exact:true}).fill('synthetic-renewed@example.invalid');await dialog().getByRole('button',{name:'Reenviar invitación',exact:true}).click();await dialog().getByRole('textbox',{name:/Enlace de invitación/}).waitFor();await dialog().getByRole('button',{name:'Cerrar',exact:true}).first().click();
 console.log(`${engine}: invitation validation, confirmed link versus failed delivery/refresh, uncertain acknowledgement recovery and resend pass`);
 await action('Synthetic Pending','Eliminar');failMutation=true;await dialog().getByRole('button',{name:'Eliminar',exact:true}).click();await dialog().getByRole('alert').waitFor();assert(rows().some(u=>u.id===42));await dialog().getByRole('button',{name:'Eliminar',exact:true}).click();await dialog().waitFor({state:'hidden'});assert(!rows().some(u=>u.id===42));
 await action('Synthetic Operator','Desactivar usuario');failMutation=true;await dialog().getByRole('button',{name:'Desactivar usuario',exact:true}).click();await dialog().getByRole('alert').waitFor();assert.equal(rows().find(u=>u.id===9010).status,'active');await dialog().getByRole('button',{name:'Desactivar usuario',exact:true}).click();await dialog().waitFor({state:'hidden'});assert.equal(rows().find(u=>u.id===9010).status,'inactive');await action('Synthetic Operator','Activar usuario');await row('Synthetic Operator').getByText('Activo',{exact:true}).waitFor();
 seatFull=true;await action('Synthetic Inactive','Activar usuario');await page.getByRole('alert').waitFor();assert.equal(rows().find(u=>u.id===9012).status,'inactive');seatFull=false;
 console.log(`${engine}: invitation cancellation and deactivation stay open on errors; activation and capacity guards work`);
 failLoad=true;await page.reload();await page.getByRole('alert').filter({hasText:'No pudimos cargar los usuarios'}).waitFor();assert.equal(await page.getByRole('button',{name:'Invitar usuario',exact:true}).count(),0);failLoad=false;await page.getByRole('button',{name:'Reintentar',exact:true}).click();await ready();
 loadDelay=400;await switchActor(9002,9002);await delay(60);loadDelay=0;await switchActor(9001,9001);await ready();await delay(450);await row('Synthetic Root').waitFor();assert.equal(await page.getByText('Other Root',{exact:true}).count(),0);
 await edit('Synthetic Operator');saveDelay=400;await save().click();await delay(60);await switchActor(9002,9002);await ready();await delay(450);assert.equal(await dialog().count(),0);await row('Other Root').waitFor();saveDelay=0;await switchActor(9001,9001);await ready();
 await switchActor(9001,9001,'user');await page.getByRole('heading',{name:'Usuarios',exact:true}).waitFor();await delay(500);assert.equal(await page.getByRole('button',{name:'Invitar usuario',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Administrar',exact:true}).count(),0);await switchActor(9001,9001,'root');await ready();
 console.log(`${engine}: failed loads cannot mutate, missing permissions fail closed and stale responses cannot cross accounts/companies`);
 const out=process.env.INDICE_USERS_OUTPUT_DIR;if(out)mkdirSync(out,{recursive:true});
 for(const viewport of [{width:320,height:640},{width:390,height:844},{width:844,height:390},{width:1440,height:1000}]){
  await page.setViewportSize(viewport);await page.evaluate(()=>document.querySelector('[data-users-scroll]').scrollTo(0,0));await fit();if(out)await page.screenshot({path:join(out,`${engine}-users-${viewport.width}.png`)});
  await edit('Synthetic Operator');assert.equal(await dialog().evaluate(el=>el.scrollWidth>el.clientWidth),false);await save().scrollIntoViewIfNeeded();const box=await save().boundingBox();assert(box.y>=0&&box.y+box.height<=viewport.height+1);if(out)await page.screenshot({path:join(out,`${engine}-users-editor-${viewport.width}.png`)});await cancel();
  await invite(`synthetic-mobile-${viewport.width}@example.invalid`);assert.equal(await dialog().evaluate(el=>el.scrollWidth>el.clientWidth),false);const send=dialog().getByRole('button',{name:'Enviar invitación',exact:true});await send.scrollIntoViewIfNeeded();const sendBox=await send.boundingBox();assert(sendBox.y>=0&&sendBox.y+sendBox.height<=viewport.height+1);await cancel();
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.classList.add('dark'));await fit();if(out)await page.screenshot({path:join(out,`${engine}-users-dark.png`)});
 for(const code of ['en-CA','en-US','fr-CA','es-CO','pt-BR','ko-CA','zh-CA','es-MX']){await page.evaluate(code=>window.usersFixture.language(code),code);await fit();assert.equal(await page.getByText('undefined',{exact:true}).count(),0);}
 await page.goto(`${origin}/invitations/synthetic-cancelled`);await page.getByRole('heading',{name:'Invitación no disponible',exact:true}).waitFor();assert.equal(await page.locator('input[type=password]').count(),0);
 await page.goto(`${origin}/invitations/synthetic-existing`);
 await page.getByLabel('Contraseña actual',{exact:true}).fill(' x ');await page.getByLabel('Confirma tu contraseña actual',{exact:true}).fill(' x ');
 const connect=page.getByRole('button',{name:'Conectar empresa',exact:true});assert.equal(await connect.isEnabled(),true);
 await connect.evaluate(el=>{el.click();el.click();});await delay(40);assert.equal(await page.getByLabel('Contraseña actual',{exact:true}).isDisabled(),true);
 await page.getByRole('heading',{name:'Empresa conectada',exact:true}).waitFor();assert.equal(acceptCount,1);assert.equal(await page.locator('input[type=password]').count(),0);
 console.log(`${engine}: cancelled public links stay unavailable; existing-account acceptance preserves exact current password and prevents repeated submission`);
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);console.log(`${engine}: mobile 320/390, landscape 844, desktop 1440, modal footers, dark mode and 8 locales fit; no runtime errors`);await context.close();
 }finally{await browser.close();}
}
await server.listen();try{for(const engine of (process.env.INDICE_TEST_ENGINES||'chromium').split(','))await flow(engine);}finally{await server.close();}
