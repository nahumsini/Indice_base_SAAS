import { useEffect, useState } from 'react';
import { CreditCard, Download, FileText, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useLanguage } from '../../../shared/context';

interface SavedCard {
  id: string;
  type: string;
  lastFourDigits: string;
  cardholderName: string;
  expirationDate: string;
  isDefault: boolean;
}

interface CardFormState {
  type: string;
  cardNumber: string;
  cvv: string;
  expirationDate: string;
  cardholderName: string;
}

type InvoiceStatus = 'paid' | 'pending';

interface InvoiceRow {
  id: string;
  date: string;
  amount: string;
  status: InvoiceStatus;
}

type CountryCode =
  | ''
  | 'es-MX'
  | 'es-CO'
  | 'pt-BR'
  | 'en-US'
  | 'en-CA'
  | 'fr-CA'
  | 'ko-CA'
  | 'zh-CA'
  | 'no-invoice';

const inputClassName =
  'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100';

const emptyCardForm: CardFormState = {
  type: '',
  cardNumber: '',
  cvv: '',
  expirationDate: '',
  cardholderName: '',
};

const initialSavedCards: SavedCard[] = [
  {
    id: '1',
    type: 'Visa',
    lastFourDigits: '4242',
    cardholderName: 'Juan Perez',
    expirationDate: '12/25',
    isDefault: true,
  },
  {
    id: '2',
    type: 'Mastercard',
    lastFourDigits: '8888',
    cardholderName: 'Juan Perez',
    expirationDate: '06/26',
    isDefault: false,
  },
];

const invoiceRows: InvoiceRow[] = [
  { id: '2026-03', date: '2026-03-01', amount: '$199.00 USD', status: 'paid' },
  { id: '2026-02', date: '2026-02-01', amount: '$199.00 USD', status: 'paid' },
  { id: '2026-01', date: '2026-01-01', amount: '$199.00 USD', status: 'paid' },
  { id: '2025-12', date: '2025-12-01', amount: '$199.00 USD', status: 'pending' },
  { id: '2025-11', date: '2025-11-01', amount: '$199.00 USD', status: 'paid' },
];

