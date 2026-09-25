import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, ExternalLink, File, Image as ImageIcon, Paperclip, Trash2, Upload } from 'lucide-react';
import { ConfirmDeleteDialog } from '../../../../components/ConfirmDeleteDialog';
import { IndiceModalFrame, IndiceModalValidation } from '../../../../components/indice-modal';
import {
  budgetLineAttachmentsService,
  expenseAttachmentsService,
  type AttachmentService,
  type ExpenseAttachment,
} from '../../services/expense-attachments.service';
import { useExpensesResolvedLocale, useExpensesTranslations } from '../hooks/useExpensesTranslations';
import { financeModalPrimaryButtonClass } from '../../components/modals/FinanceModalPrimitives';
import { getExpenseDetailCopy } from './expenseDetail.copy';

interface LocalAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  isLocalObjectUrl?: boolean;
  uploadedAt: Date;
}

interface AttachmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseFolio: string;
  expenseConcept: string;
  attachments: string[];
  expenseId?: string;
  expenseCurrency?: string;
  moduleVariant?: 'finance' | 'sales';
  onSave?: (attachments: string[]) => void;
  onChanged?: (attachmentNames: string[]) => void;
}

export function AttachmentsModal({
  isOpen,
  onClose,
  expenseFolio,
  expenseConcept,
  attachments,
  expenseId,
  expenseCurrency = 'MXN',
  moduleVariant = 'finance',
  onSave,
  onChanged,
}: AttachmentsModalProps) {
  const t = useExpensesTranslations();
  const detailCopy = getExpenseDetailCopy(useExpensesResolvedLocale());
  const accent = moduleVariant === 'sales' ? '#FF6B5E' : '#147514';
  const accentText = moduleVariant === 'sales' ? '#B63B32' : '#147514';
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const onChangedRef = useRef(onChanged);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [storedFiles, setStoredFiles] = useState<ExpenseAttachment[]>([]);
  const [localFiles, setLocalFiles] = useState<LocalAttachment[]>([]);
  const [pendingDelete, setPendingDelete] = useState<
    { kind: 'backend'; file: ExpenseAttachment } | { kind: 'local'; file: LocalAttachment } | null
  >(null);
  const attachmentOwner = useMemo(() => resolveAttachmentOwner(expenseId), [expenseId]);
  const usesBackend = Boolean(attachmentOwner);

  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage('');
    setLocalFiles(attachments.map((name, index) => createStoredAttachment(name, index)));
  }, [attachments, isOpen]);

  useEffect(() => {
    if (!isOpen || !attachmentOwner) return;
    let isMounted = true;
    setIsLoading(true);
    attachmentOwner.service.list(attachmentOwner.id)
      .then(files => {
        if (!isMounted) return;
        setStoredFiles(files);
        onChangedRef.current?.(files.map(file => file.originalFilename));
      })
      .catch(error => {
        if (isMounted) setErrorMessage(messageFrom(error, t.expenses.attachments.operationFailed));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [attachmentOwner, isOpen]);

  useEffect(() => () => revokeLocalUrls(objectUrlsRef.current), []);

  if (!isOpen) return null;

  const addFiles = async (newFiles: File[]) => {
    setErrorMessage('');
    if (attachmentOwner) {
      setIsUploading(true);
      try {
        const uploadedFiles = [];
        for (const file of newFiles) {
          uploadedFiles.push(await attachmentOwner.service.upload(attachmentOwner.id, file));
        }
        const nextFiles = [...storedFiles, ...uploadedFiles];
        setStoredFiles(nextFiles);
        onChanged?.(nextFiles.map(file => file.originalFilename));
      } catch (error) {
        setErrorMessage(messageFrom(error, t.expenses.attachments.operationFailed));
      } finally {
        setIsUploading(false);
      }
      return;
    }

    const nextFiles = newFiles.map((file, index) => createLocalAttachment(file, index, objectUrlsRef.current));
    const updatedFiles = [...localFiles, ...nextFiles];
    setLocalFiles(updatedFiles);
    onSave?.(updatedFiles.map(serializeLocalAttachment));
  };

  const confirmRemoveFile = async () => {
    if (!pendingDelete) return;
    setErrorMessage('');
    setIsDeleting(true);
    try {
      if (pendingDelete.kind === 'backend') {
        if (!attachmentOwner) return;
        await attachmentOwner.service.remove(attachmentOwner.id, pendingDelete.file.id);
        const nextFiles = storedFiles.filter(item => item.id !== pendingDelete.file.id);
        setStoredFiles(nextFiles);
        onChanged?.(nextFiles.map(item => item.originalFilename));
      } else {
        revokeLocalObjectUrl(pendingDelete.file, objectUrlsRef.current);
        const nextFiles = localFiles.filter(file => file.id !== pendingDelete.file.id);
        setLocalFiles(nextFiles);
        onSave?.(nextFiles.map(serializeLocalAttachment));
      }
      setPendingDelete(null);
    } catch (error) {
      setErrorMessage(messageFrom(error, t.expenses.attachments.operationFailed));
    } finally {
      setIsDeleting(false);
    }
  };

  const filesCount = usesBackend ? storedFiles.length : localFiles.length;
  const totalSize = usesBackend
    ? storedFiles.reduce((sum, file) => sum + file.sizeBytes, 0)
    : localFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <>
      <IndiceModalFrame
        busy={isUploading || isDeleting}
        closeLabel={t.columnModal.close}
        description={`${expenseFolio} · ${expenseConcept}`}
        footer={(
          <button onClick={onClose} type="button" className={financeModalPrimaryButtonClass} style={{ color: accentText }}>
            {t.columnModal.close}
          </button>
        )}
        footerSummary={`${t.expenses.attachments.attachedFiles(filesCount)} · ${formatFileSize(totalSize)}`}
        icon={<Paperclip className="h-5 w-5" />}
        onOpenChange={(open) => !open && onClose()}
        open={isOpen}
        title={t.expenses.attachments.title}
        tone={moduleVariant === 'sales' ? 'coral' : 'green'}
      >
          <UploadDropzone
            accent={accent}
            accentText={accentText}
            disabled={isUploading}
            isDragging={isDragging}
            onDragChange={setIsDragging}
            onFiles={addFiles}
            selectLabel={t.expenses.attachments.selectFiles}
            subtitle={t.expenses.attachments.supportedFormats}
            title={t.expenses.quick.attachEvidence}
            uploadingLabel={t.expenses.attachments.uploading}
          />

          <IndiceModalValidation className="mt-4" messages={errorMessage ? [errorMessage] : []} title={t.expenses.attachments.operationFailed} />

          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {t.expenses.attachments.attachedFiles(filesCount)}
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t.expenses.attachments.total}: {formatFileSize(totalSize)}
              </span>
            </div>
            {isLoading ? (
              <EmptyState label={t.expenses.attachments.loading} />
            ) : usesBackend ? (
              <BackendFiles currency={expenseCurrency} evidenceLabel={detailCopy.paymentEvidence} emptyLabel={t.expenses.attachments.empty} files={storedFiles} onRemove={(file) => setPendingDelete({ kind: 'backend', file })} openLabel={t.expenses.attachments.open} removeLabel={t.expenses.attachments.remove} downloadLabel={t.expenses.attachments.download} />
            ) : (
              <LocalFiles emptyLabel={t.expenses.attachments.empty} files={localFiles} onRemove={(id) => {
                const file = localFiles.find(item => item.id === id);
                if (file) setPendingDelete({ kind: 'local', file });
              }} openLabel={t.expenses.attachments.open} removeLabel={t.expenses.attachments.remove} downloadLabel={t.expenses.attachments.download} />
            )}
          </div>
      </IndiceModalFrame>
      <ConfirmDeleteDialog
        cancelLabel={t.common.cancel}
        confirmDisabled={isDeleting}
        confirmLabel={isDeleting ? 'Eliminando…' : t.expenses.attachments.remove}
        description="El archivo dejará de estar disponible en este registro. Esta acción no se puede deshacer."
        isVisible={Boolean(pendingDelete)}
        itemName={pendingDelete?.kind === 'backend' ? pendingDelete.file.originalFilename : pendingDelete?.file.name}
        onCancel={() => !isDeleting && setPendingDelete(null)}
        onConfirm={() => void confirmRemoveFile()}
        title="Eliminar archivo adjunto"
      />
    </>
  );
}

