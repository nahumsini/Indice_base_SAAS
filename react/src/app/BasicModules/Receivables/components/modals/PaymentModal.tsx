import { useEffect, useRef, useState } from 'react';
import { Banknote, FileText, Image as ImageIcon, Upload, X } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { cn } from '../../../../components/ui/utils';
import { FilterSelect } from '../ReceivablesFilters';
import {
  financeTextClass,
  moduleModalOutlineButtonClassName,
  moduleModalPrimaryButtonClassName,
} from '../../constants/receivables.constants';
import type { ReceivablesTranslations } from '../../translations';
import type { PaymentMethod, ReceivableAccount, ReceivablePayment } from '../../types';
import { formatMoney, todayIso } from '../../utils';
import { ReceivablesModalFrame } from './ReceivablesModalFrame';

interface PaymentModalProps {
  accounts: ReceivableAccount[];
  copy: ReceivablesTranslations;
  initialAmount?: number;
  initialReceivableId?: string;
  onClose: () => void;
  onSubmit: (payment: Omit<ReceivablePayment, 'id'>) => void;
}

export function PaymentModal({
  accounts,
  copy,
  initialAmount,
  initialReceivableId,
  onClose,
  onSubmit,
}: PaymentModalProps) {
  const receiptInputRef = useRef<HTMLInputElement | null>(null);
  const [receivableId, setReceivableId] = useState(initialReceivableId ?? accounts[0]?.id ?? '');
  const selectedAccount = accounts.find((account) => account.id === receivableId) ?? accounts[0] ?? null;
  const [amount, setAmount] = useState(selectedAccount?.installmentAmount ?? 0);
  const [method, setMethod] = useState<PaymentMethod>('transfer');
  const [reference, setReference] = useState('');
  const [registeredBy, setRegisteredBy] = useState(copy.common.financeUser);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptDataUrl, setReceiptDataUrl] = useState('');
  const isReceiptImage = Boolean(receiptFile?.type.startsWith('image/') && receiptDataUrl);

  useEffect(() => {
    if (initialReceivableId && accounts.some((account) => account.id === initialReceivableId)) {
      setReceivableId(initialReceivableId);
    }
  }, [accounts, initialReceivableId]);

  useEffect(() => {
    const suggestedAmount = initialAmount ?? selectedAccount?.installmentAmount ?? 0;
    setAmount(selectedAccount ? Math.min(suggestedAmount, selectedAccount.balance) : 0);
  }, [initialAmount, selectedAccount]);

  const handleReceiptFileChange = (file: File | null) => {
    if (!file) {
      setReceiptFile(null);
      setReceiptDataUrl('');
      return;
    }

    setReceiptFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setReceiptDataUrl(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsDataURL(file);
  };

  const clearReceiptFile = () => {
    setReceiptFile(null);
    setReceiptDataUrl('');
    if (receiptInputRef.current) {
      receiptInputRef.current.value = '';
    }
  };

  return (
    <ReceivablesModalFrame
      description={copy.modals.payment.description}
      icon={<Banknote className="h-5 w-5" />}
      maxWidthClassName="max-w-2xl"
      onClose={onClose}
      title={copy.modals.payment.title}
      footer={(
        <>
          <Button type="button" variant="outline" className={moduleModalOutlineButtonClassName} onClick={onClose}>
            {copy.common.cancel}
          </Button>
          <Button
            type="button"
            disabled={!selectedAccount || amount <= 0}
            className={moduleModalPrimaryButtonClassName}
            onClick={() => {
              if (!selectedAccount) {
                return;
              }
              onSubmit({
                receivableId: selectedAccount.id,
                saleNumber: selectedAccount.saleNumber,
                customerName: selectedAccount.customerName,
                currency: selectedAccount.currency,
                paymentDate: todayIso(),
                method,
                amount: Math.min(amount, selectedAccount.balance),
                reference: reference || copy.common.noReference,
                registeredBy: registeredBy || copy.common.financeUser,
                receiptDataUrl: receiptDataUrl || undefined,
                receiptFileName: receiptFile?.name,
                receiptImageDataUrl: isReceiptImage ? receiptDataUrl : undefined,
                receiptMimeType: receiptFile?.type,
              });
            }}
          >
            {copy.modals.payment.save}
          </Button>
        </>
      )}
    >
      {selectedAccount ? (
        <div className="space-y-4">
          <FilterSelect
            label={copy.modals.payment.account}
            value={selectedAccount.id}
            onChange={setReceivableId}
            options={accounts.map((account) => ({
              value: account.id,
              label: `${account.saleNumber} - ${account.customerName}`,
            }))}
          />
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm font-bold text-slate-500">{copy.modals.payment.pendingBalance}</p>
            <p className={cn('mt-1 text-2xl font-black', financeTextClass)}>
              {formatMoney(selectedAccount.balance, selectedAccount.currency)}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.modals.payment.amount}</span>
              <Input
                type="number"
                min="0"
                max={selectedAccount.balance}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="h-11 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <FilterSelect
              label={copy.modals.payment.method}
              value={method}
              onChange={(value) => setMethod(value as PaymentMethod)}
              options={Object.entries(copy.paymentMethods).map(([value, label]) => ({ value, label }))}
            />
            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.modals.payment.reference}</span>
              <Input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.modals.payment.registeredBy}</span>
              <Input
                value={registeredBy}
                onChange={(event) => setRegisteredBy(event.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.modals.payment.receipt}</p>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{copy.modals.payment.receiptHint}</p>
              </div>
              {receiptFile ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={copy.modals.payment.removeReceipt}
                  title={copy.modals.payment.removeReceipt}
                  onClick={clearReceiptFile}
                  className="h-9 w-9 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-950/50 dark:hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#147514]/30 bg-[#147514]/5 px-4 py-4 text-center text-sm font-bold text-[#147514] transition hover:border-[#147514]/50 hover:bg-[#147514]/10 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300 dark:hover:bg-emerald-400/15">
              {receiptDataUrl ? (
                <div className="flex w-full items-center gap-4 text-left">
                  {isReceiptImage ? (
                    <img
                      src={receiptDataUrl}
                      alt={receiptFile?.name ?? copy.modals.payment.receipt}
                      className="h-24 w-24 rounded-xl border border-white/70 object-cover shadow-sm dark:border-slate-700"
                    />
                  ) : (
                    <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white text-[#147514] shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-300">
                      <FileText className="h-8 w-8" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-800 dark:text-white">{receiptFile?.name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {copy.modals.payment.replaceReceipt}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#147514] shadow-sm dark:bg-slate-900 dark:text-emerald-300">
                    <ImageIcon className="h-5 w-5" />
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    {copy.modals.payment.uploadReceipt}
                  </span>
                </>
              )}
              <input
                ref={receiptInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.xml,.ofx"
                className="sr-only"
                onChange={(event) => handleReceiptFileChange(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          {copy.modals.payment.noAccounts}
        </p>
      )}
    </ReceivablesModalFrame>
  );
}
