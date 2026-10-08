import { useState } from 'react';
import { schedulingApi, type Event } from '../services/schedulingApi';
import type { SchedulingCopy } from '../translations/schedulingCopy';
import { controlClass, EditorFrame, Field } from './SchedulingPrimitives';
import { schedulingEmoji } from '../utils/schedulingIdentity';

export function EventCancellation({ event, copy, onClose, onSaved }: { event: Event; copy: SchedulingCopy; onClose: () => void; onSaved: () => void }) {
  const [reason, setReason] = useState('');
  return <EditorFrame icon={schedulingEmoji.events} title={`${copy.cancelEvent}: ${event.title}`} description={copy.cancelEventHint} copy={copy}
    onClose={onClose} onSaved={onSaved} onSave={() => schedulingApi.cancelEvent(event, reason)}>
    <Field label={copy.reason}><textarea required maxLength={500} className={`${controlClass} min-h-28`} value={reason} onChange={e => setReason(e.target.value)} /></Field>
  </EditorFrame>;
}
