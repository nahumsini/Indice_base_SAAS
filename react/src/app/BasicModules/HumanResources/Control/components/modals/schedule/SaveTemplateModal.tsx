import { Save, X } from 'lucide-react';
import { Button } from '../../../../../../components/ui/button';
import type { ControlTranslations } from '../../../translations';

interface SaveTemplateModalProps {
  copy: ControlTranslations;
  errorMessage: string;
  isOpen: boolean;
  isSaving: boolean;
  templateName: string;
  onClose: () => void;
  onSave: () => void;
  onTemplateNameChange: (value: string) => void;
}

export function SaveTemplateModal({
  copy,
  errorMessage,
  isOpen,
  isSaving,
  templateName,
  onClose,
  onSave,
  onTemplateNameChange,
}: SaveTemplateModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3 bg-[#59C3A5] px-5 py-4 text-white">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-white">{copy.schedule.saveTemplate.title}</h3>
            <p className="mt-1 text-sm text-white/75">{copy.schedule.saveTemplate.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={copy.schedule.saveTemplate.closeAria}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              {copy.schedule.saveTemplate.nameLabel}
            </span>
            <input
              autoFocus
              type="text"
              value={templateName}
              onChange={(event) => onTemplateNameChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onSave();
                }
              }}
              placeholder={copy.schedule.saveTemplate.placeholder}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          {errorMessage ? (
            <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
              {errorMessage}
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {copy.schedule.saveTemplate.helper}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 bg-[#59C3A5] px-5 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            {copy.schedule.cancel}
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="gap-2 bg-white text-[#59C3A5] shadow-sm hover:bg-white/90 hover:text-[#59C3A5]"
          >
            <Save className="h-4 w-4" />
            {isSaving ? copy.schedule.saveTemplate.saving : copy.schedule.saveTemplate.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
