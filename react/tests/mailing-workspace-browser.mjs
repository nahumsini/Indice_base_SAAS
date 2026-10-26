import assert from "node:assert/strict";
import { createServer } from "vite";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
const runtime = await import(
  process.env.INDICE_PLAYWRIGHT_MODULE || "playwright"
);
const origin = "http://127.0.0.1:5207";
const server = await createServer({
  root: resolve(import.meta.dirname, ".."),
  cacheDir: "/tmp/indice-mailing-workspace-vite",
  server: {
    host: "127.0.0.1",
    port: 5207,
    strictPort: true,
    hmr: false,
    watch: null,
  },
  define: { "import.meta.env.VITE_API_BASE_URL": '""' },
});
const rows = Array.from({ length: 27 }, (_, i) => ({
  id: i + 1,
  name: `Persona ${String(i + 1).padStart(2, "0")}`,
  contactPerson: `Persona ${String(i + 1).padStart(2, "0")}`,
  companyName: `Consultorio ${i + 1}`,
  email: `persona${i + 1}@example.com`,
  ownerName: i % 2 ? "Vendedor B" : "Vendedor A",
  source: i % 2 ? "referral" : "website",
  eligibility:
    i === 2
      ? "INVALID"
      : i === 3
        ? "SUPPRESSED"
        : "READY",
}));
let savedCampaign = null, failWorkspace = false;
const sender = {id:'00000000-0000-4000-8000-000000000099',label:'Equipo comercial',email:'sales@example.com',displayName:'Ventas',smtpStatus:'VERIFIED'};
const campaigns = Array.from({length:27},(_,i)=>({
 id:`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,name:`Campaña ${String(i+1).padStart(2,'0')}`,subject:'Servicios para tu consultorio',senderAccountId:sender.id,senderName:'Ventas',status:i===0?'DRAFT':i===1?'RUNNING':i===2?'SCHEDULED':'COMPLETED',version:1,updatedAt:'2026-10-19T15:00:00Z',scheduledAt:i===0?null:'2026-10-20T15:00:00Z',selectedCount:27,
 delivery:{total:i===0?0:24,pending:i===1?12:0,submitting:0,accepted:i===1?10:22,failed:1,unknown:1,suppressed:0,cancelled:0},requiresAttention:i>0
}));
campaigns[1].waitingForQuota = true;
let workspaceQueries=[];
const lists = new Map();
const errors = [];
let failPreview = false,
  failList = false;
await server.listen();
const browser = await runtime.chromium.launch({
  headless: true,
  ...(process.env.INDICE_CHROME_PATH
    ? { executablePath: process.env.INDICE_CHROME_PATH }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
});
await context.addInitScript(() =>
  localStorage.setItem("frontend-indice-language", "es-MX"),
);
await context.route("**/*", async (route) => {
  const req = route.request(),
    url = new URL(req.url()),
    path = url.pathname;
  if (url.origin !== origin) return route.abort();
  if (!path.startsWith("/api/")) return route.continue();
  const reply = (value) => route.fulfill({ json: value });
  const params = url.searchParams;
  assert.ok(
    !/\/(launch|test|send|control)$/.test(path),
    "audience operations must never send",
  );
  if (path === "/api/v1/auth/csrf")
    return reply({ csrfToken: "synthetic-csrf" });
  if (path === "/api/v1/mailing/senders") return reply([sender]);
  if(path==='/api/v1/mailing/workspace') {
    workspaceQueries.push(Object.fromEntries(params));
    if(failWorkspace)return route.fulfill({status:503,json:{}});
    let base=campaigns.filter(c=>!params.get('search')||c.name.toLowerCase().includes(params.get('search').toLowerCase()));
    if(params.get('senderAccountId'))base=base.filter(c=>c.senderAccountId===params.get('senderAccountId'));
    const summary={total:base.length,draft:base.filter(c=>c.status==='DRAFT').length,scheduled:base.filter(c=>c.status==='SCHEDULED').length,running:base.filter(c=>c.status==='RUNNING').length,completed:base.filter(c=>c.status==='COMPLETED').length,paused:0,cancelled:0,attention:base.filter(c=>c.requiresAttention).length};
    let items=base.filter(c=>!params.get('status')||params.get('status')==='ALL'||(params.get('status')==='ATTENTION'?c.requiresAttention:c.status===params.get('status')));
    const key=params.get('sort');items.sort((a,b)=>String(a[key]??'').localeCompare(String(b[key]??''))*(params.get('direction')==='asc'?1:-1));
    const page=Number(params.get('page')||1),pageSize=Number(params.get('pageSize')||25),total=items.length;
    return reply({items:items.slice((page-1)*pageSize,page*pageSize),total,page,pageSize,summary,senders:[sender],publicLinkReady:true,canEdit:true,canViewDetails:true});
  }
  const campaignPath=path.match(/\/campaigns\/([^/]+)(?:\/(review|results))?$/);
  if(campaignPath&&req.method()==='GET') {
    const c=campaigns.find(c=>c.id===campaignPath[1]);
    if(campaignPath[2]==='review')return reply({id:c.id,version:1,status:c.status,subject:c.subject,bodyText:'Mensaje de prueba',replyTo:sender.email,sender:{id:sender.id,email:sender.email,name:'Ventas',version:1,verified:true},audience:[{contactId:1,name:'Persona 01',email:'persona1@example.com',eligibility:'READY'}],digest:'synthetic-digest',canSend:true,publicLinkReady:true});
    if(campaignPath[2]==='results')return reply({status:c.status,version:1,scheduledAt:c.scheduledAt,lastError:c.waitingForQuota?'email_send_rate_limited':null,items:[],canSend:true});
    return reply({...c,replyTo:sender.email,previewText:'',bodyText:'Hola {{name}}',recipientCount:1,recipients:[rows[0]]});
  }
  if(path==='/api/v1/mailing/templates')return reply({items:[],total:0,page:1,pageSize:25,canManage:true});
  if (path === "/api/v1/mailing/audience/options")
    return reply({
      sources: ["website", "referral"],
      owners: [
        { value: "1", label: "Vendedor A" },
        { value: "2", label: "Vendedor B" },
      ],
      tags: ["clinica"],
    });
  if (
    path === "/api/v1/mailing/audience" ||
    path === "/api/v1/mailing/audience/selection"
  ) {
    if (params.get("search") === "overflow")
      return route.fulfill({
        status: 409,
        json: { message: "mailing_selection_limit" },
      });
    let data = rows.filter(
      (r) =>
        (!params.get("search") ||
          [r.name, r.companyName, r.email]
            .join(" ")
            .toLowerCase()
            .includes(params.get("search").toLowerCase())) &&
        (!params.get("source") || r.source === params.get("source")) &&
        (!params.get("owner") ||
          r.ownerName ===
            (params.get("owner") === "1" ? "Vendedor A" : "Vendedor B")) &&
        (!params.get("eligibility") ||
          r.eligibility === params.get("eligibility")),
    );
    const sort = params.get("sort") || "name";
    data.sort(
      (a, b) =>
        String(a[sort]).localeCompare(String(b[sort])) *
        (params.get("direction") === "desc" ? -1 : 1),
    );
    if (path.endsWith("/selection")) return reply(data);
    const page = Number(params.get("page") || 1),
      size = Number(params.get("pageSize") || 10);
    return reply({
      items: data.slice((page - 1) * size, page * size),
      total: data.length,
      page,
      pageSize: size,
    });
  }
  if (path === "/api/v1/mailing/audience/preview") {
    assert.equal(req.headers()["x-csrf-token"], "synthetic-csrf");
    if (failPreview) return route.fulfill({ status: 503, json: {} });
    const ids = req.postDataJSON().contactIds,
      items = rows.filter((r) => ids.includes(r.id));
    return reply({
      selected: items.length,
      ready: items.filter((r) => r.eligibility === "READY").length,
      consentRequired: 0,
      excluded: items.filter((r) =>
        ["INVALID", "SUPPRESSED"].includes(r.eligibility),
      ).length,
      items,
    });
  }
  if (path === "/api/v1/mailing/audience/lists")
    return reply([...lists.values()].map(({ items, ...l }) => l));
  const listId = path.match(/\/audience\/lists\/([^/]+)(\/archive)?$/);
  if (listId) {
    const id = listId[1];
    if (req.method() === "PUT") {
      assert.equal(req.headers()["x-csrf-token"], "synthetic-csrf");
      if (failList) return route.fulfill({ status: 503, json: {} });
      const body = req.postDataJSON();
      const old = lists.get(id);
      if (body.version !== (old?.version ?? 0))
        return route.fulfill({ status: 409, json: {} });
      const result = {
        id,
        name: body.name,
        version: body.version + 1,
        contactCount: body.contactIds.length,
        updatedAt: new Date().toISOString(),
        items: rows.filter((r) => body.contactIds.includes(r.id)),
      };
      lists.set(id, result);
      return reply(result);
    }
    if (listId[2]) {
      lists.delete(id);
      return reply({});
    }
    const list = lists.get(id);
    return reply({ list, items: list.items, unavailable: 0 });
  }
  if (path.endsWith("/history"))
    return reply({
      items: [
        {
          campaignId: "history",
          name: "Seguimiento de prueba",
          subject: "Servicios de consultorio",
          campaignStatus: "COMPLETED",
          deliveryState: "ACCEPTED",
          email: "persona1@example.com",
          scheduledAt: null,
          completedAt: "2026-10-18T12:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });
  if (path.includes("/campaigns/") && req.method() === "PUT") {
    savedCampaign = req.postDataJSON();
    const id=path.split('/').at(-1), old=campaigns.find(c=>c.id===id);
    Object.assign(old,savedCampaign);
    return reply({...old,recipients:rows.filter(r=>savedCampaign.contactIds.includes(r.id))});
  }
  if (path.startsWith("/api/v1/workspace-state/"))
    return reply({ state: {}, schemaVersion: 1 });
  throw new Error(`Unexpected API ${req.method()} ${path}`);
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
try {
 await page.goto(origin+'/tests/browser/mailing-workspace.html');
 await page.getByRole('heading',{name:'Campañas de correo',exact:true}).waitFor();
 await page.getByRole('button',{name:'Continuar borrador',exact:true}).waitFor();
 assert.equal(await page.locator('tbody tr').count(),25);
 await page.getByRole('button',{name:'Todas las campañas 27',exact:true}).waitFor();
 await page.getByText('En espera de cupo',{exact:true}).waitFor();
 const waitingRow=page.getByRole('row').filter({hasText:'Campaña 02'});
 await waitingRow.getByRole('button',{name:'Ver avance',exact:true}).click();
 await page.getByRole('status').filter({hasText:'La cuenta alcanzó 30 envíos en la última hora.'}).waitFor();
 await page.getByRole('button',{name:'Cerrar',exact:true}).first().click();
 await page.getByRole('dialog').waitFor({state:'hidden'});

 await page.getByRole('button',{name:'Campaña',exact:true}).click();
 await page.getByRole('button',{name:'Campaña',exact:true}).click();
 await page.locator('th[aria-sort="descending"]').waitFor();
 await page.getByRole('button',{name:'Borradores 1',exact:true}).click();
 await page.getByRole('button',{name:'Continuar borrador',exact:true}).waitFor();
 assert.equal(await page.locator('tbody tr').count(),1);
 assert.equal(workspaceQueries.at(-1).status,'DRAFT');
 await page.waitForTimeout(700);
 await page.reload();
 await page.getByRole('button',{name:'Continuar borrador',exact:true}).waitFor();
 await page.waitForTimeout(400);
 assert.equal(workspaceQueries.at(-1).status,'DRAFT','status restored after reload');
 await page.getByRole('button',{name:'Continuar borrador',exact:true}).click();
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await page.getByRole('button',{name:'Guardar y revisar envío',exact:true}).click();
 await page.getByRole('heading',{name:'Envío y resultados',exact:true,level:2}).waitFor();
 assert.ok(savedCampaign);
 await page.getByRole('button',{name:'Cerrar',exact:true}).first().click();
 await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Listas de destinatarios',exact:true}).click();
 await page.getByRole('heading',{name:'Listas de destinatarios',exact:true}).waitFor();
 await page.getByRole('checkbox').first().waitFor();
 await page.getByRole('button',{name:'Seleccionar todos los resultados',exact:true}).click();
 await page.getByRole('button',{name:'Ver seleccionados · 27'}).waitFor();
 await page.getByRole('button',{name:'Guardar selección como lista',exact:true}).click();
 await page.getByLabel('Nombre de la lista',{exact:true}).fill('Clientes de servicios');
 await page.getByRole('button',{name:'Guardar lista',exact:true}).click();
 await page.getByText('Lista guardada.',{exact:true}).waitFor();
 assert.equal(lists.size,1);
 await page.getByRole('button',{name:'Cerrar',exact:true}).first().click();
 await page.getByRole('heading',{name:'¿Cerrar las listas de destinatarios?',exact:true}).waitFor();
 await page.getByRole('button',{name:'Cerrar',exact:true}).first().click();
 await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Limpiar filtros',exact:true}).click();
 await page.getByRole('button',{name:'Ver resultados',exact:true}).first().waitFor();
 await page.getByRole('progressbar',{name:'Avance del envío: Campaña 02',exact:true}).waitFor();
 assert.equal(await page.getByRole('progressbar',{name:'Avance del envío: Campaña 02',exact:true}).getAttribute('aria-valuenow'),'50');
 await page.getByRole('button',{name:'Ver resultados',exact:true}).first().click();
 await page.getByRole('heading',{name:'Envío y resultados',exact:true,level:2}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Guardar borrador',exact:true}).count(),0);
 await page.getByRole('button',{name:'Cerrar',exact:true}).first().click();
 await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.getByRole('searchbox',{name:'Buscar',exact:true}).fill('Ninguna');
 await page.getByText('No hay campañas que coincidan con estos filtros.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Limpiar filtros',exact:true}).first().click();
 await page.getByRole('button',{name:'Ver resultados',exact:true}).first().waitFor();
 failWorkspace=true;
 await page.getByRole('button',{name:'Acciones',exact:true}).click();
 await page.getByRole('menuitem',{name:'Actualizar',exact:true}).click();
 await page.getByText('No se pudieron cargar las campañas.',{exact:true}).waitFor();
 failWorkspace=false;
 await page.getByRole('button',{name:'Reintentar',exact:true}).click();
 await page.getByRole('button',{name:'Ver resultados',exact:true}).first().waitFor();
 await mkdir('/tmp/indice-mailing-workspace-review',{recursive:true});
 await page.screenshot({path:'/tmp/indice-mailing-workspace-review/desktop.png',fullPage:false});
 await page.evaluate(()=>document.documentElement.classList.add('dark'));
 await page.waitForTimeout(250);
 await page.screenshot({path:'/tmp/indice-mailing-workspace-review/desktop-dark.png',fullPage:false});
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'no page overflow on mobile');
 await page.screenshot({path:'/tmp/indice-mailing-workspace-review/mobile-dark.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('Mailing workspace browser passed: state facets, sorting, draft → review handoff, standalone lists, completed results, empty/error recovery, desktop/mobile/dark. No sending.');
} catch(error) { console.error('Browser errors:', errors); console.error((await page.locator('body').innerText()).slice(0,2200)); throw error; } finally { await browser.close();await server.close(); }
