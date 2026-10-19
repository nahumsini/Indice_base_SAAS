import assert from 'node:assert/strict';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { createServer } from 'vite';

const runtime = await import(process.env.INDICE_PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'http://127.0.0.1:5194';
const server = await createServer({ root, server: { host:'127.0.0.1', port:5194, strictPort:true }, define:{'import.meta.env.VITE_API_BASE_URL':'""'} });
const pause = ms => new Promise(resolve => setTimeout(resolve,ms));
function photoBytes() {
  const chunk = (name,bytes) => {
    const type=Buffer.from(name), all=Buffer.concat([type,bytes]);let crc=0xffffffff;
    for(const byte of all) { crc^=byte;for(let bit=0;bit<8;bit++) crc=(crc>>>1)^((crc&1)?0xedb88320:0); }
    const size=Buffer.alloc(4), checksum=Buffer.alloc(4);size.writeUInt32BE(bytes.length);checksum.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([size,all,checksum]);
  };
  const width=320,height=400, header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;
  const rows=[];for(let y=0;y<height;y++){const row=Buffer.alloc(1+width*3);for(let x=0;x<width;x++){row[1+x*3]=40;row[2+x*3]=90+Math.round(y/5);row[3+x*3]=220;}rows.push(row);}
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.concat(rows))),chunk('IEND',Buffer.alloc(0))]);
}
const png=photoBytes();
const pdf=Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
const files = {
  photo:{name:'foto-del-turno.png',mimeType:'image/png',buffer:png},
  pdf:{name:'reporte-del-turno.pdf',mimeType:'application/pdf',buffer:pdf},
  word:{name:'acuerdos.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:Buffer.from('PK\u0003\u0004 synthetic Word download')},
  excel:{name:'lista.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from('PK\u0003\u0004 synthetic Excel download')},
};

async function flow(engine) {
  const browser=await runtime[engine].launch({headless:true,...(engine==='chromium' && process.env.INDICE_CHROME_PATH ? {executablePath:process.env.INDICE_CHROME_PATH}:{}),...(engine==='webkit' && process.env.INDICE_WEBKIT_PATH ? {executablePath:process.env.INDICE_WEBKIT_PATH}:{})});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,acceptDownloads:true});
  const page=await context.newPage();page.setDefaultTimeout(12000);
  const errors=[],unexpected=[],conversations=[],messages=[],attachments=new Map(),writes=[],creates=[],sends=[];
  const mode={directoryFails:true,loseCreate:true,failUpload:false,loseSend:false,failLink:false,linkDelay:0};
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url()),path=url.pathname;
    if(url.origin!==origin) return route.abort();
    if(path.startsWith('/synthetic-storage/')) {
      const id=path.split('/').pop(), file=attachments.get(id);
      if(req.method()==='PUT') {
        if(mode.failUpload){mode.failUpload=false;return route.fulfill({status:503});}
        assert.equal(req.headers()['x-csrf-token'],undefined);file.bytes=req.postDataBuffer() ?? Object.values(files).find(item=>item.name===file.fileName)?.buffer;writes.push(id);return route.fulfill({status:200});
      }
      assert.ok(file?.bytes,'Only successfully uploaded synthetic files can open');
      return route.fulfill({contentType:file.contentType,body:file.bytes,headers:file.contentType.startsWith('image/') ? {} : {'Content-Disposition':`attachment; filename="${file.fileName}"`}});
    }
    if(!path.startsWith('/api/')) return route.continue();
    const reply=value=>route.fulfill({json:value});
    if(req.method()!=='GET') assert.equal(req.headers()['x-csrf-token'],'synthetic-csrf');
    if(path==='/api/v1/auth/me') return route.fulfill({status:401,json:{}});
    const owner=path.replace('/api/v1/messaging','');
    if(owner==='/context') return reply({userId:1,companyId:1,membershipId:1,distributor:null,supportOnly:false,initialAttachments:true});
    if(owner==='/directory') {
      if(mode.directoryFails){mode.directoryFails=false;return route.fulfill({status:503,json:{}});}
      const q=url.searchParams.get('q')?.toLowerCase()||'';
      return reply([{id:2,name:'Ana Operaciones'},{id:3,name:'Luis Equipo'}].filter(person=>person.name.toLowerCase().includes(q)));
    }
    if(owner==='/task-context') return reply({canCreate:false});
    if(owner==='/conversations' && req.method()==='GET') {
      const q=url.searchParams.get('q')?.toLowerCase()||'';
      return reply({items:conversations.filter(c=>c.displayName.toLowerCase().includes(q)),hasMore:false});
    }
    if(owner==='/attachments' || /^\/conversations\/\d+\/attachments$/.test(owner)) {
      const body=req.postDataJSON();let file=attachments.get(body.requestKey);
      if(!file){file={id:body.requestKey,...body};attachments.set(file.id,file);}
      return reply({id:file.id,uploadUrl:`${origin}/synthetic-storage/${file.id}`,uploadHeaders:{'Content-Type':file.contentType},expiresAt:new Date(Date.now()+900000).toISOString()});
    }
    if(owner==='/conversations' && req.method()==='POST') {
      const body=req.postDataJSON();creates.push(body.requestKey);
      let c=conversations.find(c=>c.requestKey===body.requestKey);
      if(!c) {
        c={id:conversations.length+1,companyId:1,kind:body.kind,displayName:body.groupName || (body.kind==='DIRECT'?'Ana Operaciones':body.subject),subject:body.subject,status:'OPEN',version:1,unreadCount:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),...body};
        conversations.push(c);messages.push({id:messages.length+1,conversationId:c.id,senderUserId:1,senderName:'Usuario de prueba',senderScope:'MEMBER',visibility:'PUBLIC',body:body.body,createdAt:c.createdAt,requestKey:body.requestKey,attachments:body.attachmentIds.map(id=>attachments.get(id))});
      }
      if(mode.loseCreate){mode.loseCreate=false;return route.fulfill({status:503,json:{}});}
      return reply({conversation:c,messages:{items:messages.filter(m=>m.conversationId===c.id),hasMore:false}});
    }
    const match=owner.match(/^\/conversations\/(\d+)(.*)$/);
    if(match) {
      const id=Number(match[1]),suffix=match[2],c=conversations.find(c=>c.id===id);
      if(!c) return route.fulfill({status:404,json:{}});
      if(suffix==='/read') return route.fulfill({status:204});
      if(suffix.startsWith('/attachments/')) {
        if(mode.linkDelay) await pause(mode.linkDelay);
        if(mode.failLink){mode.failLink=false;return route.fulfill({status:503,json:{}});}
        return reply({url:`${origin}/synthetic-storage/${suffix.split('/').pop()}`});
      }
      if(!suffix) return reply({conversation:c,messages:{items:messages.filter(m=>m.conversationId===id && m.id>Number(url.searchParams.get('after')||0)),hasMore:false},participants:[1,2,3].map(userId=>({userId,membershipId:userId,name:userId===1?'Usuario de prueba':userId===2?'Ana Operaciones':'Luis Equipo',active:true,lastReadMessageId:0}))});
      if(suffix==='/messages') {
        const body=req.postDataJSON();sends.push(body.requestKey);let m=messages.find(m=>m.requestKey===body.requestKey);
        if(!m){m={id:messages.length+1,conversationId:id,senderUserId:1,senderName:'Usuario de prueba',senderScope:'MEMBER',createdAt:new Date().toISOString(),...body,attachments:body.attachmentIds.map(id=>attachments.get(id))};messages.push(m);}
        if(mode.loseSend){mode.loseSend=false;return route.fulfill({status:503,json:{}});}
        return reply(m);
      }
    }
    unexpected.push(`${req.method()} ${path}`);return route.fulfill({status:500,json:{}});
  });
  const checkLayout=async()=>{
    await page.waitForFunction(()=>{
      const dialog=document.querySelector('[role=dialog]')?.getBoundingClientRect();
      const send=document.querySelector('[data-chat-new-footer] button:last-child, button[aria-label="Enviar"]')?.getBoundingClientRect();
      return dialog && send && dialog.x>=-.5 && dialog.y>=-.5 && dialog.right<=innerWidth+.5 && dialog.bottom<=innerHeight+.5 && send.top>=0 && send.bottom<=innerHeight+.5;
    });
    const box=await page.getByRole('dialog',{name:'Mensajes',exact:true}).boundingBox();const size=page.viewportSize();
    assert.ok(box.x>=-.5 && box.y>=-.5 && box.x+box.width<=size.width+.5 && box.y+box.height<=size.height+.5,'Dialog stays in visible viewport');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page horizontal overflow');
    const button=page.getByRole('button',{name:'Enviar',exact:true});const bounds=await button.boundingBox();
    assert.ok(bounds && bounds.y>=0 && bounds.y+bounds.height<=size.height+.5,'Send remains visible');
  };
  const choose=async(label,file)=>{
    await page.getByRole('button',{name:'Adjuntar',exact:true}).tap();
    const chooser=page.waitForEvent('filechooser');
    await page.locator('[data-slot=popover-content]').getByRole('button',{name:label,exact:true}).tap();
    await (await chooser).setFiles(file);
  };
  const openDocument=async(name)=>{
    const file=[...attachments.values()].find(file=>file.fileName===name);
    const request=context.waitForEvent('request',{predicate:req=>req.url().startsWith(`${origin}/synthetic-storage/${file.id}`) && req.method()==='GET'});
    const opened=context.waitForEvent('page');
    await page.getByRole('button',{name:`Abrir archivo: ${name}`,exact:true}).tap();
    const popup=await opened;
    await request;
    assert.equal(await page.getByLabel('Mensaje',{exact:true}).inputValue(),'Borrador que debe conservarse');
    if(!popup.isClosed()) await popup.close();
  };
  try {
    await page.goto(`${origin}/tests/browser/messaging.html`);
    await page.getByRole('button',{name:'Nueva conversación',exact:true}).first().tap();
    await page.getByRole('alert').waitFor();
    await page.getByRole('button',{name:'Reintentar',exact:true}).tap();
    await page.getByLabel('Compañero',{exact:true}).selectOption('2');
    await page.getByLabel('Mensaje',{exact:true}).fill('Te comparto los archivos del turno.');
    await choose('Fotos',files.photo);await choose('Archivos',files.pdf);
    await page.setViewportSize({width:390,height:420});
    await checkLayout();
    await page.getByRole('button',{name:'Enviar',exact:true}).tap();
    const creationError=page.locator('[data-chat-new-footer]').getByRole('alert');await creationError.waitFor();
    const errorBox=await creationError.boundingBox();assert.ok(errorBox.y>=0 && errorBox.y+errorBox.height<=420,'Creation failure is visible beside Send');
    assert.equal(await page.getByLabel('Mensaje',{exact:true}).inputValue(),'Te comparto los archivos del turno.');
    await page.getByRole('button',{name:'Quitar adjunto: foto-del-turno.png',exact:true}).waitFor();
    await page.getByRole('button',{name:'Enviar',exact:true}).tap();
    await page.getByRole('heading',{name:'Ana Operaciones',exact:true}).waitFor();
    assert.equal(conversations.length,1);assert.equal(messages.length,1);assert.equal(writes.length,2);assert.equal(creates[0],creates[1]);
    await page.setViewportSize({width:390,height:844});await checkLayout();
    console.log(`PASS ${engine}: touch chooser, directory recovery, initial photo/PDF, visible failure and creation retry`);
    const picture=page.getByRole('img',{name:files.photo.name,exact:true});await picture.waitFor();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('[role=log] img')).every(img=>img.complete && img.naturalWidth>0));
    await page.getByLabel('Mensaje',{exact:true}).fill('Borrador que debe conservarse');
    await page.getByRole('button',{name:`Ampliar fotografía: ${files.photo.name}`,exact:true}).tap();
    await page.getByRole('button',{name:`Reducir fotografía: ${files.photo.name}`,exact:true}).tap();
    assert.equal(await page.getByLabel('Mensaje',{exact:true}).inputValue(),'Borrador que debe conservarse');
    mode.linkDelay=700;await openDocument(files.pdf.name);mode.linkDelay=0;
    console.log(`PASS ${engine}: open/close photo and delayed private PDF while preserving the conversation draft`);
    // A blocked popup must produce a real link that works on the next user tap.
    await page.evaluate(()=>{window.testOpen=window.open;window.open=()=>null;});
    mode.failLink=true;
    await page.getByRole('button',{name:`Abrir archivo: ${files.pdf.name}`,exact:true}).tap();
    await page.getByRole('alert').filter({hasText:'No se pudo abrir el archivo'}).waitFor();
    await page.getByRole('button',{name:`Abrir archivo: ${files.pdf.name}`,exact:true}).tap();
    const ready=page.getByRole('link',{name:`Abrir archivo: ${files.pdf.name}`,exact:true});await ready.waitFor();
    const pdfId=[...attachments.values()].find(f=>f.fileName===files.pdf.name).id;
    const retrieval=context.waitForEvent('request',{predicate:req=>req.url().startsWith(`${origin}/synthetic-storage/${pdfId}`) && req.method()==='GET'});
    await ready.tap();await retrieval;
    for(const popup of context.pages()) if(popup!==page && !popup.isClosed()) await popup.close();
    await page.evaluate(()=>{window.open=window.testOpen;delete window.testOpen;});
    assert.equal(await page.getByLabel('Mensaje',{exact:true}).inputValue(),'Borrador que debe conservarse');
    console.log(`PASS ${engine}: file-open error recovery and direct-link fallback for blocked popups`);
    await choose('Archivos',[files.word,files.excel]);
    mode.failUpload=true;await page.getByRole('button',{name:'Enviar',exact:true}).tap();
    await page.getByRole('alert').filter({hasText:'No se pudo subir'}).waitFor();
    mode.loseSend=true;await page.getByRole('button',{name:'Enviar',exact:true}).tap();
    await page.getByRole('alert').filter({hasText:'Tu mensaje sigue aquí'}).waitFor();
    await page.getByRole('button',{name:'Enviar',exact:true}).tap();
    await page.waitForFunction(()=>document.querySelector('textarea')?.value==='');
    assert.equal(messages.length,2);assert.equal(writes.length,4);assert.equal(sends[sends.length-1],sends[sends.length-2]);
    await page.getByLabel('Mensaje',{exact:true}).fill('Borrador que debe conservarse');
    await openDocument(files.word.name);await openDocument(files.excel.name);
    console.log(`PASS ${engine}: Word/Excel upload failure, lost send response, retry and native file opening`);
    await choose('Archivos',{name:'archivo-'+ 'x'.repeat(180)+'.heic',mimeType:'image/heic',buffer:Buffer.from('invalid')});
    await page.getByRole('alert').filter({hasText:'HEIC'}).waitFor();
    for(const [width,height] of [[320,480],[390,420],[430,844],[844,390]]) {
      await page.setViewportSize({width,height});await checkLayout();
    }
    // Remove the selection error, then protect the retained text when returning to the list.
    await choose('Fotos',files.photo);await page.getByRole('button',{name:`Quitar adjunto: ${files.photo.name}`,exact:true}).tap();
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'Volver',exact:true}).tap();
    await page.getByRole('button',{name:'Seguir escribiendo',exact:true}).tap();
    assert.equal(await page.getByLabel('Mensaje',{exact:true}).inputValue(),'Borrador que debe conservarse');
    await page.getByLabel('Mensaje',{exact:true}).fill('');
    await page.getByRole('button',{name:'Volver',exact:true}).tap();
    await page.getByRole('button',{name:/Ana Operaciones/}).tap();
    await checkLayout();
    if(process.env.INDICE_MESSAGING_SCREENSHOTS) await page.screenshot({path:resolve(process.env.INDICE_MESSAGING_SCREENSHOTS,`mensajes-flujo-movil-${engine}.png`)});
    console.log(`PASS ${engine}: small phone/landscape layouts, long file errors and protected return navigation`);
    await page.getByRole('button',{name:'Volver',exact:true}).tap();
    await page.getByRole('button',{name:'Nueva conversación',exact:true}).first().tap();
    await page.getByRole('button',{name:'Chat grupal',exact:true}).tap();
    await page.getByLabel('Nombre del grupo',{exact:true}).fill('Equipo del turno');
    await page.getByRole('checkbox',{name:'Ana Operaciones',exact:true}).check();
    await page.getByRole('checkbox',{name:'Luis Equipo',exact:true}).check();
    await page.getByLabel('Mensaje',{exact:true}).fill('Mensaje listo para el equipo');
    const beforeSearch=creates.length;
    await page.getByRole('searchbox',{name:'Buscar',exact:true}).fill('Luis');
    await page.getByRole('searchbox',{name:'Buscar',exact:true}).press('Enter');
    assert.equal(creates.length,beforeSearch,'Search does not implicitly submit a complete group form');
    await page.getByLabel('Mensaje',{exact:true}).fill('');
    await choose('Archivos',files.pdf);
    await page.getByRole('button',{name:'Enviar',exact:true}).tap();
    await page.getByRole('heading',{name:'Equipo del turno',exact:true}).waitFor();
    assert.equal(conversations.length,2);assert.equal(messages.length,3);
    assert.deepEqual(conversations[1].participantMembershipIds,[2,3]);
    console.log(`PASS ${engine}: group audience, search keyboard without accidental send and file-only initial group message`);

    assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
  } catch(error) {
    console.error(engine,(await page.locator('body').innerText()).slice(-3500));
    console.error(JSON.stringify(await page.evaluate(()=>({width:innerWidth,height:innerHeight,visual:[visualViewport.width,visualViewport.height,visualViewport.offsetTop,visualViewport.scale],boxes:['[role=dialog]','[data-slot=indice-modal-body]','[data-chat-new-conversation]','[data-chat-new-footer]','button[type=submit]'].map(selector=>{const el=document.querySelector(selector);const box=el?.getBoundingClientRect();return [selector,box?{x:box.x,y:box.y,width:box.width,height:box.height,bottom:box.bottom,flex:getComputedStyle(el).flex}:null];})}))));
    if(process.env.INDICE_MESSAGING_SCREENSHOTS) await page.screenshot({path:resolve(process.env.INDICE_MESSAGING_SCREENSHOTS,`mensajes-flujo-error-${engine}.png`)});
    throw error;
  } finally {await browser.close();}
}
try {await server.listen();for(const engine of (process.env.INDICE_MESSAGING_ENGINES||'chromium').split(',')) await flow(engine);}
finally {await server.close();}
