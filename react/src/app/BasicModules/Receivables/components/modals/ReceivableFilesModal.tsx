import { Download, ExternalLink, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../components/ui/utils';
import {
  moduleModalOutlineButtonClassName,
} from '../../constants/receivables.constants';
import type { ReceivablesTranslations } from '../../translations';
import type { ReceivablePayment } from '../../types';
import { formatMoney } from '../../utils';
import { ReceivablesModalFrame } from './ReceivablesModalFrame';
import { ReceivablesModalActionToolbar } from './ReceivablesModalActionToolbar';

function getPaymentReceiptDataUrl(payment: ReceivablePayment) {
  return payment.receiptDataUrl ?? payment.receiptImageDataUrl ?? '';
}

function hasPaymentReceipt(payment: ReceivablePayment) {
  return Boolean(payment.receiptFileName || getPaymentReceiptDataUrl(payment));
}

function isImageReceipt(payment: ReceivablePayment) {
  return Boolean(payment.receiptMimeType?.startsWith('image/') && getPaymentReceiptDataUrl(payment));
}

function isPdfReceipt(payment: ReceivablePayment) {
  return payment.receiptMimeType === 'application/pdf' || payment.receiptFileName?.toLowerCase().endsWith('.pdf');
}

export function ReceivableFilesModal({
  copy,
  description,
  onClose,
  payments,
  title,
}: {
  copy: ReceivablesTranslations;
  description?: string;
  onClose: () => void;
  payments: ReceivablePayment[];
  title?: string;
}) {
  const files = payments.filter(hasPaymentReceipt);

  return (
    <ReceivablesModalFrame
      closeLabel={copy.common.close}
      description={description ?? copy.modals.files.description}
      icon={<FileText className="h-5 w-5" />}
      onClose={onClose}
      title={title ?? copy.modals.files.title}
      footer={(
        <Button type="button" variant="outline" className={moduleModalOutlineButtonClassName} onClick={onClose}>
          {copy.common.close}
        </Button>
      )}
    >
      {files.length > 0 ? (
        <div className="space-y-3">
          {files.map((payment) => {
            const dataUrl = getPaymentReceiptDataUrl(payment);
            const fileName = payment.receiptFileName ?? copy.modals.files.title;
            const isImage = isImageReceipt(payment);
            const isPdf = isPdfReceipt(payment);

            return (
              <article
                key={`${payment.id}-${fileName}`}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="grid gap-0 md:grid-cols-[180px_1fr]">
                  <div className="flex min-h-36 items-center justify-center border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950 md:border-b-0 md:border-r">
                    {isImage && dataUrl ? (
                      <img
                        src={dataUrl}
                        alt={fileName}
                        className="h-28 w-full rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                      />
                    ) : (
                      <span className={cn(
                        'flex h-16 w-16 items-center justify-center rounded-xl ring-1',
                        isPdf
                          ? 'bg-red-50 text-red-600 ring-red-100 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-900/60'
                          : 'bg-[#147514]/10 text-[#147514] ring-[#147514]/15 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20',
                      )}
                      >
                        {isImage ? <ImageIcon className="h-7 w-7" /> : <FileText className="h-7 w-7" />}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-base font-medium text-slate-950 dark:text-white">{fileName}</p>
                        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                          {payment.saleNumber} · {payment.customerName}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {dataUrl ? (
                          <ReceivablesModalActionToolbar actions={[
                            { href: dataUrl, icon: <ExternalLink className="h-4 w-4" />, label: copy.modals.files.open },
                            { download: true, href: dataUrl, icon: <Download className="h-4 w-4" />, label: copy.modals.files.download, tone: 'primary' },
                          ]} />
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm font-medium text-slate-600 dark:text-slate-300 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                        <p className="text-xs font-medium text-slate-400">{copy.modals.files.registeredOn}</p>
                        <p className="mt-1">{payment.paymentDate}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                        <p className="text-xs font-medium text-slate-400">{copy.modals.files.amount}</p>
                        <p className="mt-1 text-[#147514]">{formatMoney(payment.amount, payment.currency)}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                        <p className="text-xs font-medium text-slate-400">{copy.modals.files.reference}</p>
                        <p className="mt-1 truncate">{payment.reference}</p>
                      </div>
                    </div>

                    {!isImage && !isPdf ? (
                      <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                        {copy.modals.files.noPreview}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <FileText className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-300">{copy.modals.files.empty}</p>
        </div>
      )}
    </ReceivablesModalFrame>
  );
}
