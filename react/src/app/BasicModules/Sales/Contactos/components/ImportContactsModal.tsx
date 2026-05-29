import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { CheckCircle2, FileUp, Smartphone, UploadCloud } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { cn } from '../../../../components/ui/utils';
import { getSalesModalStyles } from '../../salesModalStyles';
import {
  parseContactFile,
  pickNativeContacts,
  type ContactImportNavigator,
  type ImportedContactDraft,
} from '../utils/contactImportUtils';

const importModalStyles = getSalesModalStyles('coral');

type ImportContactsResult = {
  imported: number;
  skipped: number;
};

export function ImportContactsModal({
  isOpen,
  onOpenChange,
  onImportContacts,
}: {
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
      setStatusMessage(selectedContacts.length > 0 ? `${selectedContacts.length} contactos listos para importar.` : 'No se seleccionaron contactos.');
    } catch {
      setStatusMessage('El navegador no permitió leer contactos. Usa un archivo .vcf o .csv como alternativa.');
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
      setStatusMessage(parsedContacts.length > 0 ? `${parsedContacts.length} contactos detectados en ${file.name}.` : 'No se detectaron contactos válidos en el archivo.');
    } catch {
      setStatusMessage('No se pudo leer el archivo. Prueba con un .vcf o .csv exportado desde tu teléfono.');
    } finally {
      setIsReadingContacts(false);
    }
  };

  const handleImportContacts = () => {
    const result = onImportContacts(drafts);
    setStatusMessage(`${result.imported} contactos importados${result.skipped > 0 ? ` · ${result.skipped} duplicados omitidos` : ''}.`);
    setDrafts([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(importModalStyles.content, '!flex max-h-[90vh] max-w-2xl flex-col !gap-0')} closeButtonClassName={importModalStyles.close}>
        <DialogHeader className={cn(importModalStyles.header, 'shrink-0')}>
          <DialogTitle className={importModalStyles.title}>
            <UploadCloud className="h-6 w-6" />
            Importar contactos
          </DialogTitle>
          <DialogDescription className={importModalStyles.description}>
            Trae contactos desde Android, iPhone o un archivo exportado. Todo se procesa localmente en el navegador.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <section className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              className={cn(
                'rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/5 p-4 text-left transition hover:bg-[#FF6B5E]/10',
                !canUseNativeContacts && 'opacity-70',
              )}
              onClick={handlePickNativeContacts}
              disabled={!canUseNativeContacts || isReadingContacts}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF6B5E] text-white">
                <Smartphone className="h-5 w-5" />
              </span>
              <span className="mt-3 block text-sm font-black text-slate-950">Desde teléfono</span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">
                Disponible si el navegador permite abrir el selector nativo de contactos.
              </span>
              <Badge variant="outline" className="mt-3 rounded-full border-slate-200 bg-white text-xs font-bold text-slate-600">
                {canUseNativeContacts ? 'Disponible' : 'Usa archivo'}
              </Badge>
            </button>

            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-[#FF6B5E]/35 hover:bg-slate-50"
              onClick={() => fileInputRef.current?.click()}
              disabled={isReadingContacts}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#FF6B5E]/25 bg-[#FF6B5E]/10 text-[#B63B32]">
                <FileUp className="h-5 w-5" />
              </span>
              <span className="mt-3 block text-sm font-black text-slate-950">Archivo .vcf o .csv</span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">
                Ideal para iPhone, Android o contactos exportados desde otro sistema.
              </span>
            </button>
            <input ref={fileInputRef} type="file" accept=".vcf,.csv,text/vcard,text/csv" className="hidden" onChange={handleFileChange} />
          </section>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">Vista previa</h3>
                <p className="mt-1 text-sm text-slate-600">Revisa antes de crear contactos en el directorio.</p>
              </div>
              <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
                {drafts.length} listos
              </Badge>
            </div>

            <div className="mt-4 max-h-56 space-y-2 overflow-y-auto">
              {drafts.length > 0 ? drafts.slice(0, 8).map((contact, index) => (
                <div key={`${contact.contactPerson}-${contact.email}-${index}`} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <p className="font-bold text-slate-950">{contact.contactPerson}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{contact.company}</p>
                  <p className="mt-1 text-xs text-slate-500">{[contact.phone, contact.email].filter(Boolean).join(' · ') || 'Sin teléfono/email'}</p>
                </div>
              )) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm font-medium text-slate-400">
                  Selecciona contactos desde el teléfono o carga un archivo para ver la vista previa.
                </div>
              )}
              {drafts.length > 8 ? (
                <p className="text-center text-xs font-semibold text-slate-500">+{drafts.length - 8} contactos más</p>
              ) : null}
            </div>
          </section>

          {statusMessage ? (
            <div className="flex items-start gap-3 rounded-lg border border-[#59C3A5]/25 bg-[#59C3A5]/10 px-4 py-3 text-sm font-semibold text-[#177D66]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          ) : null}
        </div>

        <DialogFooter className={cn(importModalStyles.footer, 'shrink-0')}>
          <Button variant="outline" className={importModalStyles.secondaryButton} onClick={() => handleOpenChange(false)}>Cancelar</Button>
          <Button className={importModalStyles.primaryButton} onClick={handleImportContacts} disabled={drafts.length === 0 || isReadingContacts}>
            Importar contactos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
