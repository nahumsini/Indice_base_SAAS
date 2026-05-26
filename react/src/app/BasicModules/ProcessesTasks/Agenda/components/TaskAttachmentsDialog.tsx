import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  Download,
  File,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { cn } from '../../../../components/ui/utils';
import {
  deleteTaskAttachment,
  listTaskAttachments,
  presignTaskAttachmentUpload,
  registerTaskAttachment,
  uploadTaskAttachment,
  type TaskAttachmentRecord,
} from '../../Tasks/tasksApi';
import type { AgendaTaskItem } from '../agendaApi';
import { defaultAgendaTranslations, type AgendaTranslations } from '../translations';

const maxAttachmentSizeBytes = 10 * 1024 * 1024;
const acceptedAttachmentTypes = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
]);
const attachmentContentTypeAliases = new Map([
  ['image/jpg', 'image/jpeg'],
  ['image/pjpeg', 'image/jpeg'],
]);

interface TaskAttachmentsDialogProps {
  commonCopy?: AgendaTranslations['common'];
  copy?: AgendaTranslations['attachmentsDialog'];
  open: boolean;
  task: AgendaTaskItem | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void | Promise<void>;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAttachmentDate(value: string | null, fallback: string) {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function contentTypeFromName(fileName: string) {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.jfif')) return 'image/jpeg';
  if (lowerName.endsWith('.gif')) return 'image/gif';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  if (lowerName.endsWith('.heic')) return 'image/heic';
  if (lowerName.endsWith('.heif')) return 'image/heif';
  if (lowerName.endsWith('.doc')) return 'application/msword';
  if (lowerName.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lowerName.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (lowerName.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (lowerName.endsWith('.csv')) return 'text/csv';
  if (lowerName.endsWith('.txt')) return 'text/plain';

  return '';
}

function normalizedFileContentType(file: File) {
  const browserType = file.type.trim().toLowerCase();
  const aliasedBrowserType = attachmentContentTypeAliases.get(browserType) ?? browserType;

  if (acceptedAttachmentTypes.has(aliasedBrowserType)) {
    return aliasedBrowserType;
  }

  return contentTypeFromName(file.name);
}

function isPreviewableImage(attachment: TaskAttachmentRecord) {
  return attachment.mimeType.startsWith('image/') && Boolean(attachment.downloadUrl);
}

function fileIconForType(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return <ImageIcon className="h-5 w-5 text-blue-600" />;
  }

  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') {
    return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />;
  }

  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType === 'text/plain') {
    return <FileText className="h-5 w-5 text-amber-600" />;
  }

  return <File className="h-5 w-5 text-slate-500" />;
}

export function TaskAttachmentsDialog({
  commonCopy = defaultAgendaTranslations.common,
  copy = defaultAgendaTranslations.attachmentsDialog,
  open,
  task,
  onOpenChange,
  onChanged,
}: TaskAttachmentsDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<TaskAttachmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingAttachmentIds, setDeletingAttachmentIds] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadAttachments = useCallback(async () => {
    if (!task) {
      setAttachments([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setAttachments(await listTaskAttachments(task.taskId));
    } catch (loadError) {
      setAttachments([]);
      setError(getErrorMessage(loadError, copy.errors.load));
    } finally {
      setIsLoading(false);
    }
  }, [task]);

  useEffect(() => {
    if (!open) {
      setAttachments([]);
      setError(null);
      setIsDragging(false);
      return;
    }

    void reloadAttachments();
  }, [open, reloadAttachments]);

  const uploadFiles = async (files: File[]) => {
    if (!task || files.length === 0) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      for (const file of files) {
        if (file.size > maxAttachmentSizeBytes) {
          throw new Error(copy.errors.tooLarge(file.name));
        }

        const contentType = normalizedFileContentType(file);
        if (!contentType || !acceptedAttachmentTypes.has(contentType)) {
          throw new Error(copy.errors.unsupported(file.name));
        }

        const presigned = await presignTaskAttachmentUpload(task.taskId, {
          file_name: file.name,
          content_type: contentType,
          size_bytes: file.size,
        });

        await uploadTaskAttachment(
          presigned.upload_url,
          file,
          contentType,
          presigned.upload_headers ?? {},
        );

        await registerTaskAttachment(task.taskId, {
          object_key: presigned.object_key,
          original_filename: file.name,
          mime_type: contentType,
          size_bytes: file.size,
        });
      }

      await reloadAttachments();
      await onChanged();
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, copy.errors.upload));
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';
    void uploadFiles(selectedFiles);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void uploadFiles(Array.from(event.dataTransfer.files));
  };

