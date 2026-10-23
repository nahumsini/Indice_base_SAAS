import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Globe2, RefreshCw } from 'lucide-react';
import { IndiceModalFrame } from '../../../components/indice-modal/IndiceModalFrame';
import { useAuthorizationRevision } from '../../../hooks/useAuthorizationRevision';
import { useLanguage } from '../../../shared/context';
import { useSchedulingQuery } from '../hooks/useSchedulingQuery';
import { schedulingApi, type BookingPage } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { getPublicAgendaManagerCopy } from '../translations/publicAgendaManagerCopy';
import { PageEditor, type PageEditorSnapshot } from './PageEditor';
import { PublicAgendaManager } from './PublicAgendaManager';
import { PublicAgendaPreview } from './PublicAgendaPreview';
import { AgendaConfigurationModal, type AgendaConfigurationSection } from './AgendaConfigurationModal';
import { ActionButton, EditorFrame, Feedback } from './SchedulingPrimitives';
import { defaultAppearance } from '../utils/publicAppearance';
import { schedulingEmoji, schedulingTone } from '../utils/schedulingIdentity';

async function loadConfiguration(signal: AbortSignal) {
  const [pages,readiness,staff,services] = await Promise.all([schedulingApi.pages(signal),schedulingApi.readiness(signal),schedulingApi.staff(signal),schedulingApi.services(signal)]);
  return {pages,readiness,staff,services};
}
type Screen = {type:'manage'} | {type:'edit';page:BookingPage|null;alias:string} | {type:'preview'|'unpublish';page:BookingPage};
/** Administration, wizard and confirmation replace one another; never stack native frames. */
export function PublicAgendaModal({copy,onClose}:{copy:SchedulingCopy;onClose:()=>void}) {
  const {currentLanguage} = useLanguage(), locale=currentLanguage.code, text=getPublicAgendaManagerCopy(locale);
  const auth = useAuthorizationRevision(), openedAuth = useRef(auth);
  const [section,setSection] = useState<AgendaConfigurationSection | null>(null), snapshot = useRef<PageEditorSnapshot | undefined>(undefined);
  const [screen,setScreen] = useState<Screen>({type:'manage'}), [notice,setNotice] = useState('');
  const query = useSchedulingQuery(useCallback(loadConfiguration,[])), previous = useRef<Awaited<ReturnType<typeof loadConfiguration>> | undefined>(undefined);
  useEffect(() => { if (auth !== openedAuth.current) onClose(); },[auth,onClose]);
  if (auth !== openedAuth.current) return null;
  if (query.data) previous.current = query.data;
  const data = query.data ?? previous.current, busy=query.loading || query.error;
  const manage = () => {snapshot.current=undefined;setScreen({type:'manage'});};
  const saved = (message:string) => {manage();setNotice(message);query.reload();};
  const edit = (page:BookingPage|null) => {
    snapshot.current=undefined;setNotice('');
    const alias=page?.alias ?? `${(data?.readiness.suggestedAlias || 'agenda').slice(0,65)}-${crypto.randomUUID().slice(0,8)}`;
    setScreen({type:'edit',page,alias});
  };
  if (section) return <AgendaConfigurationModal key={section} section={section} copy={copy} locale={locale} onChanged={query.reload} onClose={() => {setSection(null);query.reload();}}/>;
  if (data && screen.type === 'edit') return <PageEditor key={screen.page?.id ?? 'new-agenda'} managed page={screen.page} staff={data.staff} services={data.services} publicAccessEnabled={data.readiness.publicAccessEnabled}
    readiness={{...data.readiness,suggestedAlias:screen.alias}} copy={copy} onClose={manage} onSaved={() => saved(text.saved)} initialSnapshot={snapshot.current}
    onPersist={body => screen.page ? schedulingApi.updatePage(screen.page.id,body) : schedulingApi.createPage(body)}
    checking={query.loading} checkError={query.error} onRefresh={query.reload} onConfigure={(next,draft) => {snapshot.current=draft;setSection(next);}}/>;
  if (screen.type === 'unpublish') return <EditorFrame title={text.unpublishTitle} description={text.unpublishHint} icon={schedulingEmoji.publicAgenda} modalType="confirmation" copy={copy}
    saveLabel={text.unpublish} onClose={manage} onSaved={() => saved(text.unpublished)} onSave={() => schedulingApi.updatePage(screen.page.id,{alias:screen.page.alias,title:screen.page.title,description:screen.page.description,appearance:screen.page.appearance,version:screen.page.version,published:false})}>
    <p className="break-words text-sm font-medium">{screen.page.title}</p><p className="break-all text-xs text-slate-500">{screen.page.publicUrl}</p>
  </EditorFrame>;
  if (data && screen.type === 'preview') return <IndiceModalFrame open tone={schedulingTone} modalType="operational-workspace" title={text.preview} description={screen.page.title}
    icon={<span className="text-xl">{schedulingEmoji.publicAgenda}</span>} closeLabel={copy.close} onOpenChange={open => {if(!open)manage();}}
    footerLeading={<ActionButton onClick={manage}><ArrowLeft aria-hidden className="h-4 w-4"/>{text.back}</ActionButton>}
    footer={<ActionButton primary onClick={() => edit(screen.page)}>{copy.edit}</ActionButton>}>
    <PublicAgendaPreview {...screen.page} appearance={{...defaultAppearance,...screen.page.appearance}} copy={copy} locale={locale} mobile={false}
      catalog={{...screen.page,appearance:screen.page.appearance,services:data.services.filter(item=>item.active),staff:data.staff.filter(item=>item.active),events:[]}}/>
  </IndiceModalFrame>;
  return <IndiceModalFrame open tone={schedulingTone} modalType="operational-workspace" title={text.title} description={text.hint}
    contentClassName="group/agenda-manager !h-[min(90dvh,900px)] sm:!max-w-[56rem] data-[dialog-compact-viewport=true]:!overflow-hidden" bodyClassName="!bg-slate-50/70 !p-4 sm:!p-5 dark:!bg-slate-950/40 group-data-[dialog-compact-viewport=true]/agenda-manager:!flex-[1_1_0%] group-data-[dialog-compact-viewport=true]/agenda-manager:!overflow-y-auto"
    icon={<Globe2 className="h-5 w-5"/>} iconPresentation="original" closeLabel={copy.close}
    onOpenChange={open=>{if(!open)onClose();}}
    footerSummary={notice ? <span role="status">{notice}</span> : undefined}
    footer={<><ActionButton aria-label={copy.refresh} title={copy.refresh} disabled={query.loading} onClick={query.reload} className="min-w-11 !px-3"><RefreshCw aria-hidden className={`h-4 w-4 ${query.loading ? 'animate-spin' : ''}`}/>{copy.refresh}</ActionButton><ActionButton onClick={onClose}>{copy.close}</ActionButton></>}>
    {query.error && <Feedback error>{copy.error}<ActionButton onClick={query.reload}>{copy.retry}</ActionButton></Feedback>}
    {!data && !query.error && <Feedback>{copy.loading}</Feedback>}
    {data && <PublicAgendaManager pages={data.pages} staff={data.staff} copy={copy} locale={locale} publicAccessEnabled={data.readiness.publicAccessEnabled} disabled={busy} onCreate={() => edit(null)} onEdit={edit}
      onPreview={page=>setScreen({type:'preview',page})} onUnpublish={page=>setScreen({type:'unpublish',page})}/>}
  </IndiceModalFrame>;
}