type AttachmentOwner = {
  id: string;
  service: AttachmentService;
};

function resolveAttachmentOwner(expenseId?: string): AttachmentOwner | undefined {
  if (!expenseId) return undefined;
  if (/^\d+$/.test(expenseId)) {
    return { id: expenseId, service: expenseAttachmentsService };
  }
  const budgetLineMatch = /^budget-line-(\d+)$/.exec(expenseId);
  if (budgetLineMatch) {
    return { id: budgetLineMatch[1], service: budgetLineAttachmentsService };
  }
  return undefined;
}

function UploadDropzone({
  accent,
  accentText,
  disabled,
  isDragging,
  onDragChange,
  onFiles,
  selectLabel,
  subtitle,
  title,
  uploadingLabel,
}: {
  accent: string;
  accentText: string;
  disabled: boolean;
  isDragging: boolean;
  onDragChange: (value: boolean) => void;
  onFiles: (files: File[]) => void;
  selectLabel: string;
  subtitle: string;
  title: string;
  uploadingLabel: string;
}) {
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        onDragChange(true);
      }}
      onDragLeave={() => onDragChange(false)}
      onDrop={(event) => {
        event.preventDefault();
        onDragChange(false);
        void onFiles(Array.from(event.dataTransfer.files));
      }}
      className="rounded-xl border-2 border-dashed p-8 text-center transition-all"
      style={{ borderColor: isDragging ? accent : undefined }}
    >
      <div className="flex flex-col items-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}1A` }}>
          <Upload className="h-8 w-8" style={{ color: accentText }} />
        </div>
        <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
        <label className={disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}>
          <input type="file" multiple onChange={(event) => void onFiles(Array.from(event.target.files ?? []))} disabled={disabled} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" />
          <span className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors" style={{ backgroundColor: accent }}>
            <Upload className="h-4 w-4" />
            {disabled ? uploadingLabel : selectLabel}
          </span>
        </label>
      </div>
    </div>
  );
}

