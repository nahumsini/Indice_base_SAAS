import { useState, useEffect, useMemo, useRef } from 'react';
import { DollarSign, CreditCard, Smartphone, Calculator, WalletCards } from 'lucide-react';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalPrimaryActionClassName,
  posModalSecondaryActionClassName,
} from './PosModalFrame';
import {
  evaluateCreditPurchase,
  findCreditRuleForCustomer,
  type CreditRule,
} from '../../shared/commercial/credit';
import type { Customer } from '../../shared/commercial/customers';
import type { CreditPaymentDetails, PaymentMethod } from '../types/sale.types';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentMethod: PaymentMethod | null;
  remainingAmount: number;
  currency: string;
  creditRules: CreditRule[];
  creditCustomers: Customer[];
  onConfirm: (
    amount: number,
    reference?: string,
    cashReceived?: number,
    creditDetails?: CreditPaymentDetails,
  ) => void;
}

export function AddPaymentModal({
  isOpen,
  onClose,
  paymentMethod,
  remainingAmount,
  currency,
  creditRules,
  creditCustomers,
  onConfirm
}: AddPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [change, setChange] = useState(0);
  const [showReferenceField, setShowReferenceField] = useState(false);
  const [error, setError] = useState('');

  const amountInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
    }).format(value);
  };

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount(remainingAmount.toFixed(2));
      setReference('');
      setCashReceived('');
      setSelectedCustomerId('');
      setChange(0);
      setError('');
      setTimeout(() => amountInputRef.current?.focus(), 100);
    }
  }, [isOpen, remainingAmount]);

  // Calculate change for cash payments
  useEffect(() => {
    if (paymentMethod === 'cash') {
      const received = parseFloat(cashReceived) || 0;
      const amountValue = parseFloat(amount) || 0;
      const calculatedChange = received - amountValue;
      setChange(calculatedChange > 0 ? calculatedChange : 0);
    }
  }, [cashReceived, amount, paymentMethod]);

  const handleQuickAmount = (value: number) => {
    setAmount(value.toFixed(2));
  };

  const handleQuickCash = (value: number) => {
    setCashReceived(value.toFixed(2));
  };

  const amountValue = parseFloat(amount) || 0;
  const selectedCustomer = useMemo(
    () => creditCustomers.find((customer) => customer.id === selectedCustomerId),
    [creditCustomers, selectedCustomerId],
  );
  const creditRule = useMemo(() => findCreditRuleForCustomer(creditRules, {
    customerId: selectedCustomer?.id,
    customerGroup: selectedCustomer?.customerType === 'business' ? 'Business' : 'Frequent retail',
    customerType: selectedCustomer?.customerType,
  }), [creditRules, selectedCustomer]);
  const creditEvaluation = useMemo(() => {
    if (!creditRule || paymentMethod !== 'credit') {
      return null;
    }

    return evaluateCreditPurchase(creditRule, {
      ticketAmount: amountValue || remainingAmount,
      currentBalance: selectedCustomer?.currentBalance ?? 0,
      customerId: selectedCustomer?.id,
      customerGroup: creditRule.customerGroup,
      customerType: selectedCustomer?.customerType,
      openInvoices: selectedCustomer?.currentBalance ? 1 : 0,
      overdueBalance: 0,
    });
  }, [amountValue, creditRule, paymentMethod, remainingAmount, selectedCustomer]);

  const formatDate = (date: Date) => new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);

  const handleConfirm = () => {
    if (!amountValue || amountValue <= 0) {
      setError('Ingresa un monto valido.');
      return;
    }

    if (amountValue > remainingAmount) {
      setError(`El monto ${formatCurrency(amountValue)} es mayor al restante ${formatCurrency(remainingAmount)}.`);
      return;
    }

    if (paymentMethod === 'cash') {
      const received = parseFloat(cashReceived);
      if (!received || received < amountValue) {
        setError('El efectivo recibido debe ser mayor o igual al monto del pago.');
        return;
      }
      onConfirm(amountValue, reference || undefined, received);
    } else if (paymentMethod === 'credit') {
      if (!selectedCustomer) {
        setError('Selecciona el cliente que recibira la venta a credito.');
        return;
      }

      if (!creditRule || !creditEvaluation) {
        setError('No hay una politica de credito disponible para este cliente.');
        return;
      }

      if (creditEvaluation.decision === 'blocked') {
        setError(creditEvaluation.messages[0] ?? 'La politica de credito bloquea esta venta.');
        return;
      }

      const creditReference = reference || `Credito ${creditRule.id} - vence ${creditEvaluation.dueDate.toISOString().slice(0, 10)}`;
      onConfirm(amountValue, creditReference, undefined, {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        ruleId: creditRule.id,
        ruleName: creditRule.name ?? creditRule.id,
        decision: creditEvaluation.decision,
        termDays: creditEvaluation.daysToPay,
        dueDate: creditEvaluation.dueDate.toISOString().slice(0, 10),
        availableCredit: creditEvaluation.availableCredit,
        projectedBalance: creditEvaluation.projectedBalance,
        utilizationPercent: creditEvaluation.utilizationPercent,
      });
    } else {
      onConfirm(amountValue, reference || undefined);
    }

    onClose();
  };

  if (!isOpen || !paymentMethod) return null;

  const getPaymentConfig = () => {
    switch (paymentMethod) {
      case 'cash':
        return {
          title: 'Agregar Pago en Efectivo',
          icon: <DollarSign className="h-6 w-6" />,
        };
      case 'card':
        return {
          title: 'Agregar Pago con Tarjeta',
          icon: <CreditCard className="h-6 w-6" />,
        };
      case 'transfer':
        return {
          title: 'Agregar Pago por Transferencia',
          icon: <Smartphone className="h-6 w-6" />,
        };
      case 'credit':
        return {
          title: 'Agregar Venta a Credito',
          icon: <WalletCards className="h-6 w-6" />,
        };
    }
  };

  const config = getPaymentConfig();

  return (
    <PosModalFrame
      modalType="standard-form"
      closeLabel="Cerrar pago"
      eyebrow="Cobro POS"
      icon={config.icon}
      onClose={onClose}
      size="md"
      title={config.title}
      subtitle={`Restante ${formatCurrency(remainingAmount)}`}
      tone="coral"
      footerClassName={posModalModuleFooterClassName}
      footerLeading={(
        <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
          Cancelar
        </button>
      )}
      footerSummary={`Monto ${formatCurrency(amountValue || 0)} · Restante ${formatCurrency(Math.max(remainingAmount - (amountValue || 0), 0))}`}
      footer={(
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!amount || parseFloat(amount) <= 0}
          className={posModalPrimaryActionClassName}
        >
          {paymentMethod === 'credit' ? 'Agregar crédito' : 'Agregar pago'}
        </button>
      )}
    >
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Remaining Amount Display */}
          <div className="rounded-lg border border-[#F4C84A]/35 bg-[#F4C84A]/10 p-4 dark:border-[#F4C84A]/25 dark:bg-[#F4C84A]/10">
            <p className="mb-1 text-sm font-black text-[#7A5B00] dark:text-[#F8E08A]">Falta por pagar</p>
            <p className="text-3xl font-black text-gray-950 dark:text-white">
              {formatCurrency(remainingAmount)}
            </p>
          </div>

          {/* Amount Input */}
          <div>
            <label className="mb-2 block text-sm font-black text-gray-700 dark:text-gray-300">
              Monto a pagar con {paymentMethod === 'cash' ? 'efectivo' : paymentMethod === 'card' ? 'tarjeta' : paymentMethod === 'transfer' ? 'transferencia' : 'credito'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl">$</span>
              <input
                ref={amountInputRef}
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="min-h-14 w-full rounded-lg border-2 border-gray-300 bg-white py-3 pl-10 pr-4 text-xl font-black text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <p className="mb-2 text-sm font-black text-gray-700 dark:text-gray-300">Montos rapidos</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                onClick={() => handleQuickAmount(remainingAmount)}
                className="min-h-12 rounded-lg border-2 border-orange-500 bg-orange-50 px-3 py-2 text-sm font-black text-orange-700 transition hover:bg-orange-100 active:scale-[0.98] dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/30"
              >
                Restante
              </button>
              <button
                onClick={() => handleQuickAmount(100)}
                className="min-h-12 rounded-lg bg-gray-100 px-3 py-2 text-sm font-black text-gray-900 transition hover:bg-gray-200 active:scale-[0.98] dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              >
                $100
              </button>
              <button
                onClick={() => handleQuickAmount(200)}
                className="min-h-12 rounded-lg bg-gray-100 px-3 py-2 text-sm font-black text-gray-900 transition hover:bg-gray-200 active:scale-[0.98] dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              >
                $200
              </button>
              <button
                onClick={() => handleQuickAmount(500)}
                className="min-h-12 rounded-lg bg-gray-100 px-3 py-2 text-sm font-black text-gray-900 transition hover:bg-gray-200 active:scale-[0.98] dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              >
                $500
              </button>
              <button
                onClick={() => handleQuickAmount(1000)}
                className="min-h-12 rounded-lg bg-gray-100 px-3 py-2 text-sm font-black text-gray-900 transition hover:bg-gray-200 active:scale-[0.98] dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
              >
                $1,000
              </button>
            </div>
          </div>

          {/* Cash Received (Only for cash) */}
          {paymentMethod === 'cash' && (
            <>
              <div>
                <label className="mb-2 block text-sm font-black text-gray-700 dark:text-gray-300">
                  Con cuanto paga el cliente
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="0.00"
                    className="min-h-14 w-full rounded-lg border-2 border-gray-300 bg-white py-3 pl-10 pr-4 text-xl font-black text-gray-900 focus:border-transparent focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div>
                <p className="mb-2 text-sm font-black text-gray-700 dark:text-gray-300">Efectivo recibido</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <button
                    onClick={() => handleQuickCash(parseFloat(amount) || 0)}
                    className="min-h-12 rounded-lg border-2 border-green-500 bg-green-50 px-3 py-2 text-sm font-black text-green-700 transition hover:bg-green-100 active:scale-[0.98] dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
                  >
                    Exacto
                  </button>
                  <button
                    onClick={() => handleQuickCash(100)}
                    className="min-h-12 rounded-lg bg-gray-100 px-3 py-2 text-sm font-black text-gray-900 transition hover:bg-gray-200 active:scale-[0.98] dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                  >
                    $100
                  </button>
                  <button
                    onClick={() => handleQuickCash(200)}
                    className="min-h-12 rounded-lg bg-gray-100 px-3 py-2 text-sm font-black text-gray-900 transition hover:bg-gray-200 active:scale-[0.98] dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                  >
                    $200
                  </button>
                  <button
                    onClick={() => handleQuickCash(500)}
                    className="min-h-12 rounded-lg bg-gray-100 px-3 py-2 text-sm font-black text-gray-900 transition hover:bg-gray-200 active:scale-[0.98] dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                  >
                    $500
                  </button>
                  <button
                    onClick={() => handleQuickCash(1000)}
                    className="min-h-12 rounded-lg bg-gray-100 px-3 py-2 text-sm font-black text-gray-900 transition hover:bg-gray-200 active:scale-[0.98] dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                  >
                    $1,000
                  </button>
                </div>
              </div>

              {/* Change Display */}
              {parseFloat(cashReceived) > 0 && (
                <div className={`rounded-lg p-4 ${
                  change > 0
                    ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500'
                    : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500'
                }`}>
                  <div className="mb-2 flex items-center gap-2">
                    <Calculator className={`w-5 h-5 ${
                      change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`} />
                    <p className={`text-sm font-black ${
                      change > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                    }`}>
                      {change > 0 ? 'Cambio a devolver' : 'Monto insuficiente'}
                    </p>
                  </div>
                  <p className={`text-3xl font-black ${
                    change > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                  }`}>
                    {formatCurrency(change > 0 ? change : (parseFloat(amount) || 0) - (parseFloat(cashReceived) || 0))}
                  </p>
                </div>
              )}
            </>
          )}

          {paymentMethod === 'credit' && (
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
              <div>
                <label className="mb-2 block text-sm font-black text-amber-900 dark:text-amber-100">
                  Cliente con linea de credito
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(event) => setSelectedCustomerId(event.target.value)}
                  className="min-h-14 w-full rounded-lg border-2 border-amber-200 bg-white px-4 py-3 text-base font-black text-gray-900 focus:ring-2 focus:ring-amber-500 dark:border-amber-500/30 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">Selecciona cliente</option>
                  {creditCustomers
                    .filter((customer) => customer.status === 'active')
                    .map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                </select>
              </div>

              {creditRule && creditEvaluation && selectedCustomer && (
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <CreditStat label="Politica" value={creditRule.name ?? creditRule.id} />
                  <CreditStat label="Decision" value={creditEvaluation.decision === 'approved' ? 'Aprobado' : 'Requiere revision'} />
                  <CreditStat label="Plazo" value={`${creditEvaluation.daysToPay} dias`} />
                  <CreditStat label="Vencimiento" value={formatDate(creditEvaluation.dueDate)} />
                  <CreditStat label="Disponible" value={formatCurrency(creditEvaluation.availableCredit)} />
                  <CreditStat label="Uso proyectado" value={`${creditEvaluation.utilizationPercent}%`} />
                </div>
              )}

              {creditEvaluation && (
                <div className={`rounded-lg px-4 py-3 text-xs font-bold ${
                  creditEvaluation.decision === 'blocked'
                    ? 'border border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
                    : creditEvaluation.decision === 'review'
                    ? 'border border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-100'
                    : 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100'
                }`}>
                  {creditEvaluation.messages[0]}
                </div>
              )}
            </div>
          )}

          {/* Reference (for card, transfer and credit) - Optional */}
          {(paymentMethod === 'card' || paymentMethod === 'transfer' || paymentMethod === 'credit') && (
            <div>
              {!showReferenceField ? (
                <button
                  onClick={() => setShowReferenceField(true)}
                  className="min-h-12 w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-2 text-sm font-black text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 active:scale-[0.98] dark:border-gray-600 dark:text-gray-400 dark:hover:text-white"
                >
                  + Agregar referencia (opcional)
                </button>
              ) : (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-black text-gray-700 dark:text-gray-300">
                      {paymentMethod === 'card' ? 'Ultimos 4 digitos / Autorizacion' : paymentMethod === 'credit' ? 'Referencia de autorizacion' : 'Numero de referencia'}
                    </label>
                    <button
                      onClick={() => {
                        setShowReferenceField(false);
                        setReference('');
                      }}
                      className="min-h-10 rounded-lg px-3 text-xs font-black text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                    >
                      Quitar
                    </button>
                  </div>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={paymentMethod === 'card' ? '1234 / AUTH123' : paymentMethod === 'credit' ? 'AUT-CRED-001' : 'REF123456'}
                    className="min-h-14 w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-base font-bold text-gray-900 focus:border-transparent focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          )}
        </div>
    </PosModalFrame>
  );
}

function CreditStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3 dark:bg-gray-900/60">
      <p className="text-[11px] font-black uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-black text-gray-950 dark:text-white">{value}</p>
    </div>
  );
}
