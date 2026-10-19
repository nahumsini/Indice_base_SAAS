import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {resolve,join} from 'node:path';
import {mkdirSync} from 'node:fs';
const {chromium}=await import(process.env.INDICE_PLAYWRIGHT_MODULE||'playwright');
const origin='http://127.0.0.1:5205';
const server=await createServer({root:resolve(import.meta.dirname,'..'),cacheDir:'/private/tmp/indice-login-verification-vite',plugins:[{name:'login-verification-fixture',configureServer(server){server.middlewares.use((req,res,next)=>{if(/^\/(?:login|dashboard|oauth\/authorize|away)(?:\?|\/|$)/.test(req.url??''))req.url='/tests/browser/login-verification.html';next();});}}],server:{host:'127.0.0.1',port:5205,strictPort:true,hmr:false,watch:null},define:{'import.meta.env.VITE_API_BASE_URL':'""'}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await server.listen();const browser=await chromium.launch({headless:true,...(process.env.INDICE_CHROME_PATH?{executablePath:process.env.INDICE_CHROME_PATH}:{})});
try{
 for(const viewport of [{width:320,height:360},{width:320,height:640},{width:390,height:844},{width:844,height:390},{width:1440,height:1000}].filter(v=>!process.env.INDICE_LOGIN_WIDTHS || process.env.INDICE_LOGIN_WIDTHS.split(',').includes(String(v.width)))){
  const context=await browser.newContext({viewport,isMobile:viewport.width<600,hasTouch:true});await context.addInitScript(()=>localStorage.setItem('frontend-indice-language','es-MX'));
  let current=false,loginMode='invalid',verifyMode='normal',resendMode='failed',activeCode='123456',loginCount=0,verifyCount=0,resendCount=0;
  const errors=[],unexpected=[];
  const receipt={user:{id:9301,name:'Synthetic login user',role:'viewer',module_slugs:['config_center'],tab_permission_keys:['config_center.profile'],tab_permissions_configured:true},company:{id:9302,name:'Synthetic Login',role:'viewer',active:true,commercial_account_type:'SUPER_ADMIN'},companies:[],csrfToken:'synthetic-rotated-csrf'};
  const challenge=(codeSent=true)=>({mfaRequired:true,challengeId:'synthetic-challenge',maskedDestination:'s***@example.invalid',expiresInSeconds:300,resendAvailableInSeconds:30,codeSent});
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url()),path=url.pathname;
   if(url.origin!==origin)return route.abort();if(!path.startsWith('/api/'))return route.continue();
   const reply=(json,status=200)=>route.fulfill({status,json});
   if(path==='/api/v1/auth/csrf')return reply({csrfToken:'synthetic-csrf'});
   if(path==='/api/v1/auth/me')return current?reply(receipt):reply({message:'Unauthorized'},401);
   if(path==='/api/v1/auth/login'){
    loginCount++;const body=req.postDataJSON();assert.equal(body.companyName,'Synthetic Login');assert.equal(body.email,'synthetic-login@example.invalid');assert.equal(body.password,' exact synthetic password ');await sleep(180);
    if(loginMode==='invalid')return reply({message:'SQL synthetic private detail'},401);
    if(loginMode==='locked')return reply({message:'Private detail'},423);
    if(loginMode==='delivery')return reply({message:'Private detail',code:'MFA_EMAIL_FAILED'},503);
    activeCode='123456';return reply(challenge());
   }
   if(path==='/api/v1/auth/login/otp/resend'){
    resendCount++;assert.equal(req.postDataJSON().challengeId,'synthetic-challenge');await sleep(200);
    if(resendMode==='failed')return reply({message:'SQL synthetic private detail',code:'MFA_EMAIL_FAILED'},503);
    if(resendMode==='cooldown')return reply(challenge(false));
    activeCode='654321';return reply(challenge());
   }
   if(path==='/api/v1/auth/login/otp/verify'){
    verifyCount++;const body=req.postDataJSON();assert.equal(body.challengeId,'synthetic-challenge');await sleep(200);
    if(verifyMode==='expired')return reply({message:'Private detail',code:'MFA_OTP_EXPIRED'},401);
    if(verifyMode==='locked')return reply({message:'Private detail',code:'MFA_OTP_LOCKED'},423);
    if(body.otpCode!==activeCode)return reply({message:'Private detail',code:'MFA_OTP_INVALID'},401);
    current=true;return verifyMode==='lostAck'?reply({message:'Private detail'},503):reply(receipt);
   }
   unexpected.push(`${req.method()} ${path}`);return reply({},404);
  });
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  const fill=async()=>{await page.locator('input').nth(0).fill('  Synthetic Login  ');await page.locator('input[type=email]').fill('synthetic-login@example.invalid');await page.locator('input[type=password]').fill(' exact synthetic password ');};
  const signIn=()=>page.getByRole('button',{name:'Iniciar sesión',exact:true});
  await page.goto(origin+'/login');if(viewport.width===1440)await page.evaluate(()=>window.loginFixture.enter('/\\untrusted.example.invalid'));await fill();await signIn().click();await page.getByRole('alert').filter({hasText:'Revisa la empresa'}).waitFor();assert.equal(loginCount,1);assert.equal(await page.getByText('SQL synthetic private detail').count(),0);
  loginMode='locked';await signIn().click();await page.getByRole('alert').filter({hasText:'límite de intentos'}).waitFor();
  loginMode='delivery';await signIn().click();await page.getByRole('alert').filter({hasText:'No pudimos enviar el código'}).waitFor();
  loginMode='ok';const before=loginCount;await signIn().evaluate(el=>{el.click();el.click();});await sleep(50);assert(await page.locator('input[type=password]').isDisabled());await page.getByRole('heading',{name:'Escribe tu código',exact:true}).waitFor();assert.equal(loginCount,before+1);assert.equal(await page.locator('input[type=password]').count(),0);
  await page.clock.install();
  const otp=()=>page.getByLabel('Código de verificación',{exact:true});const verify=()=>page.getByRole('button',{name:'Verificar y entrar',exact:true});const resend=()=>page.getByRole('button',{name:'Reenviar código',exact:true});
  await otp().fill('12a3');assert.equal(await otp().inputValue(),'123');assert(await verify().isDisabled());assert.equal(await otp().getAttribute('autocomplete'),'one-time-code');assert.equal(await otp().getAttribute('inputmode'),'numeric');
  await otp().fill('111111');await verify().click();await page.getByRole('alert').filter({hasText:'El código no es correcto'}).waitFor();assert.equal(verifyCount,1);
  await page.clock.fastForward(31000);const oldResend=resendCount;await resend().evaluate(el=>{el.click();el.click();});await sleep(40);assert(await otp().isDisabled());assert(await page.getByRole('button',{name:'Usar otra cuenta'}).isDisabled());await page.getByRole('alert').filter({hasText:'El anterior sigue funcionando'}).waitFor();assert.equal(resendCount,oldResend+1);assert.equal(await otp().inputValue(),'111111');
  resendMode='cooldown';await resend().click();await page.getByRole('button',{name:/Reenviar en/}).waitFor();assert.equal(await otp().inputValue(),'111111');assert.equal(await page.getByText('Enviamos un código nuevo. Usa el más reciente.').count(),0);
  await page.clock.fastForward(31000);resendMode='ok';await resend().click();await page.getByRole('status').filter({hasText:'Enviamos un código nuevo'}).waitFor();assert.equal(await otp().inputValue(),'');
  const out=process.env.INDICE_LOGIN_OUTPUT_DIR;if(out){mkdirSync(out,{recursive:true});await verify().scrollIntoViewIfNeeded();await page.screenshot({path:join(out,`login-code-${viewport.width}x${viewport.height}.png`)});}
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await otp().fill('123456');await verify().click();await page.getByRole('alert').filter({hasText:'El código no es correcto'}).waitFor();
  await otp().fill('654 321');assert.equal(await otp().inputValue(),'654321');const previous=verifyCount;await verify().evaluate(el=>{el.click();el.click();});await page.waitForURL('**/dashboard');await page.getByRole('heading',{name:'Synthetic login user / Synthetic Login / viewer'}).waitFor();assert.equal(verifyCount,previous+1);
  current=false;await page.goto(origin+'/login');await fill();await signIn().click();await page.getByRole('heading',{name:'Escribe tu código'}).waitFor();await page.clock.fastForward(301000);await page.getByRole('alert').filter({hasText:'Este código venció'}).waitFor();assert(await otp().isDisabled());assert(await resend().isDisabled());await page.getByRole('button',{name:'Usar otra cuenta'}).click();assert.equal(await page.locator('input[type=password]').inputValue(),'');
  if(viewport.width===1440){
   await fill();await signIn().click();await page.getByRole('heading',{name:'Escribe tu código'}).waitFor();verifyMode='locked';await otp().fill('123456');await verify().click();await page.getByRole('alert').filter({hasText:'límite de intentos'}).waitFor();assert(await otp().isDisabled());await page.getByRole('button',{name:'Usar otra cuenta'}).click();
   await fill();await signIn().click();await page.getByRole('heading',{name:'Escribe tu código'}).waitFor();verifyMode='lostAck';await otp().fill('123456');await verify().click();await page.getByRole('button',{name:'Comprobar acceso'}).click();await page.waitForURL('**/dashboard');await page.getByRole('heading',{name:'Synthetic login user / Synthetic Login / viewer'}).waitFor();
   current=false;await page.goto(origin+'/login');await fill();await signIn().click();await page.getByRole('heading',{name:'Escribe tu código'}).waitFor();
   for(const code of ['en-US','en-CA','fr-CA','es-MX','es-CO','pt-BR','ko-CA','zh-CA']){await page.evaluate(code=>window.loginFixture.language(code),code);await sleep(80);assert.equal(await page.getByText('Secure verification',{exact:true}).count(),code.startsWith('en')?1:0);assert.equal(await page.getByRole('textbox').getAttribute('autocomplete'),'one-time-code');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
   await page.evaluate(()=>window.loginFixture.language('es-MX'));await page.clock.fastForward(31000);resendMode='ok';await resend().click();await page.evaluate(()=>window.loginFixture.away());await sleep(350);assert(new URL(page.url()).pathname==='/away');
   verifyMode='normal';await page.evaluate(()=>window.loginFixture.enter('/oauth/authorize?client_id=synthetic'));await fill();await signIn().click();await page.getByRole('heading',{name:'Escribe tu código'}).waitFor();await otp().fill('123456');await verify().click();await page.waitForURL('**/oauth/authorize?client_id=synthetic');await page.getByRole('heading',{name:'Synthetic login user / Synthetic Login / viewer'}).waitFor();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
  console.log(`Login ${viewport.width}x${viewport.height}: password preserved, localized errors, duplicate protection, OTP keyboard/paste, resend failure/cooldown/new code, expiry, scoped session and layout pass.`);
  await context.close();
 }
}finally{await browser.close();await server.close();}
