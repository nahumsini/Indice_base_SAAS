import { useTrainingExamCopy } from "./translations/exam/useTrainingExamCopy";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Award, Check, ChevronLeft, ChevronRight, Clock3, Download, Flag, LoaderCircle, LockKeyhole, RotateCcw, Send, ShieldCheck } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { downloadTrainingCertificate, type TrainingCertificate } from './trainingCertificatePdf';

export type ExamStatus = {
  code: string;
  question_count: number;
  duration_minutes: number;
  pass_score: number;
  attempts: number;
  passed: boolean;
  best_score: number | null;
  active_attempt_id: number | null;
  cooldown_until: string | null;
  ready: boolean;
};

export type ExamSummaryResponse = {
  program_code: string;
  program_version: string;
  server_time: string;
  modules: ExamStatus[];
  final_exam: ExamStatus;
  all_modules_passed: boolean;
  certificate: TrainingCertificate | null;
};

type ExamAttempt = {
  id: number;
  exam_code: string;
  attempt_number: number;
  status: 'IN_PROGRESS' | 'SUBMITTED';
  expires_at: string;
  server_time: string;
  questions: Array<{ code: string; prompt: string; options: Array<{ code: string; label: string }> }>;
  answers: Record<string, string>;
  answered_count: number;
  total_questions: number;
  pass_score: number;
  score: number | null;
  passed: boolean | null;
};

