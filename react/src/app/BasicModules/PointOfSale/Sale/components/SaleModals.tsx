import { AddPaymentModal } from './AddPaymentModal';
import { CashMovementModal } from './CashMovementModal';
import { CloseShiftModal } from './CloseShiftModal';
import { DiscountModal } from './DiscountModal';
import { ReturnModal } from './ReturnModal';
import { TicketModal } from './TicketModal';
import type { CashClosingInput } from '../../shared/cashClosing.types';
import type { Customer } from '../../shared/commercial/customers';
import type { CreditRule } from '../../shared/commercial/credit';
import type { DiscountRule } from '../../shared/commercial/discounts';
import type { CreditPaymentDetails, Payment, PaymentMethod, SaleItem } from '../types/sale.types';
import type { Shift } from '../types/shift.types';
import type { PosCashMovementType, PosShiftClosingSummaryResponse } from '../services/posBackendApi';
import type { SaleTotals } from '../utils/saleCalculations';

interface SaleModalsProps {
  showAddPaymentModal: boolean;
  selectedPaymentMethod: PaymentMethod | null;
  remainingAmount: number;
  showCloseShiftModal: boolean;
  currentShift: Shift | null;
  isClosingShift?: boolean;
  closingSummary: PosShiftClosingSummaryResponse | null;
  isLoadingClosingSummary?: boolean;
  closingSummaryError?: string;
  showCashMovementModal: boolean;
  isCreatingCashMovement?: boolean;
  selectedItemForDiscount: SaleItem | null;
  showDiscountModal: boolean;
  showGlobalDiscountModal: boolean;
  itemDiscountRules: DiscountRule[];
  globalDiscountRules: DiscountRule[];
  creditRules: CreditRule[];
  creditCustomers: Customer[];
  currency: string;
  cart: SaleItem[];
  totals: SaleTotals;
  lastSale: {
    saleNumber: string;
    items: SaleItem[];
    payments: Payment[];
    totals: SaleTotals;
  } | null;
  showTicketModal: boolean;
  showReturnModal: boolean;
  onCloseAddPayment: () => void;
  onConfirmAddPayment: (
    amount: number,
    reference?: string,
    cashReceived?: number,
    creditDetails?: CreditPaymentDetails,
  ) => void;
  onCloseShiftModal: () => void;
  onConfirmCloseShift: (closing: CashClosingInput) => void;
  onCloseCashMovementModal: () => void;
  onConfirmCashMovement: (type: PosCashMovementType, amount: number, reason: string, reference?: string) => void | Promise<void>;
  onCloseItemDiscount: () => void;
  onConfirmItemDiscount: (discount: number, type: SaleItem['discountType']) => void;
  onCloseGlobalDiscount: () => void;
  onConfirmGlobalDiscount: (discount: number, type: SaleItem['discountType']) => void;
  onCloseTicket: () => void;
  onCloseReturn: () => void;
  onConfirmReturn: (saleId: string, type: 'full' | 'partial') => void;
}

export function SaleModals({
  showAddPaymentModal,
  selectedPaymentMethod,
  remainingAmount,
  showCloseShiftModal,
  currentShift,
  isClosingShift = false,
  closingSummary,
  isLoadingClosingSummary = false,
  closingSummaryError = '',
  showCashMovementModal,
  isCreatingCashMovement = false,
  selectedItemForDiscount,
  showDiscountModal,
  showGlobalDiscountModal,
  itemDiscountRules,
  globalDiscountRules,
  creditRules,
  creditCustomers,
  currency,
  cart,
  totals,
  lastSale,
  showTicketModal,
  showReturnModal,
  onCloseAddPayment,
  onConfirmAddPayment,
  onCloseShiftModal,
  onConfirmCloseShift,
  onCloseCashMovementModal,
  onConfirmCashMovement,
  onCloseItemDiscount,
  onConfirmItemDiscount,
  onCloseGlobalDiscount,
  onConfirmGlobalDiscount,
  onCloseTicket,
  onCloseReturn,
  onConfirmReturn,
}: SaleModalsProps) {
  const totalItemQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <AddPaymentModal
        isOpen={showAddPaymentModal}
        onClose={onCloseAddPayment}
        paymentMethod={selectedPaymentMethod}
        remainingAmount={remainingAmount}
        currency={currency}
        creditRules={creditRules}
        creditCustomers={creditCustomers}
        onConfirm={onConfirmAddPayment}
      />

      <CloseShiftModal
        isOpen={showCloseShiftModal}
        onClose={onCloseShiftModal}
        shift={currentShift}
        summary={closingSummary}
        isLoadingSummary={isLoadingClosingSummary}
        summaryError={closingSummaryError}
        onConfirm={onConfirmCloseShift}
        isSubmitting={isClosingShift}
      />

      <CashMovementModal
        isOpen={showCashMovementModal}
        onClose={onCloseCashMovementModal}
        onConfirm={onConfirmCashMovement}
        isSubmitting={isCreatingCashMovement}
        currency={currentShift?.currencyCode || currency}
      />

      {selectedItemForDiscount && (
        <DiscountModal
          isOpen={showDiscountModal}
          onClose={onCloseItemDiscount}
          itemName={selectedItemForDiscount.name}
          itemPrice={selectedItemForDiscount.price}
          itemQuantity={selectedItemForDiscount.quantity}
          currentDiscount={selectedItemForDiscount.discount}
          currentDiscountType={selectedItemForDiscount.discountType}
          currency={currency}
          eligibleRules={itemDiscountRules}
          onConfirm={onConfirmItemDiscount}
        />
      )}

      <DiscountModal
        isOpen={showGlobalDiscountModal}
        onClose={onCloseGlobalDiscount}
        itemName={`Toda la venta (${cart.length} productos)`}
        itemPrice={totals.subtotal / totalItemQuantity || 0}
        itemQuantity={totalItemQuantity}
        currentDiscount={0}
        currentDiscountType="percentage"
        currency={currency}
        eligibleRules={globalDiscountRules}
        onConfirm={onConfirmGlobalDiscount}
      />

      {lastSale && (
        <TicketModal
          isOpen={showTicketModal}
          onClose={onCloseTicket}
          items={lastSale.items}
          payments={lastSale.payments}
          totals={lastSale.totals}
          shift={currentShift}
          saleNumber={lastSale.saleNumber}
        />
      )}

      <ReturnModal
        isOpen={showReturnModal}
        onClose={onCloseReturn}
        onConfirm={onConfirmReturn}
      />
    </>
  );
}
