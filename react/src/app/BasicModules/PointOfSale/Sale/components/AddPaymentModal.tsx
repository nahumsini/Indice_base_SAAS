import { useState, useEffect, useMemo, useRef } from 'react';
import { X, DollarSign, CreditCard, Smartphone, Calculator, WalletCards } from 'lucide-react';
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

      const creditReference = reference || `Credito ${creditRule.id} · vence ${creditEvaluation.dueDate.toISOString().slice(0, 10)}`;
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
          headerClass: 'bg-emerald-600',
          confirmClass: 'bg-emerald-600 hover:bg-emerald-700',
        };
      case 'card':
        return {
          title: 'Agregar Pago con Tarjeta',
          icon: <CreditCard className="h-6 w-6" />,
          headerClass: 'bg-blue-600',
          confirmClass: 'bg-blue-600 hover:bg-blue-700',
        };
      case 'transfer':
        return {
          title: 'Agregar Pago por Transferencia',
          icon: <Smartphone className="h-6 w-6" />,
          headerClass: 'bg-purple-600',
          confirmClass: 'bg-purple-600 hover:bg-purple-700',
        };
      case 'credit':
        return {
          title: 'Agregar Venta a Credito',
          icon: <WalletCards className="h-6 w-6" />,
          headerClass: 'bg-amber-600',
          confirmClass: 'bg-amber-600 hover:bg-amber-700',
        };
    }
  };

  const config = getPaymentConfig();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-800">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 ${config.headerClass}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-white">
              {config.icon}
            </div>
            <h2 className="text-xl font-bold text-white">{config.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Cerrar pago"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Remaining Amount Display */}
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Falta por pagar</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(remainingAmount)}
            </p>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                className="w-full pl-10 pr-4 py-3 text-xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Montos rápidos</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickAmount(remainingAmount)}
                className="py-2 px-3 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500 text-orange-700 dark:text-orange-400 font-semibold rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 text-sm"
              >
                Restante
              </button>
              <button
                onClick={() => handleQuickAmount(100)}
                className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              >
                $100
              </button>
              <button
                onClick={() => handleQuickAmount(200)}
                className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              >
                $200
              </button>
              <button
                onClick={() => handleQuickAmount(500)}
                className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              >
                $500
              </button>
              <button
                onClick={() => handleQuickAmount(1000)}
                className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
              >
                $1,000
              </button>
            </div>
          </div>

          {/* Cash Received (Only for cash) */}
          {paymentMethod === 'cash' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Con cuánto paga el cliente
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 text-xl font-bold border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Efectivo recibido</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleQuickCash(parseFloat(amount) || 0)}
                    className="py-2 px-3 bg-green-50 dark:bg-green-900/20 border-2 border-green-500 text-green-700 dark:text-green-400 font-semibold rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-sm"
                  >
                    Exacto
                  </button>
                  <button
                    onClick={() => handleQuickCash(100)}
                    className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  >
                    $100
                  </button>
                  <button
                    onClick={() => handleQuickCash(200)}
                    className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  >
                    $200
                  </button>
                  <button
                    onClick={() => handleQuickCash(500)}
                    className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  >
                    $500
                  </button>
                  <button
                    onClick={() => handleQuickCash(1000)}
                    className="py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
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
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className={`w-5 h-5 ${
                      change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`} />
                    <p className={`text-sm font-medium ${
                      change > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                    }`}>
                      {change > 0 ? 'Cambio a devolver' : 'Monto insuficiente'}
                    </p>
                  </div>
                  <p className={`text-3xl font-bold ${
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
                <label className="mb-2 block text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Cliente con linea de credito
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(event) => setSelectedCustomerId(event.target.value)}
                  className="w-full rounded-lg border-2 border-amber-200 bg-white px-3 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-amber-500 dark:border-amber-500/30 dark:bg-gray-900 dark:text-white"
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
                <div className={`rounded-lg px-3 py-2 text-xs font-bold ${
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
                  className="w-full py-2 px-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 rounded-lg transition-colors"
                >
                  + Agregar referencia (opcional)
                </button>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {paymentMethod === 'card' ? 'Últimos 4 dígitos / Autorización' : paymentMethod === 'credit' ? 'Referencia de autorizacion' : 'Número de referencia'}
                    </label>
                    <button
                      onClick={() => {
                        setShowReferenceField(false);
                        setReference('');
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Quitar
                    </button>
                  </div>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={paymentMethod === 'card' ? '1234 / AUTH123' : paymentMethod === 'credit' ? 'AUT-CRED-001' : 'REF123456'}
                    className="w-full px-4 py-3 text-base border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!amount || parseFloat(amount) <= 0}
            className={`flex-1 rounded-lg px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${config.confirmClass}`}
          >
            {paymentMethod === 'credit' ? 'Agregar Credito' : 'Agregar Pago'}
          </button>
        </div>
      </div>
    </div>
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
