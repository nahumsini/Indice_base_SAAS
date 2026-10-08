/** Development-only UI preview. All data stays in memory; no backend, database or mail provider. */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const origin = 'http://127.0.0.1:5197';
const csrf = 'synthetic-csrf';
const root = '/api/v1/scheduling/';
const engine = '/api/v2/kiosks/public/synthetic-preview-address/';
const statuses = ['REQUESTED', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED','PAUSED'];

export function createPreviewHandler() {
  let nextId = 100;
  const workdays = [1, 2, 3, 4, 5].map(dayOfWeek => ({ dayOfWeek, startTime: '09:00:00', endTime: '17:00:00' }));
  const staff = [
    { id: 2, userId: 42, publicName: 'Consultor demo 1', timezone: 'America/Toronto', active: true, version: 1, days: workdays },
    { id: 3, userId: 43, publicName: 'Consultor demo 2', timezone: 'America/Toronto', active: true, version: 1, days: workdays },
  ];
  const services = [
    { id: 1, name: 'Diagnóstico empresarial', description: 'Identifica oportunidades y define los siguientes pasos para tu empresa.', durationMinutes: 60, bufferMinutes: 15, noticeHours: 24, active: true, version: 1 },
    { id: 6, name: 'Sesión de seguimiento', description: 'Revisa los avances de tu plan de trabajo con tu consultor.', durationMinutes: 30, bufferMinutes: 15, noticeHours: 24, active: true, version: 1 },
  ];
  let bookingPage = { id: 7, alias: 'piloto', title: 'Reserva tu diagnóstico empresarial', description: 'Vista local con datos de prueba. Elige tu consultor, solicita un diagnóstico o inscríbete en un webinar. No ingreses datos reales; esta vista no envía correos.', published: true, version: 1, publicUrl: '/book/piloto',appearance:{brandName:'',accentColor:'#2563EB',surfaceColor:'#F8FAFC',buttonLabel:'',layout:'cards'} };
  const dateAt = (days, hour = 10) => { const date = new Date(); date.setDate(date.getDate() + days); date.setHours(hour, 0, 0, 0); return date.toISOString(); };
  const events = [{ id: 4, staffId: 2, title: 'Webinar: organiza el crecimiento de tu negocio', description: 'Evento de prueba para conocer cómo trabajar con Índice.', startAt: dateAt(3, 14), durationMinutes: 60, capacity: 25, confirmedCount: 0, published: true, status: 'ACTIVE', version: 1 }];
  const reservations = [
    ['Participante demo 1', 'REQUESTED', 0, 10], ['Participante demo 2', 'CONFIRMED', 0, 12],
    ['Participante demo 3', 'REQUESTED', 1, 14], ['Participante demo 4', 'COMPLETED', -2, 10],
    ['Participante demo 5', 'NO_SHOW', -3, 10], ['Participante demo 6', 'CANCELLED', -4, 10],
  ].map(([attendeeName, status, day, hour], index) => ({ id: 10 + index, reference: `SCH-DEMO-${index + 1}`, staffId: 2, serviceId: 1, eventId: null, serviceName: services[0].name, staffName: staff[0].publicName, attendeeName, attendeeEmail: `participant${index + 1}@example.com`, attendeeCompany: 'Empresa demo', startAt: dateAt(day, hour), durationMinutes: 60, status, version: 1 }));
  const replays = new Map(), workspaces = new Map();
  const catalog = () => ({ title: bookingPage.title, description: bookingPage.description,appearance:bookingPage.appearance,
    services: services.filter(item => item.active), staff: staff.filter(item => item.active),
    events: events.filter(item => item.published && item.status === 'ACTIVE').map(item => ({ ...item, availablePlaces: Math.max(0, item.capacity - item.confirmedCount) })), csrfToken: csrf });
  const scoped = url => reservations.filter(item => (!item.archivedAt||url.searchParams.get('includeArchived')==='true')&&(!url.searchParams.get('staffId')||item.staffId===Number(url.searchParams.get('staffId')))&&(!url.searchParams.get('from') || item.startAt >= url.searchParams.get('from')) && (!url.searchParams.get('to') || item.startAt < url.searchParams.get('to')) && (!url.searchParams.get('status') || item.status === url.searchParams.get('status'))).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const clients=[{id:1,companyName:'Empresa demo Norte',contactPerson:'Cliente demo 1',email:'client1@example.com',phone:'',status:'ACTIVE'},{id:2,companyName:'Empresa demo Centro',contactPerson:'Cliente demo 2',email:'client2@example.com',phone:'',status:'ACTIVE'}];
  const send = (res, value, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(status === 204 ? undefined : JSON.stringify(value)); };

  return async (req, res, next) => {
    const url = new URL(req.url, origin), path = url.pathname, method = req.method;
    if (!path.startsWith('/api/')) return next();
    // Never proxy an unknown API to the user's functional backend.
    if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin)) return send(res, { message: 'Local preview only' }, 403);
    let body = {};
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      if (req.headers['x-csrf-token'] !== csrf) return send(res, { message: 'Preview CSRF required' }, 403);
      try {
        let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 65536) throw new Error('Body too large'); }
        body = raw ? JSON.parse(raw) : {};
      } catch { return send(res, { message: 'Invalid preview request' }, 400); }
    }
    if (method === 'GET' && path === '/api/v1/auth/me') return send(res, { user: { id: 42, name: 'Consultor demo 1', role: 'superadmin', module_slugs: ['scheduling'] }, company: { id: 8, name: 'Empresa demo', role: 'superadmin', active: true }, csrfToken: csrf });
    if (path.startsWith('/api/v1/workspace-state/')) {
      if (method === 'PUT') workspaces.set(path, body);
      if (method === 'GET' || method === 'PUT') return send(res, workspaces.get(path) ?? { state: {}, schemaVersion: 1 });
    }
    if (method === 'GET' && path === '/api/v1/modules') return send(res, [{ slug: 'scheduling', name: 'Agenda y eventos' }]);
    if (method === 'GET' && path === `/api/v1/public/scheduling/${bookingPage.alias}` && bookingPage.published) return send(res, { token: 'synthetic-preview-address' });
    if (method === 'GET' && path === `${engine}bootstrap` && bookingPage.published) return send(res, { data: catalog() });
    const isPublic = path.startsWith(engine);
    const tail = path.startsWith(root) ? path.slice(root.length) : isPublic ? path.slice(engine.length) : '';
    if (method === 'GET' && path.startsWith(root)) {
      if(tail==='calendar-grid'){
        const items=scoped(url),visible=events.filter(item=>(!url.searchParams.get('staffId')||item.staffId===Number(url.searchParams.get('staffId')))&&item.startAt>=url.searchParams.get('from')&&item.startAt<url.searchParams.get('to'));
        return send(res,{items,total:items.length,events:visible,eventsTotal:visible.length});
      }
      if(tail==='clients'){
        const search=(url.searchParams.get('search')??'').toLowerCase(),items=clients.filter(item=>`${item.companyName} ${item.contactPerson} ${item.email}`.toLowerCase().includes(search));
        return send(res,{items,total:items.length,page:1,pageSize:25});
      }
      if (tail === 'calendar' || tail === 'reservations') {
        const items = scoped(url), page = Math.max(1, Number(url.searchParams.get('page')) || 1), pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get('pageSize')) || 25));
        return send(res, { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize });
      }
      if (tail === 'metrics') {
        const items = scoped(url), count = status => items.filter(item => item.status === status).length;
        const completed = count('COMPLETED'), noShow = count('NO_SHOW');
        return send(res, { requests: count('REQUESTED'), confirmed: count('CONFIRMED'), completed, noShow, cancelled: count('CANCELLED'), attendanceRate: completed + noShow ? completed / (completed + noShow) * 100 : null });
      }
      const payloads = { services, staff,'staff-options':staff, events, members: staff.map(item => ({ id: item.userId, name: item.publicName })), page: bookingPage, readiness: { publicAccessEnabled: true }, links: { publicUrl: bookingPage.publicUrl }, catalog: catalog() };
      if (Object.hasOwn(payloads, tail)) return send(res, payloads[tail]);
    }
    if (method === 'POST' && (tail === 'slots' || tail === 'actions/scheduling.slots.read@1')) {
      const consultant = staff.find(item => item.id === body.staffId), service = services.find(item => item.id === body.serviceId);
      if (!consultant || !service || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return send(res, { message: 'Invalid demo selection' }, 400);
      const start = new Date(`${body.date}T10:00:00`);
      const starts = [0, 2, 4].map(offset => new Date(start.getTime() + offset * 3600000).toISOString());
      const result = { timezone: consultant.timezone, starts };
      return send(res, isPublic ? { data: result } : result);
    }
    if (method === 'POST' && (tail === 'reservations' || tail === 'actions/scheduling.reservation.request@1')) {
      const key = req.headers['idempotency-key'];
      if (!key || !body.contactConsent || !body.attendeeName || !body.attendeeEmail) return send(res, { message: 'Demo contact and consent required' }, 400);
      if (replays.has(key)) return send(res, isPublic ? { data: replays.get(key) } : replays.get(key));
      const consultant = staff.find(item => item.id === body.staffId), event = events.find(item => item.id === body.eventId), service = services.find(item => item.id === body.serviceId);
      if (!consultant || (!event && !service) || !Number.isFinite(Date.parse(body.startAt)) || reservations.length >= 200) return send(res, { message: 'Invalid demo request' }, 400);
      const id = nextId++, reference = `SCH-DEMO-${id}`;
      reservations.push({ id, reference, staffId: consultant.id, staffName: consultant.publicName, serviceId: service?.id ?? null, eventId: event?.id ?? null, serviceName: service?.name ?? event.title,
        attendeeName: body.attendeeName, attendeeEmail: body.attendeeEmail, attendeeCompany: body.attendeeCompany || '', startAt: event?.startAt ?? body.startAt, durationMinutes: service?.durationMinutes ?? event.durationMinutes, status: 'REQUESTED', version: 1 });
      const result = { status: 'REQUESTED', submissionPolicy: 'REVIEW_REQUIRED', reference }; replays.set(key, result);
      return send(res, isPublic ? { data: result } : result);
    }
    if (method === 'PUT' && tail === 'page') {
      if (!/^[a-z0-9][a-z0-9-]{2,59}$/.test(body.alias)) return send(res, { message: 'Invalid demo alias' }, 400);
      bookingPage = { ...bookingPage, ...body, id: bookingPage.id, version: bookingPage.version + 1, publicUrl: `/book/${body.alias}` };
      return send(res, bookingPage);
    }
    const collection = /^(services|staff|events)(?:\/(\d+))?$/.exec(tail);
    if (collection && ['POST', 'PUT'].includes(method)) {
      const items = { services, staff, events }[collection[1]], id = Number(collection[2]);
      if (method === 'POST' && !id) items.push({ ...body, id: nextId++, version: 1, ...(collection[1] === 'events' ? { confirmedCount: 0, status: 'ACTIVE' } : {}) });
      else {
        const index = items.findIndex(item => item.id === id);
        if (index < 0) return send(res, { message: 'Demo record not found' }, 404);
        if (body.version !== items[index].version) return send(res, { message: 'Reload this demo record' }, 409);
        items[index] = { ...items[index], ...body, id, version: items[index].version + 1 };
      }
      return send(res, undefined, 204);
    }
    const cancel = /^events\/(\d+)\/cancel$/.exec(tail);
    if (method === 'POST' && cancel) {
      const event = events.find(item => item.id === Number(cancel[1]));
      if (!event) return send(res, { message: 'Demo event not found' }, 404);
      Object.assign(event, { status: 'CANCELLED', published: false, version: event.version + 1 });
      reservations.filter(item => item.eventId === event.id && ['REQUESTED', 'CONFIRMED','PAUSED'].includes(item.status)).forEach(item => Object.assign(item, { status: 'CANCELLED',pausedFromStatus:null, version: item.version + 1 }));
      return send(res, undefined, 204);
    }
    const management=/^reservations\/(\d+)\/(management|assignment)$/.exec(tail);
    if(method==='POST'&&management){
      const reservation=reservations.find(item=>item.id===Number(management[1]));
      if(!reservation||reservation.archivedAt||body.version!==reservation.version)return send(res,{message:'Reload this demo record'},409);
      if(!body.reason?.trim())return send(res,{message:'Reason required'},400);
      if(management[2]==='assignment'){
        const target=staff.find(item=>item.id===body.staffId&&item.active);
        if(!target||reservation.eventId||!['REQUESTED','CONFIRMED','PAUSED'].includes(reservation.status))return send(res,{message:'Invalid demo reassignment'},400);
        Object.assign(reservation,{staffId:target.id,staffName:target.publicName});
      }else if(body.action==='PAUSE'&&['REQUESTED','CONFIRMED'].includes(reservation.status))Object.assign(reservation,{pausedFromStatus:reservation.status,status:'PAUSED'});
      else if(body.action==='RESUME'&&reservation.status==='PAUSED')Object.assign(reservation,{status:reservation.pausedFromStatus,pausedFromStatus:null});
      else if(body.action==='ARCHIVE')Object.assign(reservation,{archivedAt:new Date().toISOString(),pausedFromStatus:null,status:['REQUESTED','CONFIRMED','PAUSED'].includes(reservation.status)?'CANCELLED':reservation.status});
      else return send(res,{message:'Invalid demo action'},400);
      reservation.version++;return send(res,reservation);
    }
    const transition = /^reservations\/(\d+)\/status$/.exec(tail);
    if (method === 'POST' && transition) {
      const reservation = reservations.find(item => item.id === Number(transition[1]));
      if (!reservation || !statuses.includes(body.status)) return send(res, { message: 'Invalid demo record' }, 400);
      if (body.version !== reservation.version) return send(res, { message: 'Reload this demo record' }, 409);
      Object.assign(reservation, { status: body.status, version: reservation.version + 1 });
      const event = events.find(item => item.id === reservation.eventId);
      if (event) event.confirmedCount = reservations.filter(item => item.eventId === event.id && ['CONFIRMED', 'COMPLETED', 'NO_SHOW'].includes(item.status)).length;
      return send(res, reservation);
    }
    return send(res, { message: 'This API is unavailable in the isolated scheduling preview' }, 404);
  };
}