type FileActionsCopy = { downloadLabel: string; emptyLabel: string; openLabel: string; removeLabel: string };

function BackendFiles({ currency, downloadLabel, emptyLabel, evidenceLabel, files, onRemove, openLabel, removeLabel }: FileActionsCopy & { currency: string; evidenceLabel: string; files: ExpenseAttachment[]; onRemove: (file: ExpenseAttachment) => void }) {
  if (files.length === 0) return <EmptyState label={emptyLabel} />;
  return (
    <div className="space-y-2">
      {files.map(file => (
        <FileRow
          key={file.id}
          name={file.originalFilename}
          size={file.sizeBytes}
          type={file.mimeType}
          url={file.downloadUrl}
          uploadedAt={file.createdAt}
          paymentAmount={file.paymentAmount}
          paymentDate={file.paymentDate}
          currency={currency}
          evidenceLabel={evidenceLabel}
          onRemove={() => void onRemove(file)}
          downloadLabel={downloadLabel}
          openLabel={openLabel}
          removeLabel={removeLabel}
        />
      ))}
    </div>
  );
}

function LocalFiles({ downloadLabel, emptyLabel, files, onRemove, openLabel, removeLabel }: FileActionsCopy & { files: LocalAttachment[]; onRemove: (id: string) => void }) {
  if (files.length === 0) return <EmptyState label={emptyLabel} />;
  return (
    <div className="space-y-2">
      {files.map(file => (
        <FileRow
          key={file.id}
          name={file.name}
          size={file.size}
          type={file.type}
          url={file.url}
          uploadedAt={file.uploadedAt.toISOString()}
          onRemove={() => onRemove(file.id)}
          downloadLabel={downloadLabel}
          openLabel={openLabel}
          removeLabel={removeLabel}
        />
      ))}
    </div>
  );
}

