import { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, File, Image as ImageIcon, Paperclip, Trash2, Upload, X } from 'lucide-react';
import { expenseAttachmentsService, type ExpenseAttachment } from '../../services/expense-attachments.service';
import { useFinanceTranslations } from '../../hooks/useFinanceTranslations';

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
  moduleVariant = 'finance',
  onSave,
  onChanged,
}: AttachmentsModalProps) {
  const t = useFinanceTranslations();
  const accent = moduleVariant === 'sales' ? '#FF6B5E' : '#147514';
  const accentText = moduleVariant === 'sales' ? '#B63B32' : '#147514';
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [storedFiles, setStoredFiles] = useState<ExpenseAttachment[]>([]);
  const [localFiles, setLocalFiles] = useState<LocalAttachment[]>([]);
  const usesBackend = Boolean(expenseId && /^\d+$/.test(expenseId));

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage('');
    setLocalFiles(attachments.map((name, index) => createStoredAttachment(name, index)));
  }, [attachments, isOpen]);

  useEffect(() => {
    if (!isOpen || !usesBackend || !expenseId) return;
    let isMounted = true;
    setIsLoading(true);
    expenseAttachmentsService.list(expenseId)
      .then(files => {
        if (!isMounted) return;
        setStoredFiles(files);
        onChanged?.(files.map(file => file.originalFilename));
      })
      .catch(error => {
        if (isMounted) setErrorMessage(messageFrom(error));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [expenseId, isOpen, onChanged, usesBackend]);

  useEffect(() => () => revokeLocalUrls(objectUrlsRef.current), []);

  if (!isOpen) return null;

  const addFiles = async (newFiles: File[]) => {
    setErrorMessage('');
    if (usesBackend && expenseId) {
      setIsUploading(true);
      try {
        const uploadedFiles = [];
        for (const file of newFiles) {
          uploadedFiles.push(await expenseAttachmentsService.upload(expenseId, file));
        }
        const nextFiles = [...storedFiles, ...uploadedFiles];
        setStoredFiles(nextFiles);
        onChanged?.(nextFiles.map(file => file.originalFilename));
      } catch (error) {
        setErrorMessage(messageFrom(error));
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

  const removeBackendFile = async (file: ExpenseAttachment) => {
    if (!expenseId) return;
    setErrorMessage('');
    try {
      await expenseAttachmentsService.remove(expenseId, file.id);
      const nextFiles = storedFiles.filter(item => item.id !== file.id);
      setStoredFiles(nextFiles);
      onChanged?.(nextFiles.map(item => item.originalFilename));
    } catch (error) {
      setErrorMessage(messageFrom(error));
    }
  };

  const removeLocalFile = (id: string) => {
    const fileToRemove = localFiles.find(file => file.id === id);
    revokeLocalObjectUrl(fileToRemove, objectUrlsRef.current);
    const updatedFiles = localFiles.filter(file => file.id !== id);
    setLocalFiles(updatedFiles);
    onSave?.(updatedFiles.map(serializeLocalAttachment));
  };

  const filesCount = usesBackend ? storedFiles.length : localFiles.length;
  const totalSize = usesBackend
    ? storedFiles.reduce((sum, file) => sum + file.sizeBytes, 0)
    : localFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-gray-800">
        <div className="flex flex-shrink-0 items-center justify-between px-6 py-4 text-white" style={{ backgroundColor: accent }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20">
              <Paperclip className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t.expenses.attachments.title}</h2>
              <p className="text-sm text-white/90">{expenseFolio} - {expenseConcept}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white" aria-label={t.columnModal.close} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <UploadDropzone
            accent={accent}
            accentText={accentText}
            disabled={isUploading}
            isDragging={isDragging}
            onDragChange={setIsDragging}
            onFiles={addFiles}
          />

          {errorMessage && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t.expenses.attachments.attachedFiles(filesCount)}
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t.expenses.attachments.total}: {formatFileSize(totalSize)}
              </span>
            </div>
            {isLoading ? (
              <EmptyState label="Loading attachments..." />
            ) : usesBackend ? (
              <BackendFiles files={storedFiles} onRemove={removeBackendFile} />
            ) : (
              <LocalFiles files={localFiles} onRemove={removeLocalFile} />
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center justify-between gap-3 px-6 py-4 text-white" style={{ backgroundColor: accent }}>
          <p className="text-xs text-white/80">{usesBackend ? 'Files are stored in document storage.' : t.expenses.attachments.saveHint}</p>
          <button onClick={onClose} type="button" className="rounded-xl bg-white px-5 py-2 text-sm font-semibold shadow-sm transition-colors hover:bg-slate-50" style={{ color: accentText }}>
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadDropzone({
  accent,
  accentText,
  disabled,
  isDragging,
  onDragChange,
  onFiles,
}: {
  accent: string;
  accentText: string;
  disabled: boolean;
  isDragging: boolean;
  onDragChange: (value: boolean) => void;
  onFiles: (files: File[]) => void;
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
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Add evidence</h3>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">Photos, PDF, Word, Excel, CSV or TXT. 10MB max per file.</p>
        <label className={disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}>
          <input type="file" multiple onChange={(event) => void onFiles(Array.from(event.target.files ?? []))} disabled={disabled} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" />
          <span className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors" style={{ backgroundColor: accent }}>
            <Upload className="h-4 w-4" />
            {disabled ? 'Uploading...' : 'Select files'}
          </span>
        </label>
      </div>
    </div>
  );
}

function BackendFiles({ files, onRemove }: { files: ExpenseAttachment[]; onRemove: (file: ExpenseAttachment) => void }) {
  if (files.length === 0) return <EmptyState label="No attachments registered yet." />;
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
          onRemove={() => void onRemove(file)}
        />
      ))}
    </div>
  );
}

function LocalFiles({ files, onRemove }: { files: LocalAttachment[]; onRemove: (id: string) => void }) {
  if (files.length === 0) return <EmptyState label="No attachments registered yet." />;
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
        />
      ))}
    </div>
  );
}

function FileRow({ name, onRemove, size, type, uploadedAt, url }: { name: string; onRemove: () => void; size: number; type: string; uploadedAt?: string; url?: string }) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors dark:border-gray-600 dark:bg-gray-700/50">
      <div className="flex-shrink-0">{type.startsWith('image/') ? <ImageIcon className="h-5 w-5 text-blue-500" /> : <File className="h-5 w-5 text-gray-500" />}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(size)}{uploadedAt ? ` - ${new Date(uploadedAt).toLocaleDateString()}` : ''}</p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => url && window.open(url, '_blank', 'noopener,noreferrer')} type="button" disabled={!url} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400">
          <ExternalLink className="h-4 w-4" />
          Open
        </button>
        <button onClick={() => downloadFile(name, url)} type="button" disabled={!url} className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent">
          <Download className="h-4 w-4" />
        </button>
        <button onClick={onRemove} type="button" className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-sm font-semibold text-slate-500">
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

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'Attachment operation failed.';
}