async function startPreview() {
  const projectRoot = resolve(import.meta.dirname, '..');
  const handler = createPreviewHandler();
  const server = await createServer({ root: projectRoot, configFile: false, cacheDir: resolve(projectRoot, 'node_modules/.vite-scheduling-preview'),
    plugins: [{ name: 'isolated-scheduling-preview', configureServer(vite) {
      vite.middlewares.use((req, res, next) => { handler(req, res, next).catch(() => { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end('{"message":"Preview request failed"}'); }); });
      vite.middlewares.use((req, _res, next) => { if (req.url === '/' || req.url.startsWith('/scheduling/')) req.url = `/tests/browser/scheduling.html${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`; next(); });
    }, transformIndexHtml: { order: 'pre', handler(html, context) {
      const tags = [{ tag: 'script', children: "if(!localStorage.getItem('frontend-indice-language'))localStorage.setItem('frontend-indice-language','es-MX');", injectTo: 'head-prepend' }];
      if ((context.originalUrl ?? context.path).startsWith('/book/')) tags.push({ tag: 'div', attrs: { style: 'padding:12px 20px;background:#2563eb;color:white;font:14px system-ui;line-height:1.5' }, children: 'Vista local · datos de prueba · no envía correos ni modifica producción', injectTo: 'body-prepend' });
      return { html, tags };
    } } }, react(), tailwindcss()],
    resolve: { alias: { '@': resolve(projectRoot, 'src') } }, assetsInclude: ['**/*.svg', '**/*.csv'],
    define: { 'import.meta.env.VITE_API_BASE_URL': '""' }, server: { host: '127.0.0.1', port: 5197, strictPort: true } });
  await server.listen();
  console.log(`Agenda (synthetic data): ${origin}/scheduling/calendar\nBooking page (synthetic data): ${origin}/book/piloto\nNo backend connection. Changes disappear when this process stops.`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await server.close(); process.exit(0); });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await startPreview();
