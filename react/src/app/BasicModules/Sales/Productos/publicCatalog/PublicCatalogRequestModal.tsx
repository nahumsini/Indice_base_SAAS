import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Input } from '../../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Textarea } from '../../../../components/ui/textarea';
import type { ProductsTranslations } from '../translations';
import { formatProductCurrency } from '../utils/productFormatters';
import type { PublicCatalogCartItem, PublicCatalogContactMethod } from './types/publicCatalogTypes';

export function PublicCatalogRequestModal({
  open,
  cartItems,
  estimatedTotal,
  t,
  onOpenChange,
}: {
  open: boolean;
  cartItems: PublicCatalogCartItem[];
  estimatedTotal: number;
  t: ProductsTranslations;
  onOpenChange: (open: boolean) => void;
}) {
  const [customerName, setCustomerName] = useState('');
  const [contact, setContact] = useState('');
  const [preferredContactMethod, setPreferredContactMethod] = useState<PublicCatalogContactMethod>('whatsapp');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = () => {
    setSuccess(true);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSuccess(false);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl rounded-lg border-slate-200 p-0">
        <DialogHeader className="rounded-t-lg bg-[#FF6B5E] px-6 py-5 text-white">
          <DialogTitle className="flex items-center gap-2 text-2xl font-black">
            <Send className="h-5 w-5" />
            {t.publicCatalog.requestModal.title}
          </DialogTitle>
          <DialogDescription className="font-semibold text-white/85">{t.publicCatalog.requestModal.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-6">
          {success ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-700">
              <h3 className="flex items-center gap-2 font-black">
                <CheckCircle2 className="h-5 w-5" />
                {t.publicCatalog.requestModal.successTitle}
              </h3>
              <p className="mt-2 text-sm font-semibold leading-6">{t.publicCatalog.requestModal.successDescription}</p>
              <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-emerald-700">{t.publicCatalog.futureOpportunityNote}</p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-600">{t.publicCatalog.requestModal.customerName}</label>
                  <Input className="h-11 rounded-lg" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-600">{t.publicCatalog.requestModal.contact}</label>
                  <Input className="h-11 rounded-lg" value={contact} onChange={(event) => setContact(event.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-600">{t.publicCatalog.requestModal.preferredContactMethod}</label>
                <Select value={preferredContactMethod} onValueChange={(value) => setPreferredContactMethod(value as PublicCatalogContactMethod)}>
                  <SelectTrigger className="h-11 rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">{t.publicCatalog.contactMethods.whatsapp}</SelectItem>
                    <SelectItem value="email">{t.publicCatalog.contactMethods.email}</SelectItem>
                    <SelectItem value="phone">{t.publicCatalog.contactMethods.phone}</SelectItem>
                    <SelectItem value="website">{t.publicCatalog.contactMethods.website}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-600">{t.publicCatalog.requestModal.message}</label>
                <Textarea className="min-h-24 rounded-lg" value={message} onChange={(event) => setMessage(event.target.value)} />
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">
                {t.publicCatalog.requestModal.estimatedTotal}: {formatProductCurrency(estimatedTotal)} · {cartItems.length} {t.publicCatalog.requestModal.items}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="rounded-b-lg bg-[#FF6B5E] px-6 py-4">
          <Button variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10" onClick={() => handleOpenChange(false)}>
            {t.common.close ?? t.common.cancel}
          </Button>
          {!success ? (
            <Button className="bg-white text-[#B63B32] hover:bg-white/90" onClick={handleSubmit}>
              {t.publicCatalog.sendRequest}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
