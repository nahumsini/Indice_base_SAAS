import { getInternalDevelopmentMessages, formatInternalDevelopmentMessage } from './translations';
import { CalendarDays, ExternalLink, FileClock, PencilLine, Printer, Users } from 'lucide-react';
import { IndiceModalFrame } from '../components/indice-modal';
import { getInternalDevelopmentCopy } from './internalDevelopment.copy';
import { printInternalDevelopmentDetail } from './internalDevelopmentPrint';
import type { InternalDevelopmentDetail } from './internalDevelopment.types';

export function InternalDevelopmentDetailModal({
  detail,
  english,
  locale,
  onEdit,
  onOpenChange,
  open,
}: {
  detail: InternalDevelopmentDetail | null;
  english: boolean;
  locale: string;
  onEdit: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const copy = getInternalDevelopmentCopy(locale);
  if (!detail) return null;
  const { entry } = detail;
  const handlePrint = () => printInternalDevelopmentDetail({ detail, english, locale });

  return (
    <IndiceModalFrame
      open={open}
      onOpenChange={onOpenChange}
      eyebrow={`${entry.folio} · v${entry.version}`}
      title={entry.title}
      description={`${copy.types[entry.entryType]} · ${copy.areas[entry.area]} · ${copy.statuses[entry.status]}`}
      icon={<FileClock className="h-5 w-5" />}
      modalType="standard-form"
      tone="aqua"
      footerSummary={formatInternalDevelopmentMessage(getInternalDevelopmentMessages(locale).lastUpdatedBy, entry.updatedByName)}
      footer={(
        <>
          <button type="button" onClick={() => onOpenChange(false)} className="h-10 rounded-xl border border-white/40 px-4 text-sm font-medium text-white">
            {getInternalDevelopmentMessages(locale).close}
          </button>
          <button type="button" onClick={handlePrint} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/40 px-4 text-sm font-medium text-white">
            <Printer className="h-4 w-4" />{getInternalDevelopmentMessages(locale).print}
          </button>
          <button type="button" onClick={onEdit} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-[#176B5B]">
            <PencilLine className="h-4 w-4" />{copy.edit}
          </button>
        </>
      )}
    >
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-3">
          <Meta label={getInternalDevelopmentMessages(locale).date} value={formatDate(entry.eventAt, locale)} icon={<CalendarDays className="h-4 w-4" />} />
          <Meta label={copy.owner} value={entry.ownerName} />
          <Meta label={copy.status} value={copy.statuses[entry.status]} />
        </section>

        <Content title={getInternalDevelopmentMessages(locale).executiveSummary} value={entry.summary} highlighted />
        {entry.details ? <Content title={getInternalDevelopmentMessages(locale).detailedEvidence} value={entry.details} /> : null}

        {entry.periodStart && entry.periodEnd ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500">{getInternalDevelopmentMessages(locale).reportedPeriod}</p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{entry.periodStart} — {entry.periodEnd}</p>
          </section>
        ) : null}

        {entry.decisions || entry.nextSteps ? (
          <section className="grid gap-4 sm:grid-cols-2">
            {entry.decisions ? <Content title={getInternalDevelopmentMessages(locale).decisions} value={entry.decisions} /> : null}
            {entry.nextSteps ? <Content title={getInternalDevelopmentMessages(locale).nextSteps} value={entry.nextSteps} /> : null}
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white"><Users className="h-4 w-4 text-[#177D66]" />{copy.participants}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {entry.participants.map((participant) => (
              <span key={participant.id} className="rounded-full border border-[#59C3A5]/50 bg-[#59C3A5]/10 px-3 py-1.5 text-xs font-medium text-[#176B5B]">{participant.name}</span>
            ))}
          </div>
        </section>

        {entry.relatedEntryTitle || entry.location || entry.referenceUrl ? (
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
            {entry.relatedEntryTitle ? <Line label={getInternalDevelopmentMessages(locale).relatedRecord} value={entry.relatedEntryTitle} /> : null}
            {entry.location ? <Line label={getInternalDevelopmentMessages(locale).locationOrChannel} value={entry.location} /> : null}
            {entry.referenceUrl ? (
              <a href={entry.referenceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium text-[#177D66] hover:underline">
                <ExternalLink className="h-4 w-4" />{getInternalDevelopmentMessages(locale).openEvidence}
              </a>
            ) : null}
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">{getInternalDevelopmentMessages(locale).revisionHistory}</h3>
          <p className="mt-1 text-xs text-slate-500">{getInternalDevelopmentMessages(locale).everySavedVersionRemainsAuditable}</p>
          <ol className="mt-4 space-y-3">
            {detail.history.map((history) => (
              <li key={history.id} className="flex items-start gap-3 border-l-2 border-[#59C3A5] pl-3">
                <span className="mt-0.5 rounded-full bg-[#59C3A5]/15 px-2 py-1 text-xs font-medium text-[#176B5B]">v{history.entryVersion}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{history.actionCode === 'CREATED' ? (getInternalDevelopmentMessages(locale).recordCreated) : (getInternalDevelopmentMessages(locale).recordUpdated)}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{history.changedByName} · {formatDate(history.changedAt, locale)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </IndiceModalFrame>
  );
}

function Meta({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">{icon}{label}</p><p className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-white">{value}</p></div>;
}

function Content({ highlighted = false, title, value }: { highlighted?: boolean; title: string; value: string }) {
  return <section className={`rounded-2xl border p-4 ${highlighted ? 'border-[#59C3A5]/60 bg-[#59C3A5]/10' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}><h3 className="text-sm font-medium text-slate-900 dark:text-white">{title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{value}</p></section>;
}

function Line({ label, value }: { label: string; value: string }) {
  return <p><span className="font-medium text-slate-500">{label}:</span> <span className="text-slate-800 dark:text-slate-200">{value}</span></p>;
}

function formatDate(value: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}
