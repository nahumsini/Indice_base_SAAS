import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { CheckCircle2, FileUp, Smartphone, UploadCloud } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../components/ui/utils';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { ContactCopy } from '../translations';
import {
  parseContactFile,
  pickNativeContacts,
  type ContactImportNavigator,
  type ImportedContactDraft,
} from '../utils/contactImportUtils';

type ImportContactsResult = {
  imported: number;
  skipped: number;
};

const importContactsActionClassNames = getSalesModalActionClassNames('coral');

export function ImportContactsModal({
  copy,
  isOpen,
  onOpenChange,
  onImportContacts,
}: {
  copy: ContactCopy['importModal'];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImportContacts: (contacts: ImportedContactDraft[]) => ImportContactsResult;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [drafts, setDrafts] = useState<ImportedContactDraft[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [isReadingContacts, setIsReadingContacts] = useState(false);

  const canUseNativeContacts = useMemo(() => {
    if (typeof navigator === 'undefined') {
      return false;
    }
    return Boolean((navigator as ContactImportNavigator).contacts?.select);
  }, []);

  const resetModalState = () => {
    setDrafts([]);
    setStatusMessage('');
    setIsReadingContacts(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      resetModalState();
    }
  };

  const handlePickNativeContacts = async () => {
    if (typeof navigator === 'undefined') {
      return;
    }

    setIsReadingContacts(true);
    setStatusMessage('');

    try {
      const selectedContacts = await pickNativeContacts(navigator as ContactImportNavigator);
      setDrafts(selectedContacts);
      setStatusMessage(selectedContacts.length > 0 ? copy.selectedReady(selectedContacts.length) : copy.noneSelected);
    } catch {
      setStatusMessage(copy.nativeDenied);
    } finally {
      setIsReadingContacts(false);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsReadingContacts(true);
    setStatusMessage('');

    try {
      const fileContent = await file.text();
      const parsedContacts = parseContactFile(file.name, fileContent);
      setDrafts(parsedContacts);
      setStatusMessage(parsedContacts.length > 0 ? copy.fileDetected(parsedContacts.length, file.name) : copy.fileEmpty);
    } catch {
      setStatusMessage(copy.fileReadError);
    } finally {
      setIsReadingContacts(false);
    }
  };

  const handleImportContacts = () => {
    const result = onImportContacts(drafts);
    setStatusMessage(copy.importResult(result.imported, result.skipped));
    setDrafts([]);
  };

  return (
    <SalesModalFrame
      open={isOpen}
      onOpenChange={handleOpenChange}
      title={copy.title}
      description={copy.description}
      icon={<UploadCloud className="h-5 w-5" />}
      closeLabel={copy.cancel}
      modalType="standard-form"
      busy={isReadingContacts}
      bodyClassName="space-y-5 bg-slate-50/70"
      footer={(
        <>
          <Button
            variant="outline"
            className={importContactsActionClassNames.secondary}
            onClick={() => handleOpenChange(false)}
          >
            {copy.cancel}
          </Button>
          <Button
            className={importContactsActionClassNames.primary}
            onClick={handleImportContacts}
            disabled={drafts.length === 0 || isReadingContacts}
          >
            {copy.importContacts}
          </Button>
        </>
      )}
    >
          <section className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              className={cn(
                'rounded-lg border border-[#FF6B5E]/25 bg-white p-4 text-left shadow-sm transition hover:bg-[#FF6B5E]/10',
                !canUseNativeContacts && 'opacity-70',
              )}
              onClick={handlePickNativeContacts}
              disabled={!canUseNativeContacts || isReadingContacts}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF6B5E] text-[#222831]">
                <Smartphone className="h-5 w-5" />
              </span>
              <span className="mt-3 block text-sm font-medium text-slate-950">{copy.fromPhone}</span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">
                {copy.fromPhoneDescription}
              </span>
              <Badge variant="outline" className="mt-3 rounded-full border-slate-200 bg-white text-xs font-medium text-slate-600">
                {canUseNativeContacts ? copy.available : copy.useFile}
              </Badge>
            </button>

            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#FF6B5E]/35 hover:bg-slate-50"
              onClick={() => fileInputRef.current?.click()}
              disabled={isReadingContacts}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32]">
                <FileUp className="h-5 w-5" />
              </span>
              <span className="mt-3 block text-sm font-medium text-slate-950">{copy.fileTitle}</span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">
                {copy.fileDescription}
              </span>
            </button>
            <input ref={fileInputRef} type="file" accept=".vcf,.csv,text/vcard,text/csv" className="hidden" onChange={handleFileChange} />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-slate-700">{copy.previewTitle}</h3>
                <p className="mt-1 text-sm text-slate-600">{copy.previewDescription}</p>
              </div>
              <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {copy.ready(drafts.length)}
              </Badge>
            </div>

            <div className="mt-4 max-h-56 space-y-2 overflow-y-auto">
              {drafts.length > 0 ? drafts.slice(0, 8).map((contact, index) => (
                <div key={`${contact.contactPerson}-${contact.email}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="break-words font-medium text-slate-950">{contact.contactPerson}</p>
                  <p className="mt-1 break-words text-sm font-medium text-slate-500">{contact.company}</p>
                  <p className="mt-1 break-all text-xs text-slate-500">{[contact.phone, contact.email].filter(Boolean).join(' · ') || copy.noPhoneEmail}</p>
                </div>
              )) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm font-medium text-slate-400">
                  {copy.emptyPreview}
                </div>
              )}
              {drafts.length > 8 ? (
                <p className="text-center text-xs font-medium text-slate-500">{copy.moreContacts(drafts.length - 8)}</p>
              ) : null}
            </div>
          </section>

          {statusMessage ? (
            <div className="flex items-start gap-3 rounded-lg border border-[#59C3A5]/25 bg-[#59C3A5]/10 px-4 py-3 text-sm font-medium text-[#177D66]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          ) : null}
    </SalesModalFrame>
  );
}