function FileRow({ currency = 'MXN', downloadLabel, evidenceLabel = '', name, onRemove, openLabel, paymentAmount, paymentDate, removeLabel, size, type, uploadedAt, url }: { currency?: string; downloadLabel: string; evidenceLabel?: string; name: string; onRemove: () => void; openLabel: string; paymentAmount?: number; paymentDate?: string; removeLabel: string; size: number; type: string; uploadedAt?: string; url?: string }) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors dark:border-gray-600 dark:bg-gray-700/50">
      <div className="flex-shrink-0">{type.startsWith('image/') && url ? <img alt="" src={url} className="h-11 w-11 rounded-lg object-cover" /> : type.startsWith('image/') ? <ImageIcon className="h-5 w-5 text-blue-500" /> : <File className="h-5 w-5 text-gray-500" />}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(size)}{uploadedAt ? ` - ${new Date(uploadedAt).toLocaleDateString()}` : ''}</p>
        {paymentAmount && paymentDate ? (
          <p className="mt-1 text-xs font-medium text-[#147514]">
            {evidenceLabel} · {new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(paymentAmount)} · {new Date(`${paymentDate}T00:00:00`).toLocaleDateString()}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => url && window.open(url, '_blank', 'noopener,noreferrer')} type="button" disabled={!url} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400">
          <ExternalLink className="h-4 w-4" />
          {openLabel}
        </button>
        <button onClick={() => downloadFile(name, url)} type="button" disabled={!url} aria-label={`${downloadLabel}: ${name}`} title={downloadLabel} className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent">
          <Download className="h-4 w-4" />
        </button>
        <button onClick={onRemove} type="button" aria-label={`${removeLabel}: ${name}`} title={removeLabel} className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-sm font-medium text-slate-500">
      {label}
    </div>
  );
}

const LOCAL_ATTACHMENT_PREFIX = 'indice-local-attachment:';

function createLocalAttachment(file: File, index: number, objectUrls: Set<string>): LocalAttachment {
  const url = URL.createObjectURL(file);
  objectUrls.add(url);
  return {
    id: `file-${Date.now()}-${index}`,
    name: file.name,
    size: file.size,
    type: file.type || getFileType(file.name),
    url,
    isLocalObjectUrl: true,
    uploadedAt: new Date(),
  };
}

function createStoredAttachment(value: string, index: number): LocalAttachment {
  return { id: `file-${index}`, name: value, size: 0, type: getFileType(value), uploadedAt: new Date() };
}

function serializeLocalAttachment(file: LocalAttachment) {
  if (!file.url || !file.isLocalObjectUrl) return file.url ?? file.name;
  return `${LOCAL_ATTACHMENT_PREFIX}${encodeURIComponent(JSON.stringify({
    name: file.name,
    size: file.size,
    type: file.type,
    url: file.url,
    uploadedAt: file.uploadedAt.toISOString(),
  }))}`;
}

function downloadFile(name: string, url?: string) {
  if (!url) return;
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function revokeLocalObjectUrl(file: LocalAttachment | undefined, objectUrls: Set<string>) {
  if (!file?.isLocalObjectUrl || !file.url) return;
  URL.revokeObjectURL(file.url);
  objectUrls.delete(file.url);
}

function revokeLocalUrls(objectUrls: Set<string>) {
  objectUrls.forEach(url => URL.revokeObjectURL(url));
  objectUrls.clear();
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(name: string) {
  const normalizedName = name.toLowerCase();
  if (normalizedName.endsWith('.pdf')) return 'application/pdf';
  if (normalizedName.endsWith('.png')) return 'image/png';
  if (normalizedName.endsWith('.jpg') || normalizedName.endsWith('.jpeg') || normalizedName.endsWith('.webp')) return 'image/jpeg';
  return 'application/octet-stream';
}

function messageFrom(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
