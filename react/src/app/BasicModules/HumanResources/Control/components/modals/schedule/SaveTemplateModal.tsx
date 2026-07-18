import { Save } from 'lucide-react';
import { Button } from '../../../../../../components/ui/button';
import { IndiceModalFrame } from '../../../../../../components/indice-modal';
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
    <IndiceModalFrame
      busy={isSaving}
      closeLabel={copy.schedule.saveTemplate.closeAria}
      description={copy.schedule.saveTemplate.description}
      footer={(
        <Button type="button" onClick={onSave} disabled={isSaving || !templateName.trim()}>
          <Save className="h-4 w-4" />
          {isSaving ? copy.schedule.saveTemplate.saving : copy.schedule.saveTemplate.save}
        </Button>
      )}
      footerLeading={<Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>{copy.schedule.cancel}</Button>}
      icon={<Save className="h-5 w-5" />}
      modalType="confirmation"
      onOpenChange={(open) => { if (!open) onClose(); }}
      open={isOpen}
      title={copy.schedule.saveTemplate.title}
      tone="aqua"
    >
        <div className="space-y-3">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
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
              className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-[#59C3A5] focus:ring-2 focus:ring-[#59C3A5]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          {errorMessage ? (
            <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
              {errorMessage}
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {copy.schedule.saveTemplate.helper}
            </p>
          )}
        </div>
    </IndiceModalFrame>
  );
}
