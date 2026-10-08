import { useCallback } from 'react';
import { IndiceModalFrame } from '../../../components/indice-modal/IndiceModalFrame';
import { useSchedulingQuery } from '../hooks/useSchedulingQuery';
import { schedulingApi } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { PageEditor } from './PageEditor';
import { ActionButton, Feedback } from './SchedulingPrimitives';
import { schedulingEmoji, schedulingTone } from '../utils/schedulingIdentity';
export function PublicAgendaModal({copy,onClose}:{copy:SchedulingCopy;onClose:()=>void}){
  const query=useSchedulingQuery(useCallback(async signal=>{
    const [page,readiness,staff]=await Promise.all([schedulingApi.page(signal),schedulingApi.readiness(signal),schedulingApi.staff(signal)]);
    return {page,readiness,staff};
  },[]));
  if(query.data)return <PageEditor page={query.data.page} staff={query.data.staff} publicAccessEnabled={query.data.readiness.publicAccessEnabled} copy={copy} onClose={onClose} onSaved={onClose}/>;
  return <IndiceModalFrame open tone={schedulingTone} modalType="operational-workspace" title={copy.publicAgenda} description={copy.publicAgendaHint} icon={<span className="text-xl leading-none">{schedulingEmoji.publicAgenda}</span>}
    onOpenChange={open=>{if(!open)onClose();}} footer={<ActionButton onClick={onClose}>{copy.close}</ActionButton>}>
    <Feedback error={query.error}>{query.error?copy.error:copy.loading}</Feedback>{query.error&&<ActionButton onClick={query.reload}>{copy.retry}</ActionButton>}
  </IndiceModalFrame>;
}
