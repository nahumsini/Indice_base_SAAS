import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {resolve,join} from 'node:path';
import {mkdirSync} from 'node:fs';
const {chromium}=await import(process.env.INDICE_PLAYWRIGHT_MODULE||'playwright');
const origin='http://127.0.0.1:5204';
const server=await createServer({root:resolve(import.meta.dirname,'..'),cacheDir:'/private/tmp/indice-password-recovery-vite',plugins:[{name:'password-recovery-fixture',configureServer(server){server.middlewares.use((req,res,next)=>{if(/^\/(?:login|dashboard|reset-password)(?:\/|$)/.test(req.url??''))req.url='/tests/browser/password-recovery.html';next();});}}],server:{host:'127.0.0.1',port:5204,strictPort:true,hmr:false,watch:null},define:{'import.meta.env.VITE_API_BASE_URL':'""'}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await server.listen();const browser=await chromium.launch({headless:true,...(process.env.INDICE_CHROME_PATH?{executablePath:process.env.INDICE_CHROME_PATH}:{})});
try{
 for(const viewport of [{width:320,height:360},{width:320,height:640},{width:390,height:844},{width:844,height:390},{width:1440,height:1000}]){
  const context=await browser.newContext({viewport,isMobile:viewport.width<900,hasTouch:true});await context.addInitScript(()=>localStorage.setItem('frontend-indice-language','es-MX'));
  let valid=true,failLoad=true,failRequest=true,failLogout=true,loseAck=false,requestCount=0,completeCount=0,current=false,password='old synthetic password';
  const errors=[],unexpected=[];
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url()),path=url.pathname;
   if(url.origin!==origin)return route.abort();if(!path.startsWith('/api/'))return route.continue();
   const reply=(json,status=200)=>route.fulfill({status,json});
   if(path==='/api/v1/auth/csrf')return reply({csrfToken:'synthetic-csrf'});
   if(path==='/api/v1/auth/me')return current?reply({user:{id:9201,name:'Synthetic recovered account',role:'user',module_slugs:['config_center'],tab_permission_keys:['config_center.profile'],tab_permissions_configured:true},company:{id:9201,name:'Synthetic Recovery',role:'user',active:true,commercial_account_type:'SUPER_ADMIN'},companies:[],csrfToken:'synthetic-csrf'}):reply({message:'Unauthorized'},401);
   if(path==='/api/v1/auth/logout'){if(failLogout){failLogout=false;return reply({message:'SQL synthetic private detail'},503);}current=false;return reply({success:true});}
   if(path==='/api/v1/auth/login'){const body=req.postDataJSON();assert.equal(body.companyName,'Synthetic Recovery');assert.equal(body.email,'synthetic-recovery@example.invalid');if(body.password!==password)return reply({message:'Invalid company, email, or password.'},401);current=true;return reply({user:{id:9201,name:'Synthetic recovered account',role:'user'},company:{id:9201,name:'Synthetic Recovery',role:'user',active:true},companies:[],csrfToken:'synthetic-csrf'});}
   if(path==='/api/v1/auth/password-reset/request'){
    requestCount++;assert.equal(req.postDataJSON().email,'synthetic-recovery@example.invalid');await sleep(250);
    if(failRequest){failRequest=false;return reply({message:'SQL synthetic private detail'},503);}
    return reply({message:'If that email exists, a password reset link has been sent.'});
   }
   if(path==='/api/v1/auth/password-reset/synthetic-valid'){
    if(failLoad)return reply({message:'SQL synthetic private detail'},503);
    return valid?reply({valid:true}):reply({message:'Password reset link is invalid or expired.'},404);
   }
   if(path==='/api/v1/auth/password-reset/synthetic-valid/complete'){
    completeCount++;const body=req.postDataJSON();assert.equal(body.password,' exact synthetic new password ');assert.equal(body.confirm_password,body.password);await sleep(300);password=body.password;valid=false;
    return loseAck?reply({message:'Synthetic acknowledgement lost'},503):reply({success:true,message:'Password has been reset.'});
   }
   if(path==='/api/v1/auth/password-reset/synthetic-invalid')return reply({valid:false});
   unexpected.push(`${req.method()} ${path}`);return reply({},404);
  });
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/login');
  try {await page.getByText('¿Olvidaste tu contraseña?',{exact:true}).click();}
  catch(error){console.log('Entry diagnostics:',(await page.locator('body').innerText()).slice(0,1300),errors);throw error;}const dialog=page.getByRole('dialog');
  await dialog.getByRole('textbox',{name:'Correo electrónico',exact:true}).fill('bad');await dialog.getByRole('textbox',{name:'Correo electrónico',exact:true}).blur();await dialog.getByRole('alert').waitFor();assert.equal(requestCount,0);
  await dialog.getByRole('textbox',{name:'Correo electrónico',exact:true}).fill('synthetic-recovery@example.invalid');await dialog.getByRole('button',{name:'Enviar enlace',exact:true}).click();await dialog.getByRole('alert').filter({hasText:'No fue posible'}).waitFor();assert.equal(await page.getByText('SQL synthetic private detail').count(),0);
  const send=dialog.getByRole('button',{name:'Enviar enlace',exact:true});await send.evaluate(el=>{el.click();el.click();});await sleep(40);assert.equal(await dialog.getByRole('textbox').isDisabled(),true);await page.keyboard.press('Escape');assert(await dialog.isVisible());
  await dialog.getByRole('status').waitFor();assert.equal(requestCount,2);assert.equal(await dialog.getByText('If that email exists, a password reset link has been sent.',{exact:true}).count(),0);assert(await send.isDisabled());
  const box=await send.boundingBox();assert(box.y>=0&&box.y+box.height<=viewport.height+1,JSON.stringify({box,viewport}));
  const out=process.env.INDICE_RECOVERY_OUTPUT_DIR;if(out){mkdirSync(out,{recursive:true});await page.screenshot({path:join(out,`recovery-request-${viewport.width}.png`)});}
  await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();
  await page.goto(origin+'/reset-password/synthetic-valid');await page.getByRole('button',{name:'Volver a revisar',exact:true}).waitFor();failLoad=false;await page.getByRole('button',{name:'Volver a revisar',exact:true}).click();
  const first=page.getByLabel('Contraseña nueva',{exact:true}),second=page.getByLabel('Confirma la contraseña nueva',{exact:true});
  await first.fill('🙂'.repeat(25));await first.blur();await page.getByText('La contraseña es demasiado larga. Usa una más corta.',{exact:true}).waitFor();
  await first.fill('short');await first.blur();await page.getByText('Usa al menos 8 caracteres.',{exact:true}).waitFor();
  await first.fill(' exact synthetic new password ');await second.fill('different');await second.blur();await page.getByText('Las contraseñas no coinciden.',{exact:true}).waitFor();await second.fill(' exact synthetic new password ');
  const save=page.getByRole('button',{name:'Cambiar contraseña',exact:true});await save.scrollIntoViewIfNeeded();if(out)await page.screenshot({path:join(out,`recovery-form-${viewport.width}.png`)});
  loseAck=viewport.width===1440;await save.evaluate(el=>{el.click();el.click();});await sleep(40);assert(await first.isDisabled());
  await page.getByRole('heading',{name:loseAck?'No pudimos confirmar el cambio':'Tu contraseña está lista',exact:true}).waitFor();assert.equal(completeCount,1);assert.equal(await page.locator('input[type=password]').count(),0);
  await page.getByRole('button',{name:'Ir a iniciar sesión',exact:true}).click();await page.getByRole('alert').filter({hasText:'No pudimos abrir'}).waitFor();await page.getByRole('button',{name:'Ir a iniciar sesión',exact:true}).click();await page.waitForURL('**/login');
  assert.equal(await page.locator('input[type=password]').inputValue(),'');await page.locator('input').nth(0).fill('Synthetic Recovery');await page.locator('input[type=email]').fill('synthetic-recovery@example.invalid');await page.locator('input[type=password]').fill(password);await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.waitForURL('**/dashboard');await page.getByRole('heading',{name:'Synthetic recovered account'}).waitFor();
  await page.goto(origin+'/reset-password/synthetic-invalid');await page.getByRole('heading',{name:'Este enlace ya no está disponible',exact:true}).waitFor();assert.equal(await page.locator('input[type=password]').count(),0);
  await page.getByRole('button',{name:'Pedir otro enlace',exact:true}).click();await page.waitForURL('**/login');await page.getByRole('dialog').waitFor();
  assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  console.log(`Password recovery ${viewport.width}x${viewport.height}: request validation, safe localized feedback, duplicate protection, modal/keyboard fit, link retry, password validation, confirmed or uncertain save, session handoff and sign-in pass.`);
  await context.close();
 }
}finally{await browser.close();await server.close();}