  const handleDeleteAttachment = async (attachment: TaskAttachmentRecord) => {
    if (!task) {
      return;
    }

    setDeletingAttachmentIds((currentIds) => [...currentIds, attachment.id]);
    setError(null);

    try {
      await deleteTaskAttachment(task.taskId, attachment.id);
      await reloadAttachments();
      await onChanged();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, copy.errors.delete));
    } finally {
      setDeletingAttachmentIds((currentIds) => currentIds.filter((id) => id !== attachment.id));
    }
  };

  const totalSize = attachments.reduce((sum, attachment) => sum + attachment.sizeBytes, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="!flex h-[min(88vh,820px)] w-[calc(100vw-2rem)] !max-w-[880px] max-h-[calc(100vh-3rem)] flex-col gap-0 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white p-0 shadow-[0_30px_80px_rgba(15,23,42,0.22)] sm:!max-w-[880px] dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="shrink-0 bg-[#F4C84A] px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 pr-4">
              <DialogTitle className="flex min-w-0 items-center gap-2 text-[1.2rem] font-bold leading-tight text-slate-950 sm:text-[1.4rem]">
                <Paperclip className="h-5 w-5 shrink-0" />
                <span className="truncate">{copy.title}</span>
              </DialogTitle>
              <DialogDescription className="mt-1 truncate text-sm font-medium text-slate-800/90">
                {task ? `${task.folio} - ${task.title}` : copy.fallbackSubtitle}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-2xl border-[#9A6B05]/25 bg-white/35 px-3 text-slate-950 hover:bg-white/60 hover:text-slate-950"
              >
                {commonCopy.close}
              </Button>
            </DialogClose>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-5 py-5 dark:bg-slate-900/60">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(260px,320px)_1fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div
                className={cn(
                  'flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-6 text-center transition-colors',
                  isDragging
                    ? 'border-[#F4C84A] bg-[#F4C84A]/10'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70',
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4C84A]/15 text-[#9A6B05]">
                  {isUploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <Upload className="h-7 w-7" />}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isUploading ? copy.uploadingTitle : copy.addTitle}
                </h3>
                <p className="mt-2 text-sm leading-5 text-slate-500 dark:text-slate-400">
                  {copy.helpText}
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/heic,image/heif,.jpg,.jpeg,.jfif,.png,.gif,.webp,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  className="mt-5 h-10 rounded-xl bg-[#F4C84A] px-4 text-sm font-semibold text-slate-950 hover:bg-[#E5B835]"
                  disabled={isUploading}
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {copy.selectFiles}
                </Button>
              </div>

              {error ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                  {error}
                </div>
              ) : null}
            </section>

            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{copy.filesTitle}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {copy.filesCount(attachments.length, formatFileSize(totalSize))}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="w-fit rounded-full border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                >
                  {commonCopy.evidence}
                </Badge>
              </div>

              {isLoading ? (
                <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {copy.loading}
                </div>
              ) : attachments.length === 0 ? (
                <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-6 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
                  {copy.empty}
                </div>
              ) : (
                <div className="space-y-2">
                  {attachments.map((attachment) => {
                    const isDeleting = deletingAttachmentIds.includes(attachment.id);
                    const showPreview = isPreviewableImage(attachment);

                    return (
                      <div
                        key={attachment.id}
                        className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm dark:bg-slate-800">
                          {showPreview ? (
                            <img
                              src={attachment.downloadUrl ?? ''}
                              alt={attachment.originalFilename}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            fileIconForType(attachment.mimeType)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {attachment.originalFilename}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                            {formatFileSize(attachment.sizeBytes)} · {formatAttachmentDate(attachment.createdAt, commonCopy.noDate)}
                            {attachment.uploadedByName ? ` · ${attachment.uploadedByName}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title={commonCopy.download}
                            aria-label={commonCopy.download}
                            disabled={!attachment.downloadUrl || isDeleting}
                            className="h-9 w-9 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            onClick={() => {
                              if (attachment.downloadUrl) {
                                window.open(attachment.downloadUrl, '_blank', 'noopener,noreferrer');
                              }
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title={commonCopy.delete}
                            aria-label={commonCopy.delete}
                            disabled={isDeleting}
                            className="h-9 w-9 rounded-xl border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300"
                            onClick={() => {
                              void handleDeleteAttachment(attachment);
                            }}
                          >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-slate-200/80 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-slate-200 bg-white px-6 text-sm font-semibold dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              {commonCopy.close}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
