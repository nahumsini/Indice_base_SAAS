import { useId, useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  completeKioskIdempotentOperation,
  kioskIdempotencyKeyFor,
} from '../../../../components/kiosk-engine/kioskIdempotency';
import { Input } from '../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import { SalesModalFrame } from '../../components/SalesModalFrame';
import { getSalesModalActionClassNames } from '../../salesModalStyles';
import type { ProductsTranslations } from '../translations';
import { formatProductCurrency } from '../utils/productFormatters';
import type { PublicCatalogCartItem, PublicCatalogContactMethod } from './types/publicCatalogTypes';

const requestActionClassNames = getSalesModalActionClassNames('coral');
const requestOperation = 'sales-public-catalog-request';

export function PublicCatalogRequestModal({
  open,
  cartItems,
  estimatedTotal,
  t,
  onOpenChange,
  onSubmit,
  showPrices = true,
  online = true,
}: {
  open: boolean;
  cartItems: PublicCatalogCartItem[];
  estimatedTotal: number;
  t: ProductsTranslations;
  onOpenChange: (open: boolean) => void;
  showPrices?: boolean;
  online?: boolean;
  onSubmit?: (request: {
    customerName: string;
    contact: string;
    preferredContactMethod: PublicCatalogContactMethod;
    message: string;
  }, idempotencyKey: string) => Promise<{ requestNumber: string }>;
}) {
  const estimatedCurrency = cartItems.map((item) => item.currency).find(Boolean);
  const [customerName, setCustomerName] = useState('');
  const [contact, setContact] = useState('');
  const [preferredContactMethod, setPreferredContactMethod] = useState<PublicCatalogContactMethod>('whatsapp');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [requestNumber, setRequestNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const customerNameId = useId();
  const contactId = useId();
  const preferredContactId = useId();
  const messageId = useId();
  const contactInputType = preferredContactMethod === 'email'
    ? 'email'
    : preferredContactMethod === 'website'
      ? 'url'
      : 'tel';
  const contactAutoComplete = preferredContactMethod === 'email'
    ? 'email'
    : preferredContactMethod === 'website'
      ? 'url'
      : 'tel';
  const handleSubmit = async () => {
    if (!online) {
      setError(t.publicCatalog.publicOffline);
      return;
    }
    if (!customerName.trim() || !contact.trim()) {
      setError(t.publicCatalog.requestModal.requiredContactError);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const request = {
        customerName: customerName.trim(),
        contact: contact.trim(),
        preferredContactMethod,
        message: message.trim(),
      };
      const result = onSubmit
        ? await onSubmit(request, kioskIdempotencyKeyFor(requestOperation, request))
        : { requestNumber: '' };
      completeKioskIdempotentOperation(requestOperation);
      setRequestNumber(result.requestNumber);
      setSuccess(true);
    } catch {
      setError(t.publicCatalog.requestModal.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSuccess(false);
      setRequestNumber('');
      setError('');
      setCustomerName('');
      setContact('');
      setPreferredContactMethod('whatsapp');
      setMessage('');
    }
    onOpenChange(nextOpen);
  };

  return (
    <SalesModalFrame
      open={open}
      onOpenChange={handleOpenChange}
      title={t.publicCatalog.requestModal.title}
      description={t.publicCatalog.requestModal.description}
      icon={<Send className="h-5 w-5" />}
      contentClassName="max-w-xl"
      bodyClassName="!max-h-none bg-slate-50/70 p-0 dark:bg-slate-950"
      footer={(
        <>
          <Button variant="outline" className={requestActionClassNames.secondary} onClick={() => handleOpenChange(false)}>
            {t.common.close ?? t.common.cancel}
          </Button>
          {!success ? (
            <Button className={requestActionClassNames.primary} disabled={submitting || !online} onClick={() => void handleSubmit()}>
              {submitting ? t.publicCatalog.sending : t.publicCatalog.sendRequest}
            </Button>
          ) : null}
        </>
      )}
    >
        <div className="space-y-4 bg-slate-50/70 p-6 dark:bg-slate-950">
          {success ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-700">
              <h3 className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-5 w-5" />
                {t.publicCatalog.requestModal.successTitle}
              </h3>
              <p className="mt-2 text-sm font-medium leading-6">{t.publicCatalog.requestModal.successDescription}</p>
              {requestNumber ? (
                <p className="mt-3 rounded-lg border border-emerald-200 bg-white px-3 py-3 text-center font-mono text-lg font-medium text-emerald-800">
                  {requestNumber}
                </p>
              ) : null}
              <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-medium text-emerald-700">{t.publicCatalog.futureOpportunityNote}</p>
            </div>
          ) : (
            <>
              {error ? (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor={customerNameId} className="text-sm font-medium text-slate-600 dark:text-slate-300">{t.publicCatalog.requestModal.customerName}</label>
                  <Input id={customerNameId} required maxLength={180} autoComplete="name" className="h-11 rounded-lg" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <label htmlFor={contactId} className="text-sm font-medium text-slate-600 dark:text-slate-300">{t.publicCatalog.requestModal.contact}</label>
                  <Input id={contactId} required maxLength={240} type={contactInputType} autoComplete={contactAutoComplete} className="h-11 rounded-lg" value={contact} onChange={(event) => setContact(event.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor={preferredContactId} className="text-sm font-medium text-slate-600 dark:text-slate-300">{t.publicCatalog.requestModal.preferredContactMethod}</label>
                <Select value={preferredContactMethod} onValueChange={(value) => setPreferredContactMethod(value as PublicCatalogContactMethod)}>
                  <SelectTrigger id={preferredContactId} className="h-11 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">{t.publicCatalog.contactMethods.whatsapp}</SelectItem>
                    <SelectItem value="email">{t.publicCatalog.contactMethods.email}</SelectItem>
                    <SelectItem value="phone">{t.publicCatalog.contactMethods.phone}</SelectItem>
                    <SelectItem value="website">{t.publicCatalog.contactMethods.website}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label htmlFor={messageId} className="text-sm font-medium text-slate-600 dark:text-slate-300">{t.publicCatalog.requestModal.message}</label>
                <Textarea id={messageId} maxLength={4000} className="min-h-24 rounded-lg" value={message} onChange={(event) => setMessage(event.target.value)} />
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {t.publicCatalog.requestModal.estimatedTotal}: {showPrices ? formatProductCurrency(estimatedTotal, estimatedCurrency) : t.publicCatalog.pricePending} · {cartItems.length} {t.publicCatalog.requestModal.items}
              </div>
              <p className="text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                {t.publicCatalog.requestModal.totalDisclaimer}
              </p>
            </>
          )}
        </div>
    </SalesModalFrame>
  );
}
