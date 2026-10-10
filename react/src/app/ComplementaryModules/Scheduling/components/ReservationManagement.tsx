import { useState } from 'react';
import { schedulingApi, type Reservation, type Staff } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { controlClass, EditorFrame, Field } from './SchedulingPrimitives';
import { useLanguage } from '../../../shared/context';
import { getSchedulingOperationsCopy } from '../translations/schedulingOperationsCopy';

export type ManagementAction = 'REASSIGN' | 'RESCHEDULE' | 'PAUSE' | 'RESUME' | 'ARCHIVE';
export function ReservationManagement({ record, action, staff, copy, onClose, onSaved }: {
  record: Reservation; action: ManagementAction; staff: Pick<Staff,'id'|'publicName'|'active'>[]; copy: SchedulingCopy; onClose: () => void; onSaved: () => void;
}) {
  const [staffId,setStaffId]=useState(0),[reason,setReason]=useState('');
  const { currentLanguage } = useLanguage(), op = getSchedulingOperationsCopy(currentLanguage.code);
  const [startAt, setStartAt] = useState(new Date(new Date(record.startAt).getTime() - new Date(record.startAt).getTimezoneOffset() * 60000).toISOString().slice(0,16));
  const title={REASSIGN:copy.reassign,RESCHEDULE:op.reschedule,PAUSE:copy.pause,RESUME:copy.resume,ARCHIVE:copy.remove}[action];
  return <EditorFrame title={title} description={action==='RESCHEDULE'?op.reason:action==='ARCHIVE'?copy.removeHint:action==='REASSIGN'?copy.reassignHint:copy.pauseHint} copy={copy}
    modalType={action==='REASSIGN'||action==='RESCHEDULE'?'standard-form':'confirmation'} saveLabel={title} destructive={action==='ARCHIVE'} onClose={onClose} onSaved={onSaved}
    onSave={()=>action==='RESCHEDULE'?schedulingApi.reschedule(record,new Date(startAt).toISOString(),reason):action==='REASSIGN'?schedulingApi.reassign(record,staffId,reason):schedulingApi.manage(record,action,reason)}>
    <p className="text-sm font-medium">{record.attendeeName} · {record.serviceName}</p>
    {action==='RESCHEDULE' && <Field label={copy.date + ' · ' + Intl.DateTimeFormat().resolvedOptions().timeZone}><input className={controlClass} type="datetime-local" required value={startAt} onChange={e=>setStartAt(e.target.value)}/></Field>}
    {action==='REASSIGN' && <Field label={copy.collaborator}><select required className={controlClass} value={staffId||''} onChange={event=>setStaffId(Number(event.target.value))}>
      <option value="">{copy.selectOption}</option>{staff.filter(item=>item.active&&item.id!==record.staffId).map(item=><option key={item.id} value={item.id}>{item.publicName}</option>)}
    </select></Field>}
    <Field label={copy.managementReason}><textarea required maxLength={500} className={`${controlClass} h-24 py-3`} value={reason} onChange={event=>setReason(event.target.value)}/></Field>
  </EditorFrame>;
}
