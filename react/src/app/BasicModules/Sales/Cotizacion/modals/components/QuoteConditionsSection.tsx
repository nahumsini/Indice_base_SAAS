import type { Dispatch, SetStateAction } from 'react';
import { Textarea } from '../../../../../components/ui/textarea';
import type { QuotesTranslations } from '../../translations';
import type { QuoteFormState } from '../../types/quoteBuilderTypes';

const coralFieldClassName = 'border-slate-200 bg-white shadow-none focus-visible:border-[#FF6B5E] focus-visible:ring-[#FF6B5E]/20';

export function QuoteConditionsSection({
  form,
  t,
  onFormChange,
}: {
  form: QuoteFormState;
  t: QuotesTranslations;
  onFormChange: Dispatch<SetStateAction<QuoteFormState>>;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-[#FF6B5E]/15 bg-[#FF6B5E]/5 p-4">
        <h3 className="text-base font-semibold text-slate-950">{t.conditions.title}</h3>
        <p className="mt-1 text-sm font-normal leading-6 text-slate-500">{t.conditions.description}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">{t.labels.notes}</label>
        <Textarea
          className={coralFieldClassName}
          value={form.notes}
          onChange={(event) => onFormChange((current) => ({ ...current, notes: event.target.value }))}
          placeholder={t.builder.notesPlaceholder}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">{t.labels.terms}</label>
        <Textarea
          className={coralFieldClassName}
          value={form.terms}
          onChange={(event) => onFormChange((current) => ({ ...current, terms: event.target.value }))}
          placeholder={t.builder.termsPlaceholder}
        />
      </div>
    </section>
  );
}
