import { useState } from 'react';
import { schedulingApi, type Reservation, type Staff } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { controlClass, EditorFrame, Field } from './SchedulingPrimitives';

export type ManagementAction = 'REASSIGN' | 'PAUSE' | 'RESUME' | 'ARCHIVE';
export function ReservationManagement({ record, action, staff, copy, onClose, onSaved }: {
  record: Reservation; action: ManagementAction; staff: Pick<Staff,'id'|'publicName'|'active'>[]; copy: SchedulingCopy; onClose: () => void; onSaved: () => void;
}) {
  const [staffId,setStaffId]=useState(0),[reason,setReason]=useState('');
  const title={REASSIGN:copy.reassign,PAUSE:copy.pause,RESUME:copy.resume,ARCHIVE:copy.remove}[action];
  return <EditorFrame title={title} description={action==='ARCHIVE'?copy.removeHint:action==='REASSIGN'?copy.reassignHint:copy.pauseHint} copy={copy}
    modalType={action==='REASSIGN'?'standard-form':'confirmation'} saveLabel={title} destructive={action==='ARCHIVE'} onClose={onClose} onSaved={onSaved}
    onSave={()=>action==='REASSIGN'?schedulingApi.reassign(record,staffId,reason):schedulingApi.manage(record,action,reason)}>
    <p className="text-sm font-medium">{record.attendeeName} · {record.serviceName}</p>
    {action==='REASSIGN' && <Field label={copy.collaborator}><select required className={controlClass} value={staffId||''} onChange={event=>setStaffId(Number(event.target.value))}>
      <option value="">{copy.selectOption}</option>{staff.filter(item=>item.active&&item.id!==record.staffId).map(item=><option key={item.id} value={item.id}>{item.publicName}</option>)}
    </select></Field>}
    <Field label={copy.managementReason}><textarea required maxLength={500} className={`${controlClass} h-24 py-3`} value={reason} onChange={event=>setReason(event.target.value)}/></Field>
  </EditorFrame>;
}
