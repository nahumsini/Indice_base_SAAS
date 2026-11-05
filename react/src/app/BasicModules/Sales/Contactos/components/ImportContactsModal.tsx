import { audienceApi, type AudienceList } from '../../Mailing/audienceApi';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { CheckCircle2, FileUp, Smartphone, UploadCloud } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../components/ui/utils';
import { IndiceModalValidation } from '../../../../components/indice-modal';
import { useLanguage } from '../../../../shared/context';
import { getFormFeedbackCopy } from '../../../../components/indice-modal/formFeedbackCopy';
import type { ContactImportResult } from '../utils/importContacts';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { ContactCopy } from '../translations';
import {
  parseContactFile,
  pickNativeContacts,
  type ContactImportNavigator,
  type ImportedContactDraft,
} from '../utils/contactImportUtils';

const importContactsActionClassNames = getSalesModalActionClassNames('coral');

export function ImportContactsModal({
  copy,
  isOpen,
  onOpenChange,
  onImportContacts,
  initialListId,
  onListSaved,
}: {
  initialListId?: string;
  onListSaved?: (list: AudienceList) => void;
  copy: ContactCopy['importModal'];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onImportContacts: (contacts: ImportedContactDraft[], onProgress?: (processed: number, total: number) => void) => Promise<ContactImportResult>;
}) {
  const { currentLanguage } = useLanguage();
  const feedback = getFormFeedbackCopy(currentLanguage.code);
  const savingRef = useRef(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [importError, setImportError] = useState('');
  const [failedNames, setFailedNames] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [drafts, setDrafts] = useState<ImportedContactDraft[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [isReadingContacts, setIsReadingContacts] = useState(false);

  const spanish = currentLanguage.code.toLowerCase().startsWith('es');
  const [lists, setLists] = useState<AudienceList[]>([]);
  const [listsAvailable, setListsAvailable] = useState(false);
  const [destination, setDestination] = useState(initialListId ?? '');
  const [listName, setListName] = useState('');
  const pendingAssignment = useRef<{ list: AudienceList; ids: number[]; result: ContactImportResult } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setListsAvailable(false);
    void audienceApi.lists(controller.signal).then(items => {
      if (controller.signal.aborted) return;
      setLists(items);
      setListsAvailable(true);
    }).catch(() => {});
    return () => controller.abort();
  }, [isOpen]);

  const canUseNativeContacts = useMemo(() => {
    if (typeof navigator === 'undefined') {
      return false;
    }
    return Boolean((navigator as ContactImportNavigator).contacts?.select);
  }, []);

  const resetModalState = () => {
    setDrafts([]);
    setDestination('');
    setListName('');
    pendingAssignment.current = null;
    setStatusMessage('');
    setImportError('');
    setFailedNames([]);
    setIsReadingContacts(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (savingRef.current) return;
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
    setImportError('');
    setFailedNames([]);

    try {
      const selectedContacts = await pickNativeContacts(navigator as ContactImportNavigator);
      setDrafts(selectedContacts);
      setStatusMessage(selectedContacts.length > 0 ? copy.selectedReady(selectedContacts.length) : copy.noneSelected);
    } catch {
      setImportError(copy.nativeDenied);
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
    setImportError('');
    setFailedNames([]);

    try {
      const fileContent = await file.text();
      const parsedContacts = parseContactFile(file.name, fileContent);
      setDrafts(parsedContacts);
      if (parsedContacts.length) setStatusMessage(copy.fileDetected(parsedContacts.length, file.name));
      else setImportError(copy.fileEmpty);
    } catch {
      setImportError(copy.fileReadError);
    } finally {
      setIsReadingContacts(false);
    }
  };

  const handleImportContacts = async () => {
    if (savingRef.current || isReadingContacts || drafts.length === 0) return;
    savingRef.current = true;
    setIsImporting(true);
    setImportError('');
    setFailedNames([]);
    setStatusMessage('');
    setProgress(`0 / ${drafts.length}`);
    try {
      const target = destination === 'new'
        ? { id: crypto.randomUUID(), name: listName.trim(), version: 0, contactCount: 0, updatedAt: '' }
        : lists.find(list => list.id === destination);
      const result = pendingAssignment.current?.result ??
        await onImportContacts(drafts, (done, total) => setProgress(`${done} / ${total}`));
      if (!pendingAssignment.current && target && result.contactIds.length) {
        pendingAssignment.current = { list: target, ids: result.contactIds, result };
      }
      const pending = pendingAssignment.current;
      let saved: AudienceList | undefined;
      if (pending) {
        saved = await audienceApi.addMembers(pending.list.id, pending.list.name, pending.ids, pending.list.version);
        pendingAssignment.current = null;
        const updated = saved;
        setLists(items => [...items.filter(list => list.id !== updated.id), updated]);
        setDestination(saved.id);
        onListSaved?.(saved);
      }
      setStatusMessage([copy.importResult(result.imported, result.skipped), saved?.name].filter(Boolean).join(' · '));
      setDrafts(result.failed);
      if (result.failed.length) {
        setImportError(feedback.saveFailed);
        setFailedNames(result.failed.map(contact => contact.contactPerson || contact.company || contact.email || contact.phone));
      }
    } catch {
      setImportError(pendingAssignment.current
        ? (spanish ? 'Los contactos se procesaron. No se pudo actualizar la lista. Puedes reintentar la asignación.' : 'Contacts were processed. The list could not be updated. You can retry the assignment.')
        : feedback.saveFailed);
    } finally {
      savingRef.current = false;
      setIsImporting(false);
      setProgress('');
    }
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
      busy={isReadingContacts || isImporting}
      footerSummary={isImporting ? `${feedback.saving} ${progress}` : undefined}
      bodyClassName="space-y-5 bg-slate-50/70"
      footer={(
        <>
          <Button
            variant="outline"
            className={importContactsActionClassNames.secondary}
            disabled={isImporting || isReadingContacts}
            onClick={() => handleOpenChange(false)}
          >
            {copy.cancel}
          </Button>
          <Button
            className={importContactsActionClassNames.primary}
            onClick={() => void handleImportContacts()}
            disabled={drafts.length === 0 || isReadingContacts || isImporting || (destination === 'new' && !listName.trim()) || (Boolean(destination) && (!listsAvailable || drafts.length > 500))}
          >
            {isImporting ? feedback.saving : copy.importContacts}
          </Button>
        </>
      )}
    >
          <IndiceModalValidation messages={importError ? [importError, ...failedNames] : []} />
          {listsAvailable && (
            <fieldset disabled={isImporting || Boolean(pendingAssignment.current)} className="grid gap-2 rounded-lg border bg-white p-4">
              <label className="grid gap-2">
                {spanish ? 'Lista de Mailing' : 'Mailing list'}
                <select className="rounded-md border p-2" value={destination} onChange={event => setDestination(event.target.value)}>
                  <option value="">{spanish ? 'Importar solo al directorio' : 'Import to directory only'}</option>
                  {lists.map(list => <option key={list.id} value={list.id}>{list.name} ({list.contactCount}/500)</option>)}
                  <option value="new">{spanish ? 'Crear lista' : 'Create list'}</option>
                </select>
              </label>
              {destination === 'new' && (
                <label className="grid gap-2">
                  {spanish ? 'Nombre de la lista' : 'List name'}
                  <input className="rounded-md border p-2" value={listName} maxLength={180} onChange={event => setListName(event.target.value)} />
                </label>
              )}
              {destination && <p className="text-sm">{spanish ? 'Hasta 500 integrantes por lista.' : 'Up to 500 members per list.'}</p>}
            </fieldset>
          )}
          <section className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              className={cn(
                'rounded-lg border border-[#FF6B5E]/25 bg-white p-4 text-left shadow-sm transition hover:bg-[#FF6B5E]/10',
                !canUseNativeContacts && 'opacity-70',
              )}
              onClick={handlePickNativeContacts}
              disabled={!canUseNativeContacts || isReadingContacts || isImporting || Boolean(pendingAssignment.current)}
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
              disabled={isReadingContacts || isImporting || Boolean(pendingAssignment.current)}
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
              <span role="status" aria-live="polite">{statusMessage}</span>
            </div>
          ) : null}
    </SalesModalFrame>
  );
}