export function TrainingExamPanel({ basePath, exam, title, finalExam = false, onChanged }: { basePath: string; exam: ExamStatus; title: string; finalExam?: boolean; onChanged: () => Promise<void> | void }) {
  const { copy, format, locale } = useTrainingExamCopy();
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [review, setReview] = useState<Set<string>>(new Set());
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<'loadFailed' | 'submitFailed' | 'startFailed' | 'answerFailed' | null>(null);
  const error = errorKey ? copy[errorKey] : '';
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [, setClockTick] = useState(0);
  const autoSubmitted = useRef(false);
  const currentLocale = useRef(locale);
  currentLocale.current = locale;

  // A language switch during a save must not restore the previous language's questions.
  const resolveAttemptLocale = async (next: ExamAttempt, responseLocale: string) => {
    while (responseLocale !== currentLocale.current) {
      responseLocale = currentLocale.current;
      next = await apiClient<ExamAttempt>(`${basePath}/exams/attempts/${next.id}?locale=${encodeURIComponent(responseLocale)}`);
    }
    return next;
  };

  const loadAttempt = async (attemptId: number) => {
    const next = await resolveAttemptLocale(await apiClient<ExamAttempt>(`${basePath}/exams/attempts/${attemptId}?locale=${encodeURIComponent(locale)}`), locale);
    setRemaining(Math.max(0, Math.ceil((new Date(next.expires_at).getTime() - Date.now()) / 1000)));
    setAttempt(next);
    autoSubmitted.current = false;
  };

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick((value) => value + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let canceled = false;
    const attemptId = exam.active_attempt_id ?? (attempt?.exam_code === exam.code ? attempt.id : null);
    if (attemptId) {
      void apiClient<ExamAttempt>(`${basePath}/exams/attempts/${attemptId}?locale=${encodeURIComponent(locale)}`)
        .then((next) => {
          if (canceled) return;
          setRemaining(Math.max(0, Math.ceil((new Date(next.expires_at).getTime() - Date.now()) / 1000)));
          // Localizing an active attempt must preserve its answers, timer and review position.
          setAttempt((current) => current?.id === next.id ? { ...current, questions: next.questions } : next);
        })
        .catch(() => { if (!canceled) setErrorKey('loadFailed'); });
    } else setAttempt(null);
    return () => { canceled = true; };
  }, [basePath, exam.active_attempt_id, exam.code, attempt?.id, locale]);

  useEffect(() => {
    if (!attempt || attempt.status !== 'IN_PROGRESS') return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((new Date(attempt.expires_at).getTime() - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [attempt?.id, attempt?.expires_at, attempt?.status]);

  const submit = async () => {
    if (!attempt || busy) return;
    setBusy(true);
    setErrorKey(null);
    try {
      const result = await apiClient<ExamAttempt>(`${basePath}/exams/attempts/${attempt.id}/submit?locale=${encodeURIComponent(locale)}`, { method: 'POST' });
      setAttempt(await resolveAttemptLocale(result, locale));
      setConfirmSubmit(false);
      await onChanged();
    } catch (reason) { setErrorKey('submitFailed'); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (attempt?.status === 'IN_PROGRESS' && remaining === 0 && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void submit();
    }
  }, [remaining, attempt?.status]);

  const start = async () => {
    setBusy(true);
    setErrorKey(null);
    try {
      const next = await apiClient<ExamAttempt>(`${basePath}/exams/${exam.code}/start?locale=${encodeURIComponent(locale)}`, { method: 'POST' });
      setRemaining(Math.max(0, Math.ceil((new Date(next.expires_at).getTime() - Date.now()) / 1000)));
      setAttempt(await resolveAttemptLocale(next, locale));
      setQuestionIndex(0);
      setReview(new Set());
      autoSubmitted.current = false;
    } catch (reason) { setErrorKey('startFailed'); }
    finally { setBusy(false); }
  };

  const choose = async (questionCode: string, optionCode: string) => {
    if (!attempt || busy) return;
    setAttempt({ ...attempt, answers: { ...attempt.answers, [questionCode]: optionCode }, answered_count: Object.keys({ ...attempt.answers, [questionCode]: optionCode }).length });
    try {
      const saved = await apiClient<ExamAttempt>(`${basePath}/exams/attempts/${attempt.id}/answers?locale=${encodeURIComponent(locale)}`, { method: 'PATCH', body: JSON.stringify({ questionCode, optionCode }) });
      setAttempt(await resolveAttemptLocale(saved, locale));
    } catch (reason) {
      setErrorKey('answerFailed');
      await loadAttempt(attempt.id).catch(() => undefined);
    }
  };

  if (!attempt) return <ExamGate exam={exam} title={title} finalExam={finalExam} busy={busy} error={error} onStart={() => void start()} />;
  if (attempt.status === 'SUBMITTED') return <ExamResult attempt={attempt} exam={exam} title={title} finalExam={finalExam} busy={busy} error={error} onRetry={() => void start()} />;

  const question = attempt.questions[questionIndex];
  const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
  const seconds = (remaining % 60).toString().padStart(2, '0');
  const unanswered = attempt.total_questions - attempt.answered_count;

  return <section className="overflow-hidden rounded-xl border border-[#177D66] bg-white shadow-sm dark:bg-slate-900">
    <header className="flex flex-col gap-4 border-b border-slate-200 bg-slate-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-xs font-medium uppercase tracking-wider text-[#8FE0CA]">{format("inProgress", { attempt: attempt.attempt_number })}</p><h4 className="mt-1 text-xl font-medium">{title}</h4><p className="mt-1 text-sm text-slate-300">{copy.autosave}</p></div>
      <div className={`flex items-center gap-2 rounded-xl px-4 py-3 font-mono text-xl font-semibold ${remaining <= 120 ? 'bg-red-600 text-white' : 'bg-white/10'}`}><Clock3 className="h-5 w-5" />{minutes}:{seconds}</div>
    </header>
    <div className="grid lg:grid-cols-[190px_minmax(0,1fr)]">
      <aside className="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50 lg:border-b-0 lg:border-r">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{copy.questions}</p>
        <div className="mt-3 grid grid-cols-5 gap-2 lg:grid-cols-4">{attempt.questions.map((item, index) => <button key={item.code} type="button" onClick={() => setQuestionIndex(index)} aria-label={format("goToQuestion", { number: index + 1 })} className={`relative grid h-9 place-items-center rounded-lg border text-sm font-medium ${index === questionIndex ? 'border-[#177D66] bg-[#177D66] text-white' : attempt.answers[item.code] ? 'border-emerald-300 bg-emerald-100 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>{index + 1}{review.has(item.code) ? <Flag className="absolute -right-1 -top-1 h-3 w-3 fill-amber-400 text-amber-500" /> : null}</button>)}</div>
        <p className="mt-4 text-xs leading-5 text-slate-500">{format("answerProgress", { answered: attempt.answered_count, pending: unanswered })}</p>
      </aside>
      <div className="p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-[#177D66]">{format("questionProgress", { current: questionIndex + 1, total: attempt.total_questions })}</p><button type="button" onClick={() => setReview((current) => { const next = new Set(current); next.has(question.code) ? next.delete(question.code) : next.add(question.code); return next; })} className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium ${review.has(question.code) ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-600'}`}><Flag className="h-3.5 w-3.5" />{copy.reviewLater}</button></div>
        <h5 className="mt-4 text-lg font-medium leading-7 text-slate-950 dark:text-white">{question.prompt}</h5>
        <fieldset className="mt-5 space-y-3">{question.options.map((option) => <label key={option.code} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-6 transition ${attempt.answers[question.code] === option.code ? 'border-[#177D66] bg-[#59C3A5]/10 text-slate-950 dark:text-white' : 'border-slate-200 text-slate-600 hover:border-[#59C3A5] dark:border-slate-700 dark:text-slate-300'}`}><input type="radio" name={question.code} checked={attempt.answers[question.code] === option.code} onChange={() => void choose(question.code, option.code)} className="mt-1 h-4 w-4 accent-[#177D66]" /><span>{option.label}</span></label>)}</fieldset>
        {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <button type="button" disabled={questionIndex === 0} onClick={() => setQuestionIndex((value) => value - 1)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium disabled:opacity-40"><ChevronLeft className="h-4 w-4" />{copy.previous}</button>
          <div className="flex gap-2">{questionIndex < attempt.total_questions - 1 ? <button type="button" onClick={() => setQuestionIndex((value) => value + 1)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white">{copy.next}<ChevronRight className="h-4 w-4" /></button> : <button type="button" onClick={() => setConfirmSubmit(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white"><Send className="h-4 w-4" />{copy.submitAssessment}</button>}</div>
        </div>
        {confirmSubmit ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-medium">{copy.submitNow}</p><p className="mt-1">{format("submitWarning", { count: unanswered })}</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => setConfirmSubmit(false)} className="min-h-9 rounded-lg border border-amber-300 px-3 font-medium">{copy.keepReviewing}</button><button type="button" disabled={busy} onClick={() => void submit()} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-slate-950 px-3 font-medium text-white">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{copy.submit}</button></div></div> : null}
      </div>
    </div>
  </section>;
}

function ExamGate({ exam, title, finalExam, busy, error, onStart }: { exam: ExamStatus; title: string; finalExam: boolean; busy: boolean; error: string; onStart: () => void }) {
  const { copy, format, locale } = useTrainingExamCopy();
  const cooldown = exam.cooldown_until ? Math.max(0, Math.ceil((new Date(exam.cooldown_until).getTime() - Date.now()) / 60000)) : 0;
  return <section className={`overflow-hidden rounded-xl border bg-white dark:bg-slate-900 ${finalExam ? 'border-slate-900' : exam.passed ? 'border-[#59C3A5]' : 'border-slate-200 dark:border-slate-700'}`}>
    <div className={`p-5 ${finalExam ? 'bg-slate-950 text-white' : 'border-b border-slate-200 dark:border-slate-700'}`}><div className="flex items-start gap-4"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${exam.passed ? 'bg-[#177D66] text-white' : finalExam ? 'bg-white/10 text-[#8FE0CA]' : 'bg-blue-50 text-blue-700'}`}>{exam.passed ? <ShieldCheck className="h-5 w-5" /> : exam.ready ? <Award className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}</span><div><p className={`text-xs font-medium uppercase tracking-wide ${finalExam ? 'text-[#8FE0CA]' : 'text-[#177D66]'}`}>{finalExam ? copy.professional : copy.stageAssessment}</p><h4 className="mt-1 text-xl font-medium">{title}</h4><p className={`mt-2 text-sm leading-6 ${finalExam ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300'}`}>{exam.passed ? format("bestScore", { score: exam.best_score ?? 0, total: exam.question_count }) : exam.ready ? copy.ready : finalExam ? copy.passStages : copy.completePractice}</p></div></div></div>
    <div className="grid gap-3 p-5 sm:grid-cols-3"><ExamFact label={copy.questionCount} value={String(exam.question_count)} /><ExamFact label={copy.timeLimit} value={format("minutes", { count: exam.duration_minutes })} /><ExamFact label={copy.passScore} value={`${exam.pass_score}/${exam.question_count}`} /></div>
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">{cooldown ? format("retryIn", { count: cooldown }) : format("attempts", { count: exam.attempts })}</p>{!exam.passed ? <button type="button" disabled={!exam.ready || cooldown > 0 || busy} onClick={onStart} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#177D66] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-45">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}{copy.start}</button> : <span className="inline-flex items-center gap-2 text-sm font-medium text-[#177D66]"><Check className="h-4 w-4" />{copy.accredited}</span>}</div>
    {error ? <p role="alert" className="px-5 pb-4 text-sm text-red-700">{error}</p> : null}
  </section>;
}

function ExamResult({ attempt, exam, title, finalExam, busy, error, onRetry }: { attempt: ExamAttempt; exam: ExamStatus; title: string; finalExam: boolean; busy: boolean; error: string; onRetry: () => void }) {
  const { copy, format, locale } = useTrainingExamCopy();
  const passed = Boolean(attempt.passed);
  return <section className={`rounded-xl border p-6 ${passed ? 'border-[#59C3A5] bg-[#59C3A5]/10' : 'border-red-200 bg-red-50'}`}><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-4"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white ${passed ? 'bg-[#177D66]' : 'bg-red-600'}`}>{passed ? <ShieldCheck className="h-6 w-6" /> : <RotateCcw className="h-6 w-6" />}</span><div><p className={`text-xs font-medium uppercase tracking-wide ${passed ? 'text-[#177D66]' : 'text-red-700'}`}>{passed ? copy.passed : copy.failed}</p><h4 className="mt-1 text-xl font-medium text-slate-950">{title}</h4><p className="mt-2 text-sm text-slate-600">{format("result", { score: attempt.score ?? 0, total: attempt.total_questions, required: attempt.pass_score })}</p><p className="mt-1 text-sm text-slate-600">{passed ? finalExam ? copy.certificateReady : copy.progressAccredited : copy.reviewModule}</p></div></div>{!passed ? <button type="button" disabled={busy || Boolean(exam.cooldown_until)} onClick={onRetry} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-45"><RotateCcw className="h-4 w-4" />{copy.retry}</button> : null}</div>{error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}</section>;
}

function ExamFact({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-medium text-slate-950 dark:text-white">{value}</p></div>; }

export function CertificateCard({ certificate }: { certificate: TrainingCertificate }) {
  const { copy, format, locale } = useTrainingExamCopy();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const validUntil = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(certificate.expires_at)), [certificate.expires_at, locale]);
  return <section className="rounded-xl border border-slate-900 bg-slate-950 p-6 text-white"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#59C3A5] text-slate-950"><Award className="h-6 w-6" /></span><div><p className="text-xs font-medium uppercase tracking-wider text-[#8FE0CA]">{copy.validCertificate}</p><h3 className="mt-1 text-2xl font-medium">{certificate.holder_name}</h3><p className="mt-2 text-sm text-slate-300">{format("certificateValidity", { folio: certificate.folio, date: validUntil })}</p></div></div><button type="button" disabled={downloading} onClick={() => { setDownloading(true); setDownloadError(""); void downloadTrainingCertificate(certificate, locale).catch(() => setDownloadError(copy.downloadFailed)).finally(() => setDownloading(false)); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-slate-950 disabled:opacity-60">{downloading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{copy.download}</button></div>{downloadError ? <p role="alert" className="mt-3 text-sm text-red-200">{downloadError}</p> : null}</section>;
}
