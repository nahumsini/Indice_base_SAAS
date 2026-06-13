import { useEffect, useRef, useState } from 'react';
import { X, Upload, File, Image as ImageIcon, Trash2, Download, Paperclip, ExternalLink } from 'lucide-react';
import { useFinanceTranslations } from '../../hooks/useFinanceTranslations';

interface Attachment {
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
  onSave: (attachments: string[]) => void;
}

export function AttachmentsModal({
  isOpen,
  onClose,
  expenseFolio,
  expenseConcept,
  attachments,
  onSave,
}: AttachmentsModalProps) {
  const t = useFinanceTranslations();
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const didSaveRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<Attachment[]>(
    attachments.map((name, index) => createStoredAttachment(name, index))
  );

  useEffect(() => () => {
    if (didSaveRef.current) return;
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    const attachments: Attachment[] = newFiles.map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: createObjectUrl(file, objectUrlsRef.current),
      isLocalObjectUrl: true,
      uploadedAt: new Date(),
    }));

    setFiles([...files, ...attachments]);
  };

  const removeFile = (id: string) => {
    const fileToRemove = files.find(file => file.id === id);
    revokeLocalObjectUrl(fileToRemove, objectUrlsRef.current);
    setFiles(files.filter(f => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-blue-500" />;
    }
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const handleSave = () => {
    didSaveRef.current = true;
    onSave(files.map(serializeAttachment));
    onClose();
  };

  const openFile = (file: Attachment) => {
    if (!file.url) return;
    window.open(file.url, '_blank', 'noopener,noreferrer');
  };

  const downloadFile = (file: Attachment) => {
    if (!file.url) return;
    const anchor = document.createElement('a');
    anchor.href = file.url;
    anchor.download = file.name;
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#147514] dark:bg-[#0b3f1b] rounded-t-2xl px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 dark:bg-white/10 rounded-lg flex items-center justify-center">
              <Paperclip className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{t.expenses.attachments.title}</h2>
              <p className="text-sm text-white/90">
                {expenseFolio} - {expenseConcept}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
            aria-label={t.columnModal.close}
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-all
              ${isDragging
                ? 'border-[#147514] bg-green-50 dark:bg-green-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-[#147514] dark:hover:border-[#147514]'
              }
            `}
          >
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-[#147514]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t.expenses.attachments.dragTitle}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t.expenses.attachments.dragDescription}
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                />
                <span className="px-4 py-2 text-sm font-medium text-white bg-[#147514] hover:bg-[#0f5e0f] rounded-lg transition-colors inline-flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  {t.expenses.attachments.selectFiles}
                </span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                {t.expenses.attachments.supportedFormats}
              </p>
            </div>
          </div>

          {/* Files List */}
          {files.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t.expenses.attachments.attachedFiles(files.length)}
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t.expenses.attachments.total}: {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
                </span>
              </div>

              <div className="space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-[#147514] dark:hover:border-[#147514] transition-colors group"
                  >
                    {/* File Icon */}
                    <div className="flex-shrink-0">
                      {getFileIcon(file.type)}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)} • {file.uploadedAt.toLocaleDateString(t.locale)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openFile(file)}
                        type="button"
                        disabled={!file.url}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:border-blue-900/40 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-blue-900/30 dark:disabled:border-slate-700 dark:disabled:bg-slate-800/60 dark:disabled:text-slate-500"
                        title={file.url ? t.expenses.attachments.open : t.expenses.attachments.previewUnavailable}
                        aria-label={file.url ? t.expenses.attachments.open : t.expenses.attachments.previewUnavailable}
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>{t.expenses.attachments.open}</span>
                      </button>
                      <button
                        onClick={() => downloadFile(file)}
                        type="button"
                        disabled={!file.url}
                        className="p-2 text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent dark:hover:bg-blue-900/30 dark:disabled:text-slate-500 rounded-lg transition-colors"
                        title={file.url ? t.expenses.attachments.download : t.expenses.attachments.previewUnavailable}
                        aria-label={file.url ? t.expenses.attachments.download : t.expenses.attachments.previewUnavailable}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeFile(file.id)}
                        type="button"
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title={t.common.delete}
                        aria-label={t.common.delete}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {files.length === 0 && (
            <div className="mt-8 text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Paperclip className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t.expenses.attachments.empty}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl flex-shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t.expenses.attachments.saveHint}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={handleSave}
              type="button"
              className="px-5 py-2 text-sm font-medium text-white bg-[#147514] hover:bg-[#0f5e0f] rounded-lg transition-colors shadow-sm flex items-center gap-2"
            >
              <Paperclip className="w-4 h-4" />
              {t.expenses.attachments.saveFiles(files.length)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const LOCAL_ATTACHMENT_PREFIX = 'indice-local-attachment:';

function createStoredAttachment(value: string, index: number): Attachment {
  const serializedAttachment = parseSerializedAttachment(value);
  if (serializedAttachment) {
    return {
      ...serializedAttachment,
      id: `file-${index}`,
      uploadedAt: serializedAttachment.uploadedAt,
    };
  }

  const name = value;
  const url = isOpenableUrl(name) ? name : undefined;
  const displayName = url ? getFileNameFromUrl(url) : name;

  return {
    id: `file-${index}`,
    name: displayName,
    size: Math.floor(Math.random() * 5000000) + 100000,
    type: getFileType(displayName),
    url,
    uploadedAt: new Date(),
  };
}

function serializeAttachment(file: Attachment) {
  if (!file.url || !file.isLocalObjectUrl) return file.url && isOpenableUrl(file.url) ? file.url : file.name;
  return `${LOCAL_ATTACHMENT_PREFIX}${encodeURIComponent(JSON.stringify({
    name: file.name,
    size: file.size,
    type: file.type,
    url: file.url,
    uploadedAt: file.uploadedAt.toISOString(),
  }))}`;
}

function parseSerializedAttachment(value: string): Attachment | null {
  if (!value.startsWith(LOCAL_ATTACHMENT_PREFIX)) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value.slice(LOCAL_ATTACHMENT_PREFIX.length))) as {
      name?: string;
      size?: number;
      type?: string;
      url?: string;
      uploadedAt?: string;
    };

    if (!parsed.name || !parsed.url) return null;

    const uploadedAt = parsed.uploadedAt ? new Date(parsed.uploadedAt) : new Date();
    return {
      id: '',
      name: parsed.name,
      size: Number.isFinite(parsed.size) ? Number(parsed.size) : 0,
      type: parsed.type || getFileType(parsed.name),
      url: parsed.url,
      isLocalObjectUrl: parsed.url.startsWith('blob:'),
      uploadedAt: Number.isNaN(uploadedAt.getTime()) ? new Date() : uploadedAt,
    };
  } catch {
    return null;
  }
}

function createObjectUrl(file: File, objectUrls: Set<string>) {
  const url = URL.createObjectURL(file);
  objectUrls.add(url);
  return url;
}

function revokeLocalObjectUrl(file: Attachment | undefined, objectUrls: Set<string>) {
  if (!file?.isLocalObjectUrl || !file.url) return;
  URL.revokeObjectURL(file.url);
  objectUrls.delete(file.url);
}

function isOpenableUrl(value: string) {
  return /^(https?:|blob:|data:)/i.test(value);
}

function getFileNameFromUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const lastSegment = parsedUrl.pathname.split('/').filter(Boolean).pop();
    return lastSegment ? decodeURIComponent(lastSegment) : url;
  } catch {
    return url;
  }
}

function getFileType(name: string) {
  const normalizedName = name.toLowerCase();
  if (normalizedName.endsWith('.pdf')) return 'application/pdf';
  if (normalizedName.endsWith('.png')) return 'image/png';
  if (normalizedName.endsWith('.jpg') || normalizedName.endsWith('.jpeg') || normalizedName.endsWith('.webp')) return 'image/jpeg';
  return 'application/octet-stream';
}
