import { useCallback, useEffect, useId, useState } from "react";
import { useBlocker } from "react-router";
import { IndiceTitleBar } from "../../../components/frontend-os/IndiceTitleBar";
import { IndiceWorkspaceNavigation } from "../../../components/frontend-os/IndiceWorkspaceNavigation";
import { IndiceConfirmationDialog } from "../../../components/indice-modal/IndiceConfirmationDialog";
import { meetingApi, type Agreement, type MeetingDetail as Detail, type MeetingStatus } from "../services/meetingApi";
import type { MeetingCopy } from "../translations/meetingCopy";
import { getMeetingSessionCopy } from "../translations/meetingSessionCopy";
import { getMeetingOperationsCopy } from "../translations/meetingOperationsCopy";
import { getMeetingLiveCopy } from "../translations/meetingLiveCopy";
import { getMeetingVotingCopy } from "../translations/meetingVotingCopy";
import { Action, Feedback, Field, Status, control, panel, useMeetingQuery } from "./MeetingPrimitives";
import { MeetingAttendance, MeetingAgreementsSummary } from "./MeetingExecution";
import { MeetingVotingPanel } from "./MeetingVotingPanel";
import { MeetingVotingEditor } from "./MeetingVotingEditor";
import { MeetingVotingWorkspace } from "./MeetingVotingWorkspace";
import { AgreementDetail, AgreementEditor, FollowupEditor } from "./AgreementEditors";
import { MeetingEditor, MinutesEditor, TransitionEditor } from "./MeetingEditors";
import { useMeetingMinutesDraft } from "./useMeetingMinutesDraft";
import { printMeetingMinutes } from "../utils/meetingPrintDocument";

