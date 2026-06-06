import { type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Input } from '../../../../components/ui/input';
import { cn } from '../../../../components/ui/utils';
import type { AgendaTranslations } from '../translations';

type AgendaQuickTaskDialogProps = {
  accentButtonClassName: string;
  copy: AgendaTranslations;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTitleChange: (title: string) => void;
  open: boolean;
  title: string;
};

export function AgendaQuickTaskDialog({
  accentButtonClassName,
  copy,
  isSubmitting,
  onOpenChange,
  onSubmit,
  onTitleChange,
  open,
  title,
}: AgendaQuickTaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="max-w-[460px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="bg-[#F4C84A] px-5 py-4">
          <DialogTitle className="text-lg font-bold text-slate-950">{copy.quickAdd.title}</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-slate-800/85">
            {copy.quickAdd.description}
          </DialogDescription>
        </div>
        <form onSubmit={onSubmit}>
          <div className="space-y-2 px-5 py-5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {copy.quickAdd.fieldLabel}
            </label>
            <Input
              value={title}
              autoFocus
              maxLength={160}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder={copy.quickAdd.placeholder}
              className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/60">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              {copy.common.cancel}
            </Button>
            <Button
              type="submit"
              className={cn('h-10 rounded-xl px-4 text-sm font-semibold', accentButtonClassName)}
              disabled={!title.trim() || isSubmitting}
            >
              <Plus className="h-4 w-4" />
              {isSubmitting ? copy.common.saving : copy.quickAdd.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
