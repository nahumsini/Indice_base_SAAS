import { useCallback, useEffect, useId, useRef, useState } from "react";
import { IndiceModalFrame, IndiceModalWizardStepper } from "../../../components/indice-modal";
import { getAuthorizationRevision } from "../../../api/authSessionStore";
import { useAuthorizationRevision } from "../../../hooks/useAuthorizationRevision";
import { meetingVotingApi, type OpenBallotRequest, type VotingRule } from "../services/meetingVotingApi";
import { getMeetingVotingCopy } from "../translations/meetingVotingCopy";
import type { MeetingCopy } from "../translations/meetingCopy";
import { votingError, votingPreview } from "../utils/meetingVoting";
import { Action, Field, Feedback, control, panel, useMeetingQuery } from "./MeetingPrimitives";

export function MeetingVotingEditor({ meetingId, locale, copy, onClose, onOpened }: {
  meetingId: number; locale: string; copy: MeetingCopy; onClose: () => void; onOpened: (id: number) => void;
}) {
  const v = getMeetingVotingCopy(locale), id = useId(), ref = useRef<HTMLFormElement>(null);
  const team = useMeetingQuery(useCallback(signal => meetingVotingApi.team(meetingId, signal), [meetingId]));
  const [form, setForm] = useState<OpenBallotRequest>({subject: "", description: "", approvalRule: "MAJORITY", quorumRule: "MAJORITY", roles: [
    {key: "director", name: v.director, weight: 3}, {key: "lead", name: v.lead, weight: 2}, {key: "member", name: v.member, weight: 1}, {key: "guest", name: v.guest, weight: 0},
  ], voters: []});
  const [step, setStep] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState(""), [dirty, setDirty] = useState(false), [discard, setDiscard] = useState(false);
  const auth = useAuthorizationRevision(), openedAuth = useRef(auth), restoredSetup = useRef(false), key = useRef({body: "", key: ""});
  useEffect(() => { if (auth !== openedAuth.current) onClose(); }, [auth]);
  useEffect(() => {
    if (!team.data) return;
    const data = team.data, previous = !restoredSetup.current ? data.previous : null;
    restoredSetup.current = true;
    setForm(f => {
      const roles = previous?.roles ?? f.roles;
      const assignments = previous?.assignments ?? f.voters;
      const zero = roles.find(r => r.weight === 0)?.key ?? "";
      return {...f, roles, approvalRule: previous?.approvalRule ?? f.approvalRule, quorumRule: previous?.quorumRule ?? f.quorumRule,
        voters: data.people.map(person => {
          const assigned = assignments.find(a => a.userId === person.userId)?.roleKey;
          const role = roles.find(r => r.key === assigned);
          return {userId: person.userId, roleKey: !person.eligible ? zero : role?.key ?? (previous ? "" : "member")};
        })};
    });
  }, [team.data]);
  const close = () => { if (!busy) { if (dirty) setDiscard(true); else onClose(); } };
  const update = (patch: Partial<OpenBallotRequest>) => { setForm(f => ({...f, ...patch})); setDirty(true); setError(""); };
  let preview: ReturnType<typeof votingPreview> | undefined;
  try { preview = votingPreview(form, team.data?.people ?? []); } catch { /* Draft validation is explained when reviewing. */ }
  const review = () => {
    if (!ref.current?.reportValidity() || !team.data) return;
    try { votingPreview(form, team.data.people); setError(""); setStep(1); }
    catch (e) { setError(votingError(e, v, copy.error, copy.conflict)); }
  };
  const submit = async () => {
    if (busy || !preview || !team.data || openedAuth.current !== getAuthorizationRevision()) return;
    setBusy(true); setError("");
    try {
      votingPreview(form, team.data.people);
      const body = {...form, subject: form.subject.trim(), description: form.description.trim(), roles: form.roles.map(r => ({...r, name: r.name.trim()}))};
      const value = JSON.stringify(body);
      if (key.current.body !== value) key.current = {body: value, key: crypto.randomUUID()};
      const result = await meetingVotingApi.open(meetingId, body, key.current.key);
      if (openedAuth.current === getAuthorizationRevision()) onOpened(result.ballot.id);
    } catch (e) { if (openedAuth.current === getAuthorizationRevision()) setError(votingError(e, v, copy.error, copy.conflict)); }
    finally { setBusy(false); }
  };
  return <IndiceModalFrame open tone="blue" icon="🗳️" busy={busy} modalType={discard ? "confirmation" : "wizard"} title={discard ? copy.discard : v.newVote} description={discard ? copy.subtitle : v.hint} contentClassName="max-h-[calc(100dvh-1rem)]" onOpenChange={open => { if (!open) close(); }} closeLabel={copy.close}
    footer={discard ? <><Action onClick={() => setDiscard(false)}>{copy.keepEditing}</Action><Action onClick={onClose}>{copy.close}</Action></> : <><Action disabled={busy} onClick={step ? () => setStep(0) : close}>{step ? v.back : copy.cancel}</Action><Action primary disabled={busy || team.loading || team.error} onClick={step ? () => void submit() : review}>{busy ? copy.loading : step ? v.open : v.review}</Action></>}>
    <div hidden={discard} className="space-y-5">
      <IndiceModalWizardStepper accent="blue" density="compact" activeStepId={String(step)} progressLabel={v.newVote} steps={[{id: "0", label: v.configure}, {id: "1", label: v.review}]} />
      {error && <Feedback error>{error}<Action disabled={busy} onClick={() => { setStep(0); team.reload(); }}>{copy.refresh}</Action></Feedback>}
      {team.loading ? <Feedback>{copy.loading}</Feedback> : team.error ? <Feedback error>{copy.error}</Feedback> : team.data && <form id={id} ref={ref} className="min-w-0 space-y-5" onSubmit={e => { e.preventDefault(); if (step) void submit(); else review(); }}>
        <fieldset disabled={busy} className="min-w-0 space-y-5">
          {step === 0 ? <>
            <Field label={v.subject + " *"}><input className={control} value={form.subject} required maxLength={240} placeholder={v.subjectExample} onChange={e => update({subject: e.target.value})} /></Field>
            <Field label={v.description}><textarea className={control + " h-24 py-3"} value={form.description} maxLength={3000} onChange={e => update({description: e.target.value})} /></Field>
            {team.data.previous && <Feedback>{v.reuseHint}</Feedback>}
            <section className={panel + " space-y-4"}><h3 className="text-sm font-medium">⚖️ {v.roles}</h3><p className="text-xs leading-5 text-slate-500 dark:text-slate-300">{v.roleHint}</p>
              {form.roles.map((role, index) => <div key={role.key} className="grid grid-cols-[minmax(0,1fr)_90px_44px] items-end gap-2">
                <Field label={v.role}><input className={control} aria-label={`${v.role} ${index + 1}`} value={role.name} required maxLength={60} onChange={e => update({roles: form.roles.map(r => r.key === role.key ? {...r, name: e.target.value} : r)})} /></Field>
                <Field label={v.points}><input className={control} aria-label={`${v.points}: ${role.name}`} type="number" inputMode="numeric" min={0} max={1000} step={1} required value={role.weight} onChange={e => update({roles: form.roles.map(r => r.key === role.key ? {...r, weight: Number(e.target.value)} : r)})} /></Field>
                <Action aria-label={`${v.removeRole}: ${role.name}`} disabled={form.roles.length === 1} className="px-2" onClick={() => { const roles = form.roles.filter(r => r.key !== role.key); update({roles, voters: form.voters.map(p => p.roleKey === role.key ? {...p, roleKey: ""} : p)}); }}>×</Action>
              </div>)}
              <Action disabled={form.roles.length >= 12} onClick={() => update({roles: [...form.roles, {key: `r-${crypto.randomUUID().slice(0,8)}`, name: v.newRole, weight: 1}]})}>＋ {v.addRole}</Action>
            </section>
            <section className={panel + " space-y-4"}><h3 className="text-sm font-medium">👥 {v.team}</h3>{team.data.people.map(person => <div key={person.userId} className="grid min-w-0 gap-2 border-b border-slate-100 pb-3 last:border-0 dark:border-slate-700 sm:grid-cols-2">
              <div><p className="break-words text-sm font-medium">{person.name}</p>{!person.eligible && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{v.unavailable}</p>}</div>
              <Field label={v.role}><select required aria-label={`${v.role}: ${person.name}`} className={control} value={form.voters.find(a => a.userId === person.userId)?.roleKey ?? ""} onChange={e => update({voters: form.voters.map(a => a.userId === person.userId ? {...a, roleKey: e.target.value} : a)})}><option value="">—</option>{form.roles.map(role => <option key={role.key} value={role.key} disabled={!person.eligible && role.weight > 0}>{role.name} · {role.weight} {v.points}</option>)}</select></Field>
            </div>)}</section>
            <section className="space-y-4"><h3 className="text-sm font-medium">📏 {v.rules}</h3><div className="grid gap-4 sm:grid-cols-2">{(["approvalRule", "quorumRule"] as const).map(field => <Field key={field} label={field === "approvalRule" ? v.approval : v.quorum}><select className={control} value={form[field]} onChange={e => update({[field]: e.target.value as VotingRule})}>{(["MAJORITY", "TWO_THIRDS", "ALL"] as const).map(rule => <option key={rule} value={rule}>{v[rule]}</option>)}</select></Field>)}</div><p className="text-xs leading-5 text-slate-500 dark:text-slate-300">{v.ruleHint}</p></section>
          </> : <>
            <h3 className="break-words text-lg font-medium">{form.subject}</h3>{form.description && <p className="whitespace-pre-wrap break-words text-sm">{form.description}</p>}
            {preview && <dl className="grid gap-3 sm:grid-cols-3">{[[v.total, preview.total], [v.approval, preview.approval], [v.quorum, preview.quorum]].map(([label, count]) => <div key={label} className="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950"><dt className="text-xs">{label}</dt><dd className="mt-1 text-xl font-medium">{count} {v.points}</dd></div>)}</dl>}
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">{team.data.people.map(person => { const role = form.roles.find(r => r.key === form.voters.find(a => a.userId === person.userId)?.roleKey); return <li key={person.userId} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><span className="min-w-0 flex-1 break-words">{person.name}</span><span>{role?.name} · {role?.weight} {v.points}</span></li>; })}</ul>
            <Feedback>{v.frozen}</Feedback><p className="text-xs leading-5 text-slate-500 dark:text-slate-300">{v.ruleHint}</p>
          </>}
        </fieldset>
      </form>}
    </div>
  </IndiceModalFrame>;
}