type Props = { id: number; copy: MeetingCopy; locale: string; userId: number; administrator: boolean; onChangeMeeting: () => void; onAgreements?: (id: number) => void };
type Dialog = { kind: "edit" | "addendum" | "agreement-new" | "ballot-new" } | { kind: "status"; status: MeetingStatus } | { kind: "ballot"; id: number } | { kind: "agreement"; id: number } | { kind: "agreement-edit" | "agreement-note"; record: Agreement } | { kind: "agreement-from-vote"; title: string };
export function MeetingSessionWorkspace(props: Props) {
  const { id, copy, locale } = props, c = getMeetingSessionCopy(locale);
  const query = useMeetingQuery(useCallback(signal => meetingApi.detail(id, signal), [id]));
  const [notice, setNotice] = useState(""), [section, setSection] = useState("minutes");
  return <div className="min-w-0 space-y-5 [&_button]:scroll-mt-52 [&_textarea]:scroll-mt-52 [&_select]:scroll-mt-52" data-meeting-session>
    {query.loading ? <Feedback>{copy.loading}</Feedback> : query.error ? <>
      <IndiceTitleBar tone="blue" icon="📝" title={c.title} subtitle={c.hint} actions={<Action onClick={props.onChangeMeeting}>{c.change}</Action>} />
      <Feedback error>{copy.error}<Action onClick={query.reload}>{copy.refresh}</Action></Feedback>
    </> : query.data && <LoadedMeetingSession {...props} detail={query.data} section={section} setSection={setSection} notice={notice} onReload={() => { setNotice(""); query.reload(); }} onSaved={(message = "") => { setNotice(message); query.reload(); }} />}
  </div>;
}
function LoadedMeetingSession({ detail, notice, section, setSection, onReload, onSaved, ...props }: Props & { detail: Detail; notice: string; section: string; setSection: (value: string) => void; onReload: () => void; onSaved: (message?: string) => void }) {
  const { copy, locale, userId, administrator, onAgreements, onChangeMeeting } = props;
  const c = getMeetingSessionCopy(locale), op = getMeetingOperationsCopy(locale), v = getMeetingVotingCopy(locale), live = getMeetingLiveCopy(locale);
  const row = detail.meeting, canManage = administrator || row.ownerId === userId;
  const active = row.status === "PLANNED" || row.status === "IN_PROGRESS";
  const canWrite = canManage || detail.planning?.minutesOwner.id === userId;
  const notes = useMeetingMinutesDraft(detail, canWrite && active, () => onSaved(c.saved));
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [attendanceDirty, setAttendanceDirty] = useState(false), [attendanceBusy, setAttendanceBusy] = useState(false), [discardRefresh, setDiscardRefresh] = useState(false), [copied, setCopied] = useState(false), [copyError, setCopyError] = useState(false);
  const formId = useId(), dirty = notes.dirty || attendanceDirty, busy = notes.busy || attendanceBusy;
  // Native router protection also covers module tabs, links and browser Back/Forward.
  const blocker = useBlocker(() => dirty || busy || Boolean(dialog));
  useEffect(() => { if (blocker.state === "blocked" && (busy || dialog)) blocker.reset(); }, [blocker.state, busy, dialog]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty || busy || dialog) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", beforeUnload); return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty, busy, dialog]);
  const locked = dirty || busy || Boolean(dialog), refresh = () => { if (busy || dialog) return; if (dirty) setDiscardRefresh(true); else onReload(); };
  const finishDialog = () => { setDialog(null); onSaved(); };
  const closeDialog = () => { setDialog(null); onReload(); };
  const sections = [{ id: "agenda", label: copy.agenda, icon: "📋" }, { id: "minutes", label: copy.minutes, icon: "📝" }, { id: "attendance", label: live.attendance, icon: "👥" }, ...(onAgreements ? [{ id: "agreements", label: copy.agreements, icon: "🤝" }] : []), { id: "voting", label: v.title, icon: "🗳️" }];
  return <>
    <div className="sticky top-0 z-20 space-y-3 rounded-2xl bg-slate-50 pb-3 dark:bg-slate-950">
      <IndiceTitleBar className="p-3 sm:p-5 [&_h2]:text-lg sm:[&_h2]:text-xl" tone="blue" icon="📝" eyebrow={c.title} title={row.title} subtitle={<span className="break-words">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: row.timezone }).format(new Date(row.startAt))} · {row.timezone}</span>} actions={<div className={`grid w-full gap-2 ${canWrite && active ? "grid-cols-2" : "grid-cols-1"}`}>
        <Action className="min-w-0 whitespace-normal px-3 text-sm" disabled={busy || Boolean(dialog)} onClick={onChangeMeeting}>📅 {c.change}</Action>
        {canWrite && active && <Action primary className="min-w-0 whitespace-normal px-3 text-sm" form={formId} type="submit" disabled={!notes.dirty || busy || attendanceDirty || notes.error === "conflict" || Boolean(dialog)}>💾 {notes.busy ? c.saving : c.save}</Action>}
      </div>} />
    </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm"><div className="flex flex-wrap items-center gap-3"><Status status={row.status} copy={copy} /><span className="text-slate-600 dark:text-slate-300">👥 {row.ownerName}</span></div><p role="status" className={dirty ? "text-amber-800 dark:text-amber-300" : "text-slate-500 dark:text-slate-300"}>{busy ? c.saving : dirty ? c.unsaved : notice}</p></div>
      <IndiceWorkspaceNavigation tone="blue" variant="workbar" ariaLabel={c.title} value={section} onValueChange={setSection} items={sections} />
    <div className="flex flex-wrap gap-2" aria-label={c.context}>
      {canManage && row.status === "PLANNED" && <><Action primary disabled={locked} onClick={() => setDialog({kind:"status",status:"IN_PROGRESS"})}>▶️ {copy.begin}</Action><Action disabled={locked} onClick={() => setDialog({kind:"edit"})}>✏️ {copy.edit}</Action></>}
      {canManage && row.status === "IN_PROGRESS" && <Action primary disabled={locked || !row.hasMinutes} title={!row.hasMinutes ? copy.missingMinutes : undefined} onClick={() => setDialog({kind:"status",status:"COMPLETED"})}>✅ {copy.finish}</Action>}
      {canWrite && row.status === "COMPLETED" && <Action disabled={locked} onClick={() => setDialog({kind:"addendum"})}>📝 {op.addendum}</Action>}
      <Action disabled={locked} onClick={() => printMeetingMinutes(detail, copy, locale)}>🖨️ {op.print}</Action>
      <Action disabled={busy || Boolean(dialog)} onClick={refresh}>🔄 {copy.refresh}</Action>
      {canManage && active && <Action disabled={locked} onClick={() => setDialog({kind:"status",status:"CANCELLED"})}>{copy.cancelMeeting}</Action>}
    </div>
    {dirty && <p className="text-xs text-amber-800 dark:text-amber-300">{c.saveFirst}</p>}
    <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-5">
        <section hidden={section !== "agenda"} className={panel + " space-y-4"}><h3 className="font-medium">📋 {copy.agenda}</h3><p className="whitespace-pre-wrap break-words text-sm leading-7">{detail.agenda || c.noAgenda}</p><dl className="space-y-4 text-sm">{[[c.purpose, detail.planning?.objective], [c.expected, detail.planning?.expectedResult]].map(([label,value]) => <div key={label}><dt className="text-xs text-slate-500 dark:text-slate-300">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-6">{value || "—"}</dd></div>)}</dl></section>
        <section hidden={section !== "minutes"} className={panel + " space-y-5"} aria-label={c.notes}>
          <div><h3 className="font-medium">📝 {c.notes}</h3><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">{canWrite && active ? c.notesHint : c.readonly}</p></div>
          {notes.error && <Feedback error>{notes.error === "conflict" ? c.conflict : copy.error}
            {notes.error === "conflict" && <div className="mt-3 flex flex-wrap gap-2"><Action disabled={busy} onClick={async () => { setCopyError(false); try { await navigator.clipboard.writeText(`${copy.minutes}\n${notes.minutes}\n\n${copy.decisions}\n${notes.decisions}`); setCopied(true); } catch { setCopyError(true); } }}>{copied ? c.copied : c.copyDraft}</Action><Action onClick={refresh}>{c.reload}</Action></div>}
          </Feedback>}
          {copyError && <Feedback error>{copy.error}</Feedback>}
          <form id={formId} onSubmit={event => { event.preventDefault(); if (!attendanceDirty && !dialog) void notes.save(); }}>
            <fieldset disabled={busy || attendanceDirty || Boolean(dialog) || !notes.current} className="min-w-0 space-y-5">
              <Field label={copy.minutes}><textarea className={control + " min-h-80 h-80 resize-y py-3 leading-7"} maxLength={20000} readOnly={!canWrite || !active} value={notes.minutes} placeholder={c.notesPlaceholder} onChange={e => { notes.update("minutes", e.target.value); setCopied(false); }} /></Field>
              <Field label={copy.decisions}><textarea className={control + " min-h-40 h-40 resize-y py-3 leading-7"} maxLength={10000} readOnly={!canWrite || !active} value={notes.decisions} placeholder={c.decisionsPlaceholder} onChange={e => { notes.update("decisions", e.target.value); setCopied(false); }} /></Field>
              {canWrite && active && <Action primary type="submit" disabled={!notes.dirty || busy || notes.error === "conflict"}>💾 {notes.busy ? c.saving : c.save}</Action>}
            </fieldset>
          </form>
        </section>
        <fieldset hidden={section !== "attendance"} disabled={notes.dirty || notes.busy || Boolean(dialog)} className="min-w-0"><MeetingAttendance detail={detail} copy={copy} locale={locale} editable={canWrite && row.status === "IN_PROGRESS"} onDirty={setAttendanceDirty} onBusy={setAttendanceBusy} onSaved={() => onSaved()} /></fieldset>
        {onAgreements && <div hidden={section !== "agreements"}><MeetingAgreementsSummary id={row.id} copy={copy} locale={locale} onOpen={!locked ? () => onAgreements(row.id) : undefined} onSelect={!locked ? id => setDialog({kind:"agreement", id}) : undefined} onNew={!locked && canManage && active ? () => setDialog({kind:"agreement-new"}) : undefined} /></div>}
        <div hidden={section !== "voting"}><MeetingVotingPanel meetingId={row.id} status={row.status} copy={copy} locale={locale} onNew={!locked && canManage ? () => setDialog({kind:"ballot-new"}) : undefined} onOpen={!locked ? id => setDialog({kind:"ballot",id}) : undefined} /></div>
      </div>
      <aside className="hidden min-w-0 space-y-4 xl:block">
        <section className={panel + " space-y-3"}><h3 className="font-medium">📋 {copy.agenda}</h3><p className="text-xs leading-5 text-slate-500 dark:text-slate-300">{c.agendaHint}</p><p className="whitespace-pre-wrap break-words text-sm leading-7">{detail.agenda || c.noAgenda}</p></section>
        <details className={panel}><summary className="min-h-11 cursor-pointer text-sm font-medium">🎯 {c.context}</summary><dl className="mt-3 space-y-4 text-sm">{[[c.purpose, detail.planning?.objective], [c.expected, detail.planning?.expectedResult], [c.minutesOwner, detail.planning?.minutesOwner.name || row.ownerName], [copy.location, detail.location]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500 dark:text-slate-300">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-6">{value || "—"}</dd></div>)}</dl></details>
      </aside>
    </div>
    {(discardRefresh || blocker.state === "blocked" && !busy && !dialog) && <IndiceConfirmationDialog open tone="blue" title={copy.discard} description={c.discardHint} confirmLabel={c.discard} cancelLabel={copy.keepEditing} onCancel={() => { setDiscardRefresh(false); if (blocker.state === "blocked") blocker.reset(); }} onConfirm={() => { if (busy || dialog) return; if (blocker.state === "blocked") blocker.proceed(); else { setDiscardRefresh(false); onReload(); } }} />}
    {dialog?.kind === "status" && <TransitionEditor copy={copy} meeting={detail} status={dialog.status} canAgreements={Boolean(onAgreements)} onClose={() => setDialog(null)} onSaved={finishDialog} />}
    {dialog?.kind === "edit" && <MeetingEditor copy={copy} initial={detail} userId={userId} administrator={administrator} onClose={() => setDialog(null)} onSaved={finishDialog} />}
    {dialog?.kind === "addendum" && <MinutesEditor copy={copy} detail={detail} onClose={() => setDialog(null)} onSaved={finishDialog} />}
    {(dialog?.kind === "agreement-new" || dialog?.kind === "agreement-from-vote") && onAgreements && <AgreementEditor copy={copy} meetingId={row.id} suggestedTitle={dialog.kind === "agreement-from-vote" ? dialog.title : undefined} onClose={() => setDialog(null)} onSaved={finishDialog} />}
    {dialog?.kind === "agreement" && onAgreements && <AgreementDetail id={dialog.id} copy={copy} locale={locale} userId={userId} administrator={administrator} onClose={closeDialog} onEdit={record => setDialog({kind:"agreement-edit",record})} onNote={record => setDialog({kind:"agreement-note",record})} />}
    {dialog?.kind === "agreement-edit" && onAgreements && <AgreementEditor copy={copy} record={dialog.record} onClose={() => setDialog({kind:"agreement",id:dialog.record.id})} onSaved={finishDialog} />}
    {dialog?.kind === "agreement-note" && onAgreements && <FollowupEditor copy={copy} agreement={dialog.record} onClose={() => setDialog({kind:"agreement",id:dialog.record.id})} onSaved={finishDialog} />}
    {dialog?.kind === "ballot-new" && <MeetingVotingEditor meetingId={row.id} locale={locale} copy={copy} onClose={() => setDialog(null)} onOpened={id => setDialog({kind:"ballot",id})} />}
    {dialog?.kind === "ballot" && <MeetingVotingWorkspace meetingId={row.id} id={dialog.id} locale={locale} copy={copy} canManage={canManage} onClose={closeDialog} onAgreement={onAgreements ? title => setDialog({kind:"agreement-from-vote",title}) : undefined} />}
  </>;
}