export default function Billing() {
  const { currentLanguage, t } = useLanguage();
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('');
  const [showAddCard, setShowAddCard] = useState(false);
  const [savedCards, setSavedCards] = useState<SavedCard[]>(initialSavedCards);
  const [cardForm, setCardForm] = useState<CardFormState>(emptyCardForm);
  const [automaticRenewal, setAutomaticRenewal] = useState(true);
  const [billingFrequency, setBillingFrequency] = useState('monthly');
  const [billingDay, setBillingDay] = useState('1');
  const [invoiceEmail, setInvoiceEmail] = useState('factura@empresa.com');

  useEffect(() => {
    if (selectedCountry) {
      return;
    }

    const supportedLocales = new Set<CountryCode>([
      'es-MX',
      'es-CO',
      'pt-BR',
      'en-US',
      'en-CA',
      'fr-CA',
      'ko-CA',
      'zh-CA',
    ]);

    if (supportedLocales.has(currentLanguage.code as CountryCode)) {
      setSelectedCountry(currentLanguage.code as CountryCode);
    }
  }, [currentLanguage.code, selectedCountry]);

  const getNoInvoiceLabel = () => {
    switch (currentLanguage.code) {
      case 'en-US':
      case 'en-CA':
        return 'No invoice';
      case 'fr-CA':
        return 'Sans facture';
      case 'pt-BR':
        return 'Sem nota fiscal';
      case 'ko-CA':
        return '청구서 없음';
      case 'zh-CA':
        return '不开发票';
      default:
        return 'No factura';
    }
  };

  const getSubscriptionConcept = () => {
    switch (currentLanguage.code) {
      case 'en-US':
      case 'en-CA':
        return 'Premium Plan - Monthly';
      case 'fr-CA':
        return 'Plan Premium - Mensuel';
      case 'pt-BR':
        return 'Plano Premium - Mensal';
      case 'ko-CA':
        return '프리미엄 플랜 - 월간';
      case 'zh-CA':
        return '高级计划 - 月付';
      default:
        return 'Plan Premium - Mensual';
    }
  };

  const formatInvoiceDate = (date: string) =>
    new Intl.DateTimeFormat(currentLanguage.code, {
      year: 'numeric',
      month: 'long',
    }).format(new Date(date));

  const setDefaultCard = (cardId: string) => {
    setSavedCards((prevCards) =>
      prevCards.map((card) => ({
        ...card,
        isDefault: card.id === cardId,
      })),
    );
  };

  const deleteCard = (cardId: string) => {
    setSavedCards((prevCards) => {
      const remainingCards = prevCards.filter((card) => card.id !== cardId);

      if (remainingCards.length > 0 && !remainingCards.some((card) => card.isDefault)) {
        return remainingCards.map((card, index) =>
          index === 0 ? { ...card, isDefault: true } : card,
        );
      }

      return remainingCards;
    });
  };

  const updateCardForm = (field: keyof CardFormState, value: string) => {
    setCardForm((prevForm) => ({
      ...prevForm,
      [field]: value,
    }));
  };

  const handleSaveCard = () => {
    const normalizedCardNumber = cardForm.cardNumber.replace(/\D/g, '');
    if (
      !cardForm.type ||
      normalizedCardNumber.length < 4 ||
      !cardForm.expirationDate ||
      !cardForm.cardholderName.trim()
    ) {
      return;
    }

    const newCard: SavedCard = {
      id: String(Date.now()),
      type: cardForm.type,
      lastFourDigits: normalizedCardNumber.slice(-4),
      cardholderName: cardForm.cardholderName.trim(),
      expirationDate: cardForm.expirationDate,
      isDefault: savedCards.length === 0,
    };

    setSavedCards((prevCards) => [...prevCards, newCard]);
    setCardForm(emptyCardForm);
    setShowAddCard(false);
  };

  const renderCountrySpecificFields = () => {
    if (selectedCountry === '' || selectedCountry === 'no-invoice') {
      return null;
    }

    if (selectedCountry === 'es-MX') {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.panelInicial.billing.fiscalData.rfc}
              </label>
              <input type="text" className={inputClassName} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.panelInicial.billing.fiscalData.razonSocial}
              </label>
              <input type="text" className={inputClassName} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.panelInicial.billing.fiscalData.regimenFiscal}
              </label>
              <input type="text" className={inputClassName} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.panelInicial.billing.fiscalData.usoCFDI}
              </label>
              <input type="text" className={inputClassName} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.panelInicial.billing.fiscalData.codigoPostalFiscal}
            </label>
            <input type="text" className={inputClassName} />
          </div>
        </>
      );
    }

    if (selectedCountry === 'es-CO') {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.panelInicial.billing.fiscalData.nit}
              </label>
              <input type="text" className={inputClassName} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.panelInicial.billing.fiscalData.razonSocial}
              </label>
              <input type="text" className={inputClassName} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.panelInicial.billing.fiscalData.responsabilidadFiscal}
            </label>
            <input type="text" className={inputClassName} />
          </div>
        </>
      );
    }

    if (selectedCountry === 'pt-BR') {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.panelInicial.billing.fiscalData.cnpjCpf}
              </label>
              <input type="text" className={inputClassName} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.panelInicial.billing.fiscalData.razaoSocial}
              </label>
              <input type="text" className={inputClassName} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.panelInicial.billing.fiscalData.inscricaoEstadual}
            </label>
            <input type="text" className={inputClassName} />
          </div>
        </>
      );
    }

    if (selectedCountry === 'en-US') {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.panelInicial.billing.fiscalData.ein}
              </label>
              <input type="text" className={inputClassName} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.panelInicial.billing.fiscalData.legalName}
              </label>
              <input type="text" className={inputClassName} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.panelInicial.billing.fiscalData.state}
            </label>
            <input type="text" className={inputClassName} />
          </div>
        </>
      );
    }

    if (selectedCountry === 'en-CA') {
      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.panelInicial.billing.fiscalData.businessNumber}
              </label>
              <input type="text" className={inputClassName} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.panelInicial.billing.fiscalData.legalName}
              </label>
              <input type="text" className={inputClassName} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.panelInicial.billing.fiscalData.province}
            </label>
            <input type="text" className={inputClassName} />
          </div>
        </>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.panelInicial.billing.fiscalData.taxId}
            </label>
            <input type="text" className={inputClassName} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.panelInicial.billing.fiscalData.companyName}
            </label>
            <input type="text" className={inputClassName} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t.panelInicial.billing.fiscalData.postalCode}
          </label>
          <input type="text" className={inputClassName} />
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 p-4 dark:border-purple-700/30 sm:p-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <span className="text-2xl">🧾</span>
          {t.panelInicial.billing.title}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t.panelInicial.billing.subtitle}</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex items-start gap-2 mb-4">
            <div className="w-6 h-6 rounded bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
              📋
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {t.panelInicial.billing.fiscalData.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t.panelInicial.billing.fiscalData.subtitle}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t.panelInicial.billing.fiscalData.country}
              </label>
              <select
                className={inputClassName}
                value={selectedCountry}
                onChange={(event) => setSelectedCountry(event.target.value as CountryCode)}
              >
                <option value="">{t.panelInicial.billing.fiscalData.selectCountry}</option>
                <option value="es-MX">🇲🇽 Mexico</option>
                <option value="es-CO">🇨🇴 Colombia</option>
                <option value="en-US">🇺🇸 USA</option>
                <option value="en-CA">🇨🇦 Canada (EN)</option>
                <option value="fr-CA">🇨🇦 Canada (FR)</option>
                <option value="pt-BR">🇧🇷 Brasil</option>
                <option value="ko-CA">🇨🇦 Canada (KO)</option>
                <option value="zh-CA">🇨🇦 Canada (ZH)</option>
                <option value="no-invoice">{getNoInvoiceLabel()}</option>
              </select>
            </div>

            {renderCountrySpecificFields()}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {t.panelInicial.billing.paymentMethod.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t.panelInicial.billing.paymentMethod.subtitle}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddCard((prevValue) => !prevValue)}
              className="w-full gap-2 sm:w-auto"
            >
              {showAddCard
                ? `✕ ${t.panelInicial.billing.paymentMethod.cancel}`
                : `+ ${t.panelInicial.billing.paymentMethod.addCard}`}
            </Button>
          </div>

          {!showAddCard && savedCards.length > 0 && (
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.panelInicial.billing.paymentMethod.savedCards}
              </label>

              {savedCards.map((card) => (
                <div
                  key={card.id}
                  className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
                    card.isDefault
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => setDefaultCard(card.id)}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {card.type} •••• {card.lastFourDigits}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {card.cardholderName} • Exp: {card.expirationDate}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {card.isDefault && (
                        <span className="px-3 py-1 text-xs font-medium bg-purple-600 text-white rounded-full">
                          {t.panelInicial.billing.paymentMethod.defaultCard}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteCard(card.id);
                        }}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showAddCard && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.panelInicial.billing.paymentMethod.type}
                </label>
                <select
                  className={inputClassName}
                  value={cardForm.type}
                  onChange={(event) => updateCardForm('type', event.target.value)}
                >
                  <option value="">{t.panelInicial.billing.paymentMethod.selectMethod}</option>
                  <option value="Visa">💳 Visa</option>
                  <option value="Mastercard">💳 Mastercard</option>
                  <option value="American Express">💳 American Express</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.panelInicial.billing.paymentMethod.cardNumber}
                </label>
                <input
                  type="text"
                  placeholder={t.panelInicial.billing.paymentMethod.placeholder.cardNumber}
                  className={inputClassName}
                  value={cardForm.cardNumber}
                  onChange={(event) => updateCardForm('cardNumber', event.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.panelInicial.billing.paymentMethod.cvv}
                  </label>
                  <input
                    type="text"
                    placeholder={t.panelInicial.billing.paymentMethod.placeholder.cvv}
                    className={inputClassName}
                    maxLength={4}
                    value={cardForm.cvv}
                    onChange={(event) => updateCardForm('cvv', event.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.panelInicial.billing.paymentMethod.expirationDate}
                  </label>
                  <input
                    type="text"
                    placeholder={t.panelInicial.billing.paymentMethod.placeholder.expirationDate}
                    className={inputClassName}
                    value={cardForm.expirationDate}
                    onChange={(event) => updateCardForm('expirationDate', event.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.panelInicial.billing.paymentMethod.cardholderName}
                </label>
                <input
                  type="text"
                  placeholder={t.panelInicial.billing.paymentMethod.placeholder.cardholderName}
                  className={inputClassName}
                  value={cardForm.cardholderName}
                  onChange={(event) => updateCardForm('cardholderName', event.target.value)}
                />
              </div>

              <Button
                onClick={handleSaveCard}
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={
                  !cardForm.type ||
                  !cardForm.cardNumber.trim() ||
                  !cardForm.expirationDate.trim() ||
                  !cardForm.cardholderName.trim()
                }
              >
                {t.panelInicial.billing.paymentMethod.saveCard}
              </Button>
            </div>
          )}

          {!showAddCard && (
            <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <span className="flex items-center gap-2">
                    ⚙️ {t.panelInicial.billing.automaticBilling.title}
                  </span>
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {t.panelInicial.billing.automaticBilling.subtitle}
                </p>
              </div>

              <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {t.panelInicial.billing.automaticBilling.enable}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t.panelInicial.billing.automaticBilling.description}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={automaticRenewal}
                  onChange={(event) => setAutomaticRenewal(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.panelInicial.billing.billingFrequency.title}
                  </label>
                  <select
                    className={inputClassName}
                    value={billingFrequency}
                    onChange={(event) => setBillingFrequency(event.target.value)}
                  >
                    <option value="monthly">{t.panelInicial.billing.billingFrequency.monthly}</option>
                    <option value="quarterly">{t.panelInicial.billing.billingFrequency.quarterly}</option>
                    <option value="semiannual">{t.panelInicial.billing.billingFrequency.semiannual}</option>
                    <option value="annual">{t.panelInicial.billing.billingFrequency.annual}</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t.panelInicial.billing.billingFrequency.note}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.panelInicial.billing.automaticBilling.billingDay}
                  </label>
                  <select
                    className={inputClassName}
                    value={billingDay}
                    onChange={(event) => setBillingDay(event.target.value)}
                  >
                    <option value="1">{t.panelInicial.billing.automaticBilling.selectDay}</option>
                    {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
                      <option key={day} value={String(day)}>
                        {currentLanguage.code.startsWith('en')
                          ? `Day ${day} of each month`
                          : currentLanguage.code === 'pt-BR'
                            ? `Dia ${day} de cada mes`
                            : currentLanguage.code === 'fr-CA'
                              ? `Jour ${day} de chaque mois`
                              : currentLanguage.code === 'ko-CA'
                                ? `매월 ${day}일`
                                : currentLanguage.code === 'zh-CA'
                                  ? `每月 ${day} 日`
                                  : `Día ${day} de cada mes`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.panelInicial.billing.automaticBilling.emailForInvoices}
                </label>
                <input
                  type="email"
                  className={inputClassName}
                  value={invoiceEmail}
                  onChange={(event) => setInvoiceEmail(event.target.value)}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t.panelInicial.billing.automaticBilling.reminderNote}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex items-start gap-2 mb-4">
            <div className="w-6 h-6 rounded bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {t.panelInicial.billing.invoices.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t.panelInicial.billing.invoices.subtitle}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                    {t.panelInicial.billing.invoices.date}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                    {t.panelInicial.billing.invoices.concept}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                    {t.panelInicial.billing.invoices.amount}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                    {t.panelInicial.billing.invoices.status}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
                    {t.panelInicial.billing.invoices.downloadPdf}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {invoiceRows.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      {formatInvoiceDate(invoice.date)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {getSubscriptionConcept()}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                      {invoice.amount}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          invoice.status === 'paid'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        }`}
                      >
                        {invoice.status === 'paid'
                          ? t.panelInicial.billing.invoices.paid
                          : t.panelInicial.billing.invoices.pending}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
