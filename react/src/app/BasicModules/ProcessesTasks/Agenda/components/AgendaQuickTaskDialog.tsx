import { type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import type { AgendaTranslations } from '../translations';

type AgendaQuickTaskDialogProps = {
  copy: AgendaTranslations;
  error?: string | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTitleChange: (title: string) => void;
  open: boolean;
  title: string;
};

export function AgendaQuickTaskDialog({ copy, error, isSubmitting, onOpenChange, onSubmit, onTitleChange, open, title }: AgendaQuickTaskDialogProps) {
  return (
    <IndiceModalFrame
      busy={isSubmitting}
      closeLabel={copy.common.cancel}
      description={copy.quickAdd.description}
      footer={(
        <>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            {copy.common.cancel}
          </Button>
          <Button
            type="submit"
            form="agenda-quick-task-form"
            disabled={!title.trim() || isSubmitting}
          >
            <Plus className="h-4 w-4" />
            {isSubmitting ? copy.common.saving : copy.quickAdd.submit}
          </Button>
        </>
      )}
      icon={<Plus className="h-5 w-5" />}
      modalType="standard-form"
      onOpenChange={onOpenChange}
      open={open}
      title={copy.quickAdd.title}
      tone="yellow"
      contentClassName="sm:!max-w-[480px]"
    >
      <form id="agenda-quick-task-form" className="space-y-2" onSubmit={onSubmit}>
        <IndiceModalValidation messages={error ? [error] : []} />
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.quickAdd.fieldLabel}</label>
        <Input
          value={title}
          autoFocus
          maxLength={160}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={copy.quickAdd.placeholder}
          className="h-11 rounded-xl border-slate-200 bg-white shadow-none dark:border-slate-600 dark:bg-slate-800"
        />
      </form>
    </IndiceModalFrame>
  );
}
