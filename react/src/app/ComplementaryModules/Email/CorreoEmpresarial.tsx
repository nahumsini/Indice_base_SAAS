import { useState } from 'react';
import { Mail, Inbox, Settings, PenLine, Search } from 'lucide-react';
import { IndiceModuleShell } from '../../components/frontend-os';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
type Folder = 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash';
type Message = {
    id: string;
    sender: string;
    address: string;
    subject: string;
    body: string;
    folder: Folder;
    read: boolean;
    starred: boolean;
};
const folders: {
    id: Folder;
    label: string;
}[] = [{ id: 'inbox', label: 'Bandeja de entrada' }, { id: 'sent', label: 'Enviados' }, { id: 'drafts', label: 'Borradores' }, { id: 'archive', label: 'Archivados' }, { id: 'trash', label: 'Papelera' }];
const examples: Message[] = [
    { id: 'demo-1', sender: 'Equipo de compras', address: 'compras@example.com', subject: 'Revisión de propuesta comercial', body: 'Hola,\n\nGracias por compartir la propuesta. ¿Podemos revisar los tiempos de entrega esta semana?\n\nQuedamos atentos a tus comentarios.', folder: 'inbox', read: false, starred: true },
    { id: 'demo-2', sender: 'Operaciones', address: 'operaciones@example.com', subject: 'Documentación para la reunión', body: 'Hola,\n\nLa agenda está lista. Revisaremos las actividades pendientes y los siguientes pasos.\n\nSaludos.', folder: 'inbox', read: false, starred: false },
    { id: 'demo-3', sender: 'Equipo Indice', address: 'equipo@example.com', subject: 'Bienvenido a tu espacio de correo', body: 'Este mensaje es ficticio. Puedes buscar, destacar, archivar y guardar borradores. Los cambios se borran al recargar.', folder: 'inbox', read: true, starred: false },
    { id: 'demo-4', sender: 'Yo', address: 'cliente@example.com', subject: 'Seguimiento de nuestra conversación', body: 'Hola,\n\nTe comparto los siguientes pasos que acordamos.\n\nSaludos.', folder: 'sent', read: true, starred: false },
];
const field = 'mt-1 w-full rounded-lg border border-slate-200 bg-transparent p-3 text-sm dark:border-slate-700';
export default function CorreoEmpresarial({ onNavigate, preview = false }: {
    onNavigate?: (page?: string) => void;
    preview?: boolean;
}) {
    const [tab, setTab] = useState<'mail' | 'accounts'>('mail');
    const [messages, setMessages] = useState<Message[]>(() => preview ? examples.map(item => ({ ...item })) : []);
    const [folder, setFolder] = useState<Folder>('inbox');
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [compose, setCompose] = useState(false);
    const [recipient, setRecipient] = useState(''), [subject, setSubject] = useState(''), [body, setBody] = useState('');
    const [provider, setProvider] = useState<string | null>(null), [notice, setNotice] = useState('');
    const selected = messages.find(item => item.id === selectedId);
    const visible = messages.filter(item => item.folder === folder && `${item.sender} ${item.address} ${item.subject} ${item.body}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
    function update(patch: Partial<Message>) { setMessages(items => items.map(item => item.id === selectedId ? { ...item, ...patch } : item)); }
    function write(to = '', title = '', text = '') { setRecipient(to); setSubject(title); setBody(text); setCompose(true); }
    function saveDraft() { if (recipient.trim() || subject.trim() || body.trim()) {
        setMessages(items => [{ id: crypto.randomUUID(), sender: 'Yo', address: recipient.trim(), subject: subject.trim() || 'Sin asunto', body, folder: 'drafts', read: true, starred: false }, ...items]);
        setNotice('Borrador de prueba guardado en esta sesión.');
    } setCompose(false); }
    return <IndiceModuleShell<'mail' | 'accounts'> currentModule="email" title="Correo electrónico" subtitle="Tus conversaciones, organizadas en Indice" tone="blue" activeTab={tab} onTabChange={setTab} onNavigate={onNavigate} tabs={[{ id: 'mail', label: 'Correo', icon: <Mail className="h-4 w-4"/> }, { id: 'accounts', label: 'Cuentas conectadas', icon: <Settings className="h-4 w-4"/> }]}>
 <div className="mx-auto max-w-[1600px] space-y-4 p-4 md:p-6">
 <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">{preview ? 'Vista de prueba · mensajes ficticios · los cambios se borran al recargar. No se envían correos.' : 'Conecta tu correo para comenzar. La conexión con proveedores todavía no está disponible.'}</div>
 {notice && <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-100">{notice}</p>}
 {tab === 'accounts' ? <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-semibold">Conecta tu cuenta de correo</h2><p className="mt-2 text-sm text-slate-500">Cada cuenta será privada para su propietario.</p><div className="mt-6 grid gap-4 md:grid-cols-2">{['Google / Gmail', 'Outlook / Microsoft 365'].map(name => <article key={name} className="rounded-xl border border-slate-200 p-5 dark:border-slate-700"><Mail className="mb-4 h-7 w-7 text-blue-600"/><h3 className="font-semibold">{name}</h3><p className="my-3 text-sm text-slate-500">Autoriza el acceso desde tu proveedor de correo.</p><Button variant="outline" onClick={() => setProvider(name)}>Ver conexión</Button></article>)}</div><p className="mt-6 text-sm text-slate-500">No tienes cuentas conectadas.</p></section> :
            <section className="grid min-h-[580px] overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[210px_330px_minmax(0,1fr)]">
 <aside className="border-b border-slate-200 p-4 dark:border-slate-800 lg:border-b-0 lg:border-r"><Button className="mb-5 w-full gap-2" onClick={() => preview ? write() : setTab('accounts')}><PenLine className="h-4 w-4"/>Redactar</Button><p className="mb-3 px-3 text-xs uppercase text-slate-400">{preview ? 'Buzón de demostración' : 'Mi correo'}</p><nav aria-label="Carpetas de correo" className="flex gap-1 overflow-x-auto lg:flex-col">{folders.map(item => <button key={item.id} aria-current={folder === item.id ? 'page' : undefined} onClick={() => { setFolder(item.id); setSelectedId(null); }} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-3 text-left text-sm ${folder === item.id ? 'bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Inbox className="h-4 w-4"/>{item.label}<span className="ml-auto text-xs">{messages.filter(message => message.folder === item.id).length}</span></button>)}</nav><button className="mt-6 px-3 text-sm text-blue-600" onClick={() => setTab('accounts')}>Administrar cuentas</button></aside>
 <div className={`${selected ? 'hidden lg:block' : ''} border-b border-slate-200 dark:border-slate-800 lg:border-b-0 lg:border-r`}><div className="border-b border-slate-100 p-4 dark:border-slate-800"><h2 className="mb-3 font-semibold">{folders.find(item => item.id === folder)?.label}</h2><label className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 dark:bg-slate-800"><Search className="h-4 w-4 text-slate-400"/><input aria-label="Buscar correo" placeholder="Buscar en esta carpeta" value={query} onChange={event => setQuery(event.target.value)} className="min-w-0 w-full bg-transparent py-3 text-sm outline-none"/></label></div><div className="max-h-[650px] overflow-y-auto">{!visible.length && <p className="p-6 text-sm text-slate-500">{query ? 'No hay resultados para esta búsqueda.' : 'No hay mensajes en esta carpeta.'}</p>}{visible.map(message => <button key={message.id} onClick={() => { setSelectedId(message.id); setMessages(items => items.map(item => item.id === message.id ? { ...item, read: true } : item)); }} className={`w-full border-b border-slate-100 p-4 text-left dark:border-slate-800 ${selectedId === message.id ? 'bg-blue-50 dark:bg-blue-950' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}><div className="flex items-center gap-2"><span className={`flex-1 truncate text-sm ${message.read ? 'font-medium' : 'font-bold'}`}>{message.folder === 'sent' ? `Para: ${message.address}` : message.sender}</span>{!message.read && <span aria-label="No leído" className="h-2 w-2 rounded-full bg-blue-600"/>}{message.starred && <span aria-label="Destacado">★</span>}</div><p className="mt-2 truncate text-sm font-medium">{message.subject}</p><p className="mt-1 truncate text-xs text-slate-500">{message.body}</p></button>)}</div></div>
 <article className={`${selected ? '' : 'hidden lg:flex'} min-w-0 flex-col p-5 md:p-7`}>{selected ? <><div className="mb-7 flex flex-wrap gap-2"><Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>Volver</Button><Button size="sm" variant="outline" onClick={() => update({ starred: !selected.starred })}>{selected.starred ? 'Quitar destacado' : 'Destacar'}</Button><Button size="sm" variant="outline" onClick={() => { update({ read: false }); setSelectedId(null); }}>Marcar no leído</Button><Button size="sm" variant="outline" onClick={() => { update({ folder: folder === 'archive' || folder === 'trash' ? 'inbox' : 'archive' }); setSelectedId(null); }}>{folder === 'archive' || folder === 'trash' ? 'Mover a entrada' : 'Archivar'}</Button>{folder !== 'trash' && <Button size="sm" variant="ghost" onClick={() => { update({ folder: 'trash' }); setSelectedId(null); }}>A papelera</Button>}</div><h2 className="text-xl font-semibold">{selected.subject}</h2><div className="my-5 border-b border-slate-100 pb-5 text-sm dark:border-slate-800"><p className="font-medium">{selected.sender}</p><p className="mt-1 text-slate-500">{selected.address}</p></div><p className="whitespace-pre-wrap text-sm leading-7">{selected.body}</p><div className="mt-10 flex flex-wrap gap-2"><Button variant="outline" onClick={() => write(folder === 'inbox' ? selected.address : '', `Re: ${selected.subject}`)}>Responder</Button><Button variant="outline" onClick={() => write('', `Fwd: ${selected.subject}`, `\n\n----- Mensaje original -----\n${selected.body}`)}>Reenviar</Button>{folder === 'drafts' && <Button variant="outline" onClick={() => write(selected.address, selected.subject, selected.body)}>Editar copia</Button>}</div></> : <div className="m-auto max-w-xs py-16 text-center"><Mail className="mx-auto mb-4 h-12 w-12 text-blue-200"/><h2 className="font-semibold">Tu correo, en un solo lugar</h2><p className="mt-2 text-sm text-slate-500">{preview ? 'Selecciona un mensaje para leerlo o redacta un correo de prueba.' : 'Conecta una cuenta para gestionar tus conversaciones.'}</p></div>}</article></section>}
 </div>
 <Dialog open={compose} onOpenChange={setCompose}><DialogContent><DialogHeader><DialogTitle>Nuevo correo de prueba</DialogTitle><DialogDescription>Esta vista no envía correos. Guarda un borrador para revisar el flujo.</DialogDescription></DialogHeader><div className="space-y-4"><label className="block text-sm">Para<input className={field} type="email" value={recipient} onChange={event => setRecipient(event.target.value)}/></label><label className="block text-sm">Asunto<input className={field} value={subject} onChange={event => setSubject(event.target.value)}/></label><label className="block text-sm">Mensaje<textarea className={`${field} min-h-40`} value={body} onChange={event => setBody(event.target.value)}/></label><p className="text-xs text-slate-500">Los adjuntos estarán disponibles al integrar el proveedor.</p><div className="flex gap-2"><Button onClick={saveDraft}>Guardar borrador</Button><Button variant="outline" onClick={() => setCompose(false)}>Descartar</Button></div></div></DialogContent></Dialog>
 <Dialog open={Boolean(provider)} onOpenChange={open => { if (!open)
        setProvider(null); }}><DialogContent><DialogHeader><DialogTitle>Conectar {provider}</DialogTitle><DialogDescription>La integración aún no está habilitada. El siguiente paso será configurar la autorización OAuth del proveedor. No ingreses contraseñas aquí.</DialogDescription></DialogHeader><Button onClick={() => setProvider(null)}>Entendido</Button></DialogContent></Dialog>
 </IndiceModuleShell>;
}
